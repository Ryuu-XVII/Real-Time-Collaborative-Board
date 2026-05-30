import { useState, useEffect, useRef, useCallback } from 'react';
import { mergeCanvasStates } from '../utils/crdt';

const PING_INTERVAL = 10000; // keep connection hot
const RECONNECT_BASE_DELAY = 1000;
const RECONNECT_MAX_DELAY = 16000;

export function useWebSocket(url) {
  const [status, setStatus] = useState('disconnected');
  const [elements, setElements] = useState(new Map());
  const [activeUsers, setActiveUsers] = useState([]);
  const [myProfile, setMyProfile] = useState(null);

  // keep settings in refs so connect() is stable and doesnt cause infinite loops
  const isSimulatedOfflineRef = useRef(false);
  const simulatedLatencyRef = useRef(0);

  const socketRef = useRef(null);
  const reconnectDelayRef = useRef(RECONNECT_BASE_DELAY);
  const reconnectTimerRef = useRef(null);
  const pingTimerRef = useRef(null);
  const offlineQueueRef = useRef(new Map()); // save changes while wifi is down

  // use sessionStorage instead of localStorage so tabs dont share same id!
  const getClientId = useCallback(() => {
    let id = sessionStorage.getItem('collab_canvas_client_id');
    if (!id) {
      id = 'client_' + Math.random().toString(36).substring(2, 11);
      sessionStorage.setItem('collab_canvas_client_id', id);
    }
    return id;
  }, []);

  const stopPingHeartbeat = useCallback(() => {
    if (pingTimerRef.current) {
      clearInterval(pingTimerRef.current);
      pingTimerRef.current = null;
    }
  }, []);

  const sendRaw = useCallback((payload) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(payload));
    }
  }, []);

  const startPingHeartbeat = useCallback(() => {
    stopPingHeartbeat();
    pingTimerRef.current = setInterval(() => {
      sendRaw({ type: 'ping' });
    }, PING_INTERVAL);
  }, [sendRaw, stopPingHeartbeat]);

  const connect = useCallback(() => {
    setStatus('connecting');
    
    const socket = new WebSocket(url);
    socketRef.current = socket;
    socket.intentionalClose = false; // check for unmount vs network crash

    socket.onopen = () => {
      setStatus('connected');
      reconnectDelayRef.current = RECONNECT_BASE_DELAY;
      
      // join room
      sendRaw({
        type: 'join',
        clientId: getClientId()
      });

      startPingHeartbeat();
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        switch (data.type) {
          case 'init': {
            setMyProfile(data.profile);
            
            // merge offline edits with server elements
            setElements(prevElements => {
              let merged = mergeCanvasStates(prevElements, data.elements);
              
              // flush offline changes to server
              const offlineEdits = Array.from(offlineQueueRef.current.values());
              if (offlineEdits.length > 0) {
                merged = mergeCanvasStates(merged, offlineEdits);
                sendRaw({
                  type: 'state-update',
                  elements: offlineEdits
                });
                offlineQueueRef.current.clear();
              }
              
              return merged;
            });

            setActiveUsers(data.users);
            break;
          }

          case 'user-joined': {
            setActiveUsers(prev => {
              const filtered = prev.filter(u => u.clientId !== data.user.clientId);
              return [...filtered, data.user];
            });
            break;
          }

          case 'user-left': {
            setActiveUsers(prev => prev.filter(u => u.clientId !== data.clientId));
            break;
          }

          case 'cursor-update': {
            setActiveUsers(prev => prev.map(u => {
              if (u.clientId === data.clientId) {
                return { ...u, cursor: data.cursor, currentAction: data.action };
              }
              return u;
            }));
            break;
          }

          case 'state-synced': {
            setElements(prev => mergeCanvasStates(prev, data.elements));
            break;
          }

          case 'pong': {
            break;
          }
        }
      } catch (err) {
        console.error('ws state merge error:', err);
      }
    };

    socket.onclose = () => {
      if (socket.intentionalClose) {
        return; // normal unmount cleanup, ignore it
      }

      setStatus('disconnected');
      setActiveUsers([]);
      stopPingHeartbeat();
      
      // retry in background with exponential delay
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = setTimeout(() => {
        reconnectTimerRef.current = null;
        reconnectDelayRef.current = Math.min(reconnectDelayRef.current * 2, RECONNECT_MAX_DELAY);
        connect();
      }, reconnectDelayRef.current);
    };

    socket.onerror = () => {
      setStatus('disconnected');
    };
  }, [url, getClientId, startPingHeartbeat, stopPingHeartbeat, sendRaw]);

  // sync shape modifications
  const updateElement = useCallback((elementData) => {
    const updated = {
      ...elementData,
      clientId: getClientId(),
      timestamp: Date.now()
    };

    setElements(prev => {
      const next = new Map(prev);
      next.set(updated.id, updated);
      return next;
    });

    if (status === 'connected') {
      sendRaw({
        type: 'state-update',
        elements: [updated]
      });
    } else {
      // queue changes locally if actually disconnected
      offlineQueueRef.current.set(updated.id, updated);
    }
  }, [status, getClientId, sendRaw]);

  // cursor tracking
  const updateCursor = useCallback((cursorPos, action = null) => {
    if (status !== 'connected') return;
    
    sendRaw({
      type: 'cursor-move',
      cursor: cursorPos,
      action
    });
  }, [status, sendRaw]);

  // tombstone delete all
  const clearCanvas = useCallback(() => {
    const now = Date.now();
    const myId = getClientId();
    
    setElements(prev => {
      const next = new Map(prev);
      next.forEach((el, id) => {
        if (!el.deleted) {
          const updated = { ...el, deleted: true, timestamp: now, clientId: myId };
          next.set(id, updated);
          
          if (status !== 'connected') {
            offlineQueueRef.current.set(id, updated);
          }
        }
      });
      return next;
    });

    if (status === 'connected') {
      sendRaw({ type: 'clear-canvas' });
    }
  }, [status, getClientId, sendRaw]);

  useEffect(() => {
    connect();
    return () => {
      stopPingHeartbeat();
      if (socketRef.current) {
        socketRef.current.intentionalClose = true;
        socketRef.current.close();
      }
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };
  }, [connect, stopPingHeartbeat]);

  return {
    status,
    elements,
    activeUsers,
    myProfile,
    updateElement,
    updateCursor,
    clearCanvas
  };
}

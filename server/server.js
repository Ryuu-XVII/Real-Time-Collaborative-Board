import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import cors from 'cors';

const app = express();
app.use(cors());

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// in memory cache of board elements
const canvasElements = new Map();
const activeUsers = new Map();

// generator list for cool user visual profiles
const ADJECTIVES = ['Sleek', 'Dazzling', 'Cosmic', 'Electric', 'Stealthy', 'Vibrant', 'Neon', 'Psychedelic', 'Glitchy', 'Hyper'];
const CREATURES = ['Fox', 'Octopus', 'Panther', 'Panda', 'Koala', 'Falcon', 'Cheetah', 'Chameleon', 'Axolotl', 'Phoenix'];
const COLORS = [
  '#FF5E7E', '#FF9F43', '#FECA57', '#1DD1A1', '#00D2D3', 
  '#54A0FF', '#5F27CD', '#FF6B6B', '#48DBFB', '#10AC84'
];
const AVATARS = ['🦊', '🐙', '🐆', '🐼', '🐨', '🦅', '🐆', '🦎', '🐉', '🔥'];

function getRandomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// push socket data to peers
function broadcast(data, excludeClientId = null) {
  const payload = JSON.stringify(data);
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      if (excludeClientId && client.clientId === excludeClientId) return;
      client.send(payload);
    }
  });
}

// LWW merger. bigger time stamp wins. fallback is client alphabetical compare
function mergeElement(element) {
  const existing = canvasElements.get(element.id);
  
  if (!existing) {
    canvasElements.set(element.id, element);
    return true;
  }

  const existingTime = existing.timestamp || 0;
  const incomingTime = element.timestamp || 0;

  if (incomingTime > existingTime) {
    canvasElements.set(element.id, element);
    return true;
  } else if (incomingTime === existingTime) {
    const existingClient = existing.clientId || '';
    const incomingClient = element.clientId || '';
    if (incomingClient > existingClient) {
      canvasElements.set(element.id, element);
      return true;
    }
  }
  
  return false;
}

wss.on('connection', (ws) => {
  ws.isAlive = true;
  ws.clientId = null;

  ws.on('pong', () => {
    ws.isAlive = true;
  });

  ws.on('message', (messageBuffer) => {
    try {
      const data = JSON.parse(messageBuffer.toString());
      
      switch (data.type) {
        case 'join': {
          const clientId = data.clientId;
          ws.clientId = clientId;
          
          let userProfile = activeUsers.get(clientId);
          if (!userProfile) {
            userProfile = {
              clientId,
              name: `${getRandomElement(ADJECTIVES)} ${getRandomElement(CREATURES)}`,
              color: getRandomElement(COLORS),
              avatar: getRandomElement(AVATARS),
              cursor: null,
              currentAction: null,
              lastActive: Date.now()
            };
            activeUsers.set(clientId, userProfile);
          }

          ws.userProfile = userProfile;

          // send joining client their profile + existing state
          ws.send(JSON.stringify({
            type: 'init',
            profile: userProfile,
            elements: Array.from(canvasElements.values()),
            users: Array.from(activeUsers.values())
          }));

          // notify peers
          broadcast({
            type: 'user-joined',
            user: userProfile
          }, clientId);
          break;
        }

        case 'cursor-move': {
          if (!ws.clientId) return;
          const user = activeUsers.get(ws.clientId);
          if (user) {
            user.cursor = data.cursor;
            user.currentAction = data.action;
            user.lastActive = Date.now();

            broadcast({
              type: 'cursor-update',
              clientId: ws.clientId,
              cursor: data.cursor,
              action: data.action
            }, ws.clientId);
          }
          break;
        }

        case 'state-update': {
          if (!ws.clientId) return;
          const incomingElements = Array.isArray(data.elements) ? data.elements : [data.elements];
          const mergedElements = [];

          incomingElements.forEach(el => {
            if (mergeElement(el)) {
              mergedElements.push(el);
            }
          });

          // broadcast changes to everyone else
          if (mergedElements.length > 0) {
            broadcast({
              type: 'state-synced',
              elements: mergedElements,
              senderId: ws.clientId
            }, ws.clientId);
          }
          break;
        }

        case 'clear-canvas': {
          if (!ws.clientId) return;
          const now = Date.now();
          const tombstoned = [];

          canvasElements.forEach((el, id) => {
            if (!el.deleted) {
              const updated = {
                ...el,
                deleted: true,
                timestamp: now,
                clientId: ws.clientId
              };
              canvasElements.set(id, updated);
              tombstoned.push(updated);
            }
          });

          broadcast({
            type: 'state-synced',
            elements: tombstoned,
            senderId: ws.clientId
          });
          break;
        }

        case 'ping': {
          ws.send(JSON.stringify({ type: 'pong' }));
          break;
        }
      }
    } catch (err) {
      console.error('ws read error:', err.message);
    }
  });

  ws.on('close', () => {
    if (ws.clientId) {
      const user = activeUsers.get(ws.clientId);
      activeUsers.delete(ws.clientId);
      
      broadcast({
        type: 'user-left',
        clientId: ws.clientId,
        name: user ? user.name : 'Unknown User'
      });
    }
  });
});

// heartbeat sweep for dead connections (closed laptop lid, battery dies)
const interval = setInterval(() => {
  wss.clients.forEach(ws => {
    if (ws.isAlive === false) {
      return ws.terminate();
    }
    ws.isAlive = false;
    ws.ping();
  });
}, 15000);

wss.on('close', () => {
  clearInterval(interval);
});

server.listen(PORT, () => {
  console.log(`Backend server ready on port ${PORT}! lets go!`);
});

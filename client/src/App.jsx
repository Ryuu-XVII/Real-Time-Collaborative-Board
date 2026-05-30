import React, { useState } from 'react';
import { useWebSocket } from './hooks/useWebSocket';
import Canvas from './components/Canvas';
import Toolbar from './components/Toolbar';
import Sidebar from './components/Sidebar';
import CursorOverlay from './components/CursorOverlay';

export default function App() {
  const [activeTool, setActiveTool] = useState('select'); // 'select' | 'draw' | 'sticky' | 'rectangle' | 'circle'
  const [currentColor, setCurrentColor] = useState('#6366f1'); // default to deep indigo glow
  const [currentWidth, setCurrentWidth] = useState(6); // medium brush default

  // connects to the backend websocket. standard local testing port, dynamic host so it works over wifi too!
  // using explicit 127.0.0.1 loopback for localhost to bypass tricky windows ipv6 hosts mapping errors!
  const host = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? '127.0.0.1' : window.location.hostname;
  const wsUrl = `ws://${host}:5000`;
  const ws = useWebSocket(wsUrl);

  return (
    <div 
      style={{
        position: 'relative',
        width: '100vw',
        height: '100vh',
        background: 'var(--bg-gradient)',
        overflow: 'hidden'
      }}
    >
      {/* 1. Main visual whiteboard canvas grid */}
      <Canvas
        activeTool={activeTool}
        setActiveTool={setActiveTool}
        elements={ws.elements}
        updateElement={ws.updateElement}
        updateCursor={ws.updateCursor}
        currentColor={currentColor}
        currentWidth={currentWidth}
      />

      {/* 2. Multiplayer mouse pointer drawing layer */}
      <CursorOverlay 
        activeUsers={ws.activeUsers} 
      />

      {/* 3. Floating action toolbar at screen bottom */}
      <Toolbar
        activeTool={activeTool}
        setActiveTool={setActiveTool}
        currentColor={currentColor}
        setCurrentColor={setCurrentColor}
        currentWidth={currentWidth}
        setCurrentWidth={setCurrentWidth}
        clearCanvas={ws.clearCanvas}
      />

      {/* 4. Glassmorphism sidebar on right (Collaborators list) */}
      <Sidebar
        status={ws.status}
        activeUsers={ws.activeUsers}
        myProfile={ws.myProfile}
      />

    </div>
  );
}

import React from 'react';

export default function CursorOverlay({ activeUsers }) {
  // overlay that renders other users cursors moving in real-time. super smooth
  return (
    <div 
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        overflow: 'hidden',
        zIndex: 400
      }}
    >
      {activeUsers.map(user => {
        // if user has no active cursor data or is offline, dont render anything!
        if (!user.cursor) return null;

        const { x, y } = user.cursor;

        return (
          <div
            key={user.clientId}
            className="remote-cursor"
            style={{
              left: `${x}px`,
              top: `${y}px`
            }}
          >
            {/* custom visual pointer colored with the users color */}
            <svg 
              width="24" 
              height="24" 
              viewBox="0 0 24 24" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
              style={{
                filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.4))'
              }}
            >
              <path 
                d="M5.65 12.39L19.26 4.36C20.67 3.53 22.33 4.89 21.84 6.44L17.2 21.22C16.65 22.96 14.28 22.95 13.75 21.21L11.55 14L4.34 11.8C2.6 11.27 2.59 8.9 4.32 8.35L5.65 12.39Z" 
                fill={user.color || '#6366f1'} 
                stroke="white" 
                strokeWidth="2"
                strokeLinejoin="round"
              />
            </svg>

            {/* floating label tag with username and current actions (like "drawing" or "typing") */}
            <div 
              className="remote-cursor-label"
              style={{
                backgroundColor: user.color || '#6366f1',
                border: '1px solid rgba(255,255,255,0.2)'
              }}
            >
              <span>{user.name}</span>
              {user.currentAction && (
                <span style={{ marginLeft: '4px', opacity: 0.8, fontSize: '9px', fontWeight: 'normal' }}>
                  ({user.currentAction})
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

import React from 'react';

export default function Sidebar({
  status,
  activeUsers,
  myProfile
}) {
  // sidebar drawer that sits on the right. handles connection status and online collaborators list
  return (
    <div 
      className="glass-panel" 
      style={{
        position: 'absolute',
        top: '24px',
        right: '24px',
        width: '280px',
        bottom: '24px',
        display: 'flex',
        flexDirection: 'column',
        padding: '20px',
        zIndex: 500,
        gap: '20px',
        overflow: 'hidden'
      }}
    >
      {/* Title / Branding */}
      <div>
        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '700', background: 'linear-gradient(135deg, #a5b4fc 0%, #f472b6 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          CollabCanvas Studio
        </h2>
        <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#64748b' }}>
          Real-time Collaborative Space
        </p>
      </div>

      {/* Connection Indicator Tag */}
      <div 
        style={{
          display: 'flex', 
          alignItems: 'center', 
          gap: '10px',
          padding: '10px 14px',
          backgroundColor: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.04)',
          borderRadius: '10px'
        }}
      >
        <div 
          className={`
            ${status === 'connected' ? 'pulse-connected' : ''} 
            ${status === 'connecting' ? 'pulse-connecting' : ''} 
            ${status === 'disconnected' ? 'pulse-disconnected' : ''}
          `}
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%'
          }}
        />
        <span style={{ fontSize: '13px', fontWeight: '600', textTransform: 'capitalize' }}>
          {status === 'connected' ? 'Connected' : status === 'connecting' ? 'Connecting...' : 'Offline'}
        </span>
      </div>

      {/* Active Room Participants List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, overflowY: 'auto' }}>
        <h3 style={{ margin: 0, fontSize: '12px', fontWeight: '700', color: '#94a3b8', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Collaborators ({activeUsers.length + (myProfile ? 1 : 0)})
        </h3>
        
        {/* Render Me First */}
        {myProfile && (
          <div 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '10px', 
              padding: '8px 10px', 
              borderRadius: '8px', 
              backgroundColor: 'rgba(99,102,241,0.06)',
              border: '1px dashed rgba(99,102,241,0.2)'
            }}
          >
            <span style={{ fontSize: '16px' }}>{myProfile.avatar}</span>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#fff', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                {myProfile.name} (You)
              </div>
              <div style={{ fontSize: '10px', color: '#a5b4fc' }}>
                ID: {myProfile.clientId.replace('client_', '').substring(0, 6)}
              </div>
            </div>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: myProfile.color }} />
          </div>
        )}

        {/* Render Multiplayer Peers */}
        {activeUsers.map(user => (
          <div 
            key={user.clientId}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '10px', 
              padding: '8px 10px', 
              borderRadius: '8px',
              backgroundColor: 'rgba(255,255,255,0.01)',
              transition: 'background-color 0.2s'
            }}
          >
            <span style={{ fontSize: '16px' }}>{user.avatar}</span>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div style={{ fontSize: '13px', fontWeight: '500', color: '#cbd5e1', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                {user.name}
              </div>
              <div style={{ fontSize: '10px', color: '#64748b' }}>
                {user.currentAction ? `action: ${user.currentAction}` : 'Idle'}
              </div>
            </div>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: user.color }} />
          </div>
        ))}
      </div>

    </div>
  );
}

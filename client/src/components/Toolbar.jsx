import React from 'react';

// color swatches we allow users to pick from
const PALETTE = [
  { name: 'purple', hex: '#6366f1' },
  { name: 'cyan', hex: '#14b8a6' },
  { name: 'yellow', hex: '#eab308' },
  { name: 'pink', hex: '#d946ef' },
  { name: 'emerald', hex: '#10b981' },
  { name: 'white', hex: '#f8fafc' }
];

const STROKE_WIDTHS = [
  { label: 'S', value: 3 },
  { label: 'M', value: 6 },
  { label: 'L', value: 12 }
];

export default function Toolbar({ 
  activeTool, 
  setActiveTool, 
  currentColor, 
  setCurrentColor, 
  currentWidth, 
  setCurrentWidth,
  clearCanvas
}) {
  // floating toolbar that sits at the bottom. super sleek glassmorphic card
  return (
    <div 
      className="glass-panel" 
      style={{
        position: 'absolute',
        bottom: '24px',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        alignItems: 'center',
        padding: '8px 16px',
        gap: '16px',
        zIndex: 500,
        height: '48px',
        borderRadius: '24px'
      }}
    >
      {/* 1. primary tool buttons (using raw inline svgs so no npm issues occur!) */}
      <div style={{ display: 'flex', gap: '6px', borderRight: '1px solid rgba(255,255,255,0.08)', paddingRight: '12px' }}>
        
        {/* Select Tool */}
        <button
          onClick={() => setActiveTool('select')}
          style={getToolButtonStyle(activeTool === 'select')}
          title="Select & Move Objects"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="m3 3 7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/>
            <path d="m13 13 6 6"/>
          </svg>
        </button>

        {/* Pencil/Drawing Tool */}
        <button
          onClick={() => setActiveTool('draw')}
          style={getToolButtonStyle(activeTool === 'draw')}
          title="Freehand Draw"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20h9"/>
            <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>
          </svg>
        </button>

        {/* Sticky Note Tool */}
        <button
          onClick={() => setActiveTool('sticky')}
          style={getToolButtonStyle(activeTool === 'sticky')}
          title="Place Sticky Note"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15.5 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-8.5L15.5 3Z"/>
            <path d="M15 3v6h6"/>
          </svg>
        </button>

        {/* Rectangle Tool */}
        <button
          onClick={() => setActiveTool('rectangle')}
          style={getToolButtonStyle(activeTool === 'rectangle')}
          title="Draw Rectangle"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="18" height="18" x="3" y="3" rx="2"/>
          </svg>
        </button>

        {/* Circle Tool */}
        <button
          onClick={() => setActiveTool('circle')}
          style={getToolButtonStyle(activeTool === 'circle')}
          title="Draw Circle"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
          </svg>
        </button>
      </div>

      {/* 2. dynamic color picker */}
      <div style={{ display: 'flex', gap: '6px', borderRight: '1px solid rgba(255,255,255,0.08)', paddingRight: '12px' }}>
        {PALETTE.map(color => (
          <button
            key={color.hex}
            onClick={() => setCurrentColor(color.hex)}
            style={{
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              backgroundColor: color.hex,
              border: currentColor === color.hex ? '2px solid white' : '1px solid rgba(0,0,0,0.3)',
              cursor: 'pointer',
              transform: currentColor === color.hex ? 'scale(1.2)' : 'scale(1)',
              transition: 'transform 0.15s ease',
              outline: 'none',
              padding: 0
            }}
            title={color.name}
          />
        ))}
      </div>

      {/* 3. brush stroke width selectors */}
      <div style={{ display: 'flex', gap: '4px', borderRight: '1px solid rgba(255,255,255,0.08)', paddingRight: '12px' }}>
        {STROKE_WIDTHS.map(width => (
          <button
            key={width.value}
            onClick={() => setCurrentWidth(width.value)}
            style={{
              width: '24px',
              height: '24px',
              borderRadius: '4px',
              backgroundColor: currentWidth === width.value ? 'rgba(255,255,255,0.15)' : 'transparent',
              border: 'none',
              color: currentWidth === width.value ? '#fff' : '#94a3b8',
              fontSize: '11px',
              fontWeight: '700',
              cursor: 'pointer',
              outline: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background-color 0.15s'
            }}
          >
            {width.label}
          </button>
        ))}
      </div>

      {/* 4. nuclear board wiping button */}
      <button
        onClick={() => {
          if (window.confirm('r u sure u want to wipe the whole canvas? this tombstones everything!')) {
            clearCanvas();
          }
        }}
        style={{
          background: 'transparent',
          border: 'none',
          color: '#ef4444',
          cursor: 'pointer',
          padding: '6px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          outline: 'none',
          transition: 'background-color 0.15s'
        }}
        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.15)'}
        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
        title="Wipe Entire Board"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 6h18"/>
          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
        </svg>
      </button>

    </div>
  );
}

// helper styles for raw tool buttons
function getToolButtonStyle(isActive) {
  return {
    background: isActive ? 'linear-gradient(135deg, #6366f1 0%, #d946ef 100%)' : 'transparent',
    border: 'none',
    color: isActive ? '#fff' : '#94a3b8',
    width: '32px',
    height: '32px',
    borderRadius: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    outline: 'none',
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    transform: isActive ? 'scale(1.1) translateY(-2px)' : 'scale(1)',
    boxShadow: isActive ? '0 4px 12px rgba(99, 102, 241, 0.35)' : 'none'
  };
}

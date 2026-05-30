import React, { useState, useRef, useEffect } from 'react';
import { getActiveElements } from '../utils/crdt';

export default function Canvas({
  activeTool,
  setActiveTool,
  elements,
  updateElement,
  updateCursor,
  currentColor,
  currentWidth
}) {
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentElement, setCurrentElement] = useState(null);
  const [draggedElement, setDraggedElement] = useState(null);
  const [selectedElementId, setSelectedElementId] = useState(null);
  
  const canvasRef = useRef(null);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const dragOffsetRef = useRef({ x: 0, y: 0 });

  // soft pastel colors for glass note background
  const getStickyBgColor = (hex) => {
    switch (hex) {
      case '#6366f1': return 'rgba(99, 102, 241, 0.2)';
      case '#14b8a6': return 'rgba(20, 184, 166, 0.2)';
      case '#eab308': return 'rgba(234, 179, 8, 0.25)';
      case '#d946ef': return 'rgba(217, 70, 239, 0.2)';
      case '#10b981': return 'rgba(16, 185, 129, 0.2)';
      default: return 'rgba(255, 255, 255, 0.12)';
    }
  };

  // matching note borders
  const getStickyBorderColor = (hex) => {
    switch (hex) {
      case '#6366f1': return 'rgba(99, 102, 241, 0.4)';
      case '#14b8a6': return 'rgba(20, 184, 166, 0.4)';
      case '#eab308': return 'rgba(234, 179, 8, 0.4)';
      case '#d946ef': return 'rgba(217, 70, 239, 0.4)';
      case '#10b981': return 'rgba(16, 185, 129, 0.4)';
      default: return 'rgba(255, 255, 255, 0.25)';
    }
  };

  // filter out current active draft so we dont double render it locally
  const activeElements = getActiveElements(elements).filter(el => !currentElement || el.id !== currentElement.id);

  // track mouse coordinates relative to our drawing board
  const getCanvasCoords = (e) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: Math.round(e.clientX - rect.left),
      y: Math.round(e.clientY - rect.top)
    };
  };

  const handleMouseDown = (e) => {
    // block trigger if clicking inputs or delete buttons
    if (e.target.tagName === 'TEXTAREA' || e.target.closest('.delete-btn')) {
      return;
    }

    const { x, y } = getCanvasCoords(e);
    dragStartRef.current = { x, y };

    if (activeTool === 'select') {
      // search backward (topmost elements first) for clicked elements
      const clicked = [...activeElements].reverse().find(el => {
        if (el.type === 'sticky') {
          return (
            x >= el.x && 
            x <= el.x + el.width && 
            y >= el.y && 
            y <= el.y + el.height
          );
        } else if (el.type === 'rectangle') {
          return (
            x >= el.x && 
            x <= el.x + el.width && 
            y >= el.y && 
            y <= el.y + el.height
          );
        } else if (el.type === 'circle') {
          // radius distance check
          const dist = Math.sqrt((x - el.x) ** 2 + (y - el.y) ** 2);
          return dist <= el.radius + 6;
        } else if (el.type === 'path') {
          // simple box check for paths to keep it fast
          const xs = el.points.map(p => p.x);
          const ys = el.points.map(p => p.y);
          const minX = Math.min(...xs) - 8;
          const maxX = Math.max(...xs) + 8;
          const minY = Math.min(...ys) - 8;
          const maxY = Math.max(...ys) + 8;
          return x >= minX && x <= maxX && y >= minY && y <= maxY;
        }
        return false;
      });

      if (clicked) {
        setDraggedElement(clicked);
        setSelectedElementId(clicked.id);
        
        // record offsets for shape dragging
        if (clicked.type === 'path') {
          dragOffsetRef.current = { x, y }; // paths use incremental relative deltas
        } else {
          dragOffsetRef.current = {
            x: x - clicked.x,
            y: y - clicked.y
          };
        }
        updateCursor({ x, y }, 'moving');
      } else {
        setSelectedElementId(null);
      }
    } else if (activeTool === 'draw') {
      const newPath = {
        id: 'path_' + Math.random().toString(36).substring(2, 9),
        type: 'path',
        points: [{ x, y }],
        color: currentColor,
        width: currentWidth,
        deleted: false
      };
      setCurrentElement(newPath);
      setIsDrawing(true);
      updateElement(newPath); // sync instantly on first click!
      updateCursor({ x, y }, 'drawing');
    } else if (activeTool === 'sticky') {
      const newSticky = {
        id: 'sticky_' + Math.random().toString(36).substring(2, 9),
        type: 'sticky',
        x: x - 80,
        y: y - 80,
        width: 160,
        height: 160,
        content: '',
        color: currentColor,
        deleted: false
      };
      updateElement(newSticky);
      setSelectedElementId(newSticky.id);
      setActiveTool('select'); // automatically swap to select so they type instantly
    } else if (activeTool === 'rectangle') {
      const newRect = {
        id: 'rect_' + Math.random().toString(36).substring(2, 9),
        type: 'rectangle',
        x,
        y,
        width: 0,
        height: 0,
        color: currentColor,
        width: currentWidth,
        deleted: false
      };
      setCurrentElement(newRect);
      setIsDrawing(true);
      updateElement(newRect); // sync instantly on first click!
      updateCursor({ x, y }, 'drawing');
    } else if (activeTool === 'circle') {
      const newCircle = {
        id: 'circle_' + Math.random().toString(36).substring(2, 9),
        type: 'circle',
        x, // cx
        y, // cy
        radius: 0,
        color: currentColor,
        width: currentWidth,
        deleted: false
      };
      setCurrentElement(newCircle);
      setIsDrawing(true);
      updateElement(newCircle); // sync instantly on first click!
      updateCursor({ x, y }, 'drawing');
    }
  };

  const handleMouseMove = (e) => {
    const { x, y } = getCanvasCoords(e);

    // tell everyone where my mouse is and what I am doing
    updateCursor({ x, y }, activeTool === 'select' ? (draggedElement ? 'moving' : null) : activeTool);

    if (isDrawing && currentElement) {
      if (currentElement.type === 'path') {
        const updatedPoints = [...currentElement.points, { x, y }];
        const updatedElement = { ...currentElement, points: updatedPoints };
        setCurrentElement(updatedElement);
        updateElement(updatedElement); // stream live pencil line as it grows!
      } else if (currentElement.type === 'rectangle') {
        // drag rectangle bounding boxes cleanly
        const startX = dragStartRef.current.x;
        const startY = dragStartRef.current.y;
        const updatedElement = {
          ...currentElement,
          x: Math.min(x, startX),
          y: Math.min(y, startY),
          width: Math.abs(x - startX),
          height: Math.abs(y - startY)
        };
        setCurrentElement(updatedElement);
        updateElement(updatedElement); // stream live rectangle resize drag!
      } else if (currentElement.type === 'circle') {
        const startX = dragStartRef.current.x;
        const startY = dragStartRef.current.y;
        const radius = Math.round(Math.sqrt((x - startX) ** 2 + (y - startY) ** 2));
        const updatedElement = { ...currentElement, radius };
        setCurrentElement(updatedElement);
        updateElement(updatedElement); // stream live circle resize drag!
      }
    } else if (draggedElement) {
      if (draggedElement.type === 'path') {
        // delta shifts: move all points by difference from last drag tick
        const dx = x - dragOffsetRef.current.x;
        const dy = y - dragOffsetRef.current.y;
        
        const movedPoints = draggedElement.points.map(p => ({
          x: p.x + dx,
          y: p.y + dy
        }));

        const updated = {
          ...draggedElement,
          points: movedPoints,
          timestamp: Date.now()
        };

        setDraggedElement(updated);
        updateElement(updated);
        dragOffsetRef.current = { x, y }; // reset incremental shift anchor
      } else {
        // flat rectangle/circle/sticky positioning updates
        const updated = {
          ...draggedElement,
          x: x - dragOffsetRef.current.x,
          y: y - dragOffsetRef.current.y,
          timestamp: Date.now()
        };
        setDraggedElement(updated);
        updateElement(updated);
      }
    }
  };

  const handleMouseUp = () => {
    if (isDrawing && currentElement) {
      updateElement(currentElement); // seal shape one final time
      setCurrentElement(null);
      setIsDrawing(false);
    } else if (draggedElement) {
      updateElement(draggedElement);
      setDraggedElement(null);
    }
  };


  // deletes an element by marking it as deleted (tombstone)
  const handleDeleteElement = (id) => {
    const el = elements.get(id);
    if (el) {
      const tombstoned = {
        ...el,
        deleted: true,
        timestamp: Date.now()
      };
      updateElement(tombstoned);
      setSelectedElementId(null);
    }
  };

  // handle keyboard delete key hits
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedElementId) {
        // make sure we arent typing inside a textarea when we click delete
        if (document.activeElement.tagName !== 'TEXTAREA') {
          handleDeleteElement(selectedElementId);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedElementId, elements, updateElement]);

  return (
    <div
      ref={canvasRef}
      className={`canvas-grid-bg ${activeTool === 'select' ? 'tool-select' : ''}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* SVG drawing layer */}
      <svg 
        style={{
          width: '100%',
          height: '100%',
          position: 'absolute',
          top: 0,
          left: 0,
          pointerEvents: 'none'
        }}
      >
        {/* Render persistent canvas items */}
        {activeElements.map(el => {
          if (el.type === 'path') {
            const pathData = el.points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
            return (
              <path
                key={el.id}
                d={pathData}
                className="draw-path"
                stroke={el.color}
                strokeWidth={el.width}
              />
            );
          } else if (el.type === 'rectangle') {
            return (
              <rect
                key={el.id}
                x={el.x}
                y={el.y}
                width={el.width}
                height={el.height}
                fill="none"
                stroke={el.color}
                strokeWidth={el.width || 4}
                rx="6"
              />
            );
          } else if (el.type === 'circle') {
            return (
              <circle
                key={el.id}
                cx={el.x}
                cy={el.y}
                r={el.radius}
                fill="none"
                stroke={el.color}
                strokeWidth={el.width || 4}
              />
            );
          }
          return null;
        })}

        {/* Render current drawing path placeholder (real-time preview) */}
        {isDrawing && currentElement && currentElement.type === 'path' && (
          <path
            d={currentElement.points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')}
            className="draw-path"
            stroke={currentElement.color}
            strokeWidth={currentElement.width}
          />
        )}

        {/* Render current drawing rectangle placeholder */}
        {isDrawing && currentElement && currentElement.type === 'rectangle' && (
          <rect
            x={currentElement.x}
            y={currentElement.y}
            width={currentElement.width}
            height={currentElement.height}
            fill="none"
            stroke={currentElement.color}
            strokeWidth={currentElement.width || 4}
            rx="6"
          />
        )}

        {/* Render current drawing circle placeholder */}
        {isDrawing && currentElement && currentElement.type === 'circle' && (
          <circle
            cx={currentElement.x}
            cy={currentElement.y}
            r={currentElement.radius}
            fill="none"
            stroke={currentElement.color}
            strokeWidth={currentElement.width || 4}
          />
        )}

        {/* selection highlights bounding dotted boxes */}
        {selectedElementId && (
          (() => {
            const sel = elements.get(selectedElementId);
            if (!sel || sel.deleted) return null;
            
            if (sel.type === 'rectangle' || sel.type === 'sticky') {
              return (
                <rect
                  x={sel.x - 6}
                  y={sel.y - 6}
                  width={sel.width + 12}
                  height={sel.height + 12}
                  fill="none"
                  stroke="#818cf8"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                  rx="8"
                />
              );
            } else if (sel.type === 'circle') {
              return (
                <circle
                  cx={sel.x}
                  cy={sel.y}
                  r={sel.radius + 6}
                  fill="none"
                  stroke="#818cf8"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                />
              );
            } else if (sel.type === 'path') {
              // rough bounds check highlight for paths
              const xs = sel.points.map(p => p.x);
              const ys = sel.points.map(p => p.y);
              const minX = Math.min(...xs) - 6;
              const maxX = Math.max(...xs) + 6;
              const minY = Math.min(...ys) - 6;
              const maxY = Math.max(...ys) + 6;
              return (
                <rect
                  x={minX}
                  y={minY}
                  width={maxX - minX}
                  height={maxY - minY}
                  fill="none"
                  stroke="#818cf8"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                  rx="4"
                />
              );
            }
            return null;
          })()
        )}
      </svg>

      {/* HTML layers for sticky notes (so inputs are highly accessible!) */}
      {activeElements
        .filter(el => el.type === 'sticky')
        .map(el => {
          const isSelected = selectedElementId === el.id;
          
          return (
            <div
              key={el.id}
              className="sticky-note"
              style={{
                left: `${el.x}px`,
                top: `${el.y}px`,
                width: `${el.width}px`,
                height: `${el.height}px`,
                backgroundColor: getStickyBgColor(el.color),
                border: `1.5px solid ${getStickyBorderColor(el.color)}`,
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)'
              }}
            >
              {/* Note Header / Drag handle & Deletion button */}
              <div 
                style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  width: '100%',
                  borderBottom: '1px solid rgba(255,255,255,0.06)',
                  paddingBottom: '4px',
                  cursor: activeTool === 'select' ? 'grab' : 'crosshair'
                }}
              >
                <span style={{ fontSize: '9px', fontWeight: 'bold', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>
                  Sticky note
                </span>
                
                {/* Trash Deletion Icon */}
                <button
                  className="delete-btn"
                  onClick={() => handleDeleteElement(el.id)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'rgba(255, 255, 255, 0.4)',
                    cursor: 'pointer',
                    fontSize: '11px',
                    padding: '0 4px',
                    outline: 'none',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                  onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.4)'}
                  title="Delete Note"
                >
                  ✕
                </button>
              </div>

              {/* Rich editable textarea field */}
              <textarea
                value={el.content || ''}
                placeholder="type something..."
                onChange={(e) => {
                  updateElement({
                    ...el,
                    content: e.target.value,
                    timestamp: Date.now()
                  });
                }}
                onFocus={() => updateCursor({ x: el.x, y: el.y }, 'typing')}
                onBlur={() => updateCursor({ x: el.x, y: el.y }, null)}
                style={{
                  color: '#fff',
                  fontSize: '13px'
                }}
              />
            </div>
          );
        })}
    </div>
  );
}

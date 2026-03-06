import React, { useCallback, useRef, useState } from 'react';
import type { ReportElement } from '../types/schema';
import { useCanvasStore } from '../stores/useCanvasStore';

interface Props {
  element: ReportElement;
  isSelected: boolean;
  schema: import('../types/schema').FieldSchema[];
  zoom: number;
}

const HANDLE_SIZE = 8;
const RESIZE_HANDLES = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'] as const;
type Handle = typeof RESIZE_HANDLES[number];

function getHandleCursor(handle: Handle): string {
  const cursors: Record<Handle, string> = {
    nw: 'nw-resize', n: 'n-resize', ne: 'ne-resize',
    e: 'e-resize', se: 'se-resize', s: 's-resize',
    sw: 'sw-resize', w: 'w-resize',
  };
  return cursors[handle];
}

function getHandleStyle(handle: Handle): React.CSSProperties {
  const base: React.CSSProperties = {
    position: 'absolute',
    width: HANDLE_SIZE,
    height: HANDLE_SIZE,
    backgroundColor: '#00d4ff',
    border: '1px solid #fff',
    borderRadius: 2,
  };
  const positions: Record<Handle, React.CSSProperties> = {
    nw: { top: -HANDLE_SIZE / 2, left: -HANDLE_SIZE / 2 },
    n:  { top: -HANDLE_SIZE / 2, left: '50%', transform: 'translateX(-50%)' },
    ne: { top: -HANDLE_SIZE / 2, right: -HANDLE_SIZE / 2 },
    e:  { top: '50%', right: -HANDLE_SIZE / 2, transform: 'translateY(-50%)' },
    se: { bottom: -HANDLE_SIZE / 2, right: -HANDLE_SIZE / 2 },
    s:  { bottom: -HANDLE_SIZE / 2, left: '50%', transform: 'translateX(-50%)' },
    sw: { bottom: -HANDLE_SIZE / 2, left: -HANDLE_SIZE / 2 },
    w:  { top: '50%', left: -HANDLE_SIZE / 2, transform: 'translateY(-50%)' },
  };
  return { ...base, ...positions[handle] };
}

function resolveFieldLabel(el: ReportElement, schema: Props['schema']): string {
  if (el.type !== 'field') return '';
  const field = schema.find((f) => f.id === el.fieldRef);
  return field ? `${field.fieldName}${field.sampleValues[0] ? `: ${field.sampleValues[0]}` : ''}` : el.fieldRef;
}

function ElementContent({ element, schema }: { element: ReportElement; schema: Props['schema'] }): React.ReactElement {
  const style: React.CSSProperties = {
    width: '100%',
    height: '100%',
    fontSize: element.style.fontSize ?? 12,
    fontWeight: element.style.fontWeight ?? 'normal',
    color: element.style.color ?? '#000000',
    backgroundColor: element.style.backgroundColor ?? 'transparent',
    textAlign: element.style.textAlign ?? 'left',
    opacity: element.style.opacity ?? 1,
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    padding: '2px 4px',
    boxSizing: 'border-box',
  };

  switch (element.type) {
    case 'field':
      return (
        <div style={style}>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', pointerEvents: 'none' }}>
            {resolveFieldLabel(element, schema)}
          </span>
        </div>
      );

    case 'label': {
      const updateElement = useCanvasStore.getState().updateElement;
      return (
        <div style={{ ...style, padding: 0 }}>
          <textarea
            value={element.content}
            onChange={(e) => updateElement(element.id, { content: e.target.value } as Partial<ReportElement>)}
            style={{
              width: '100%',
              height: '100%',
              background: 'transparent',
              border: 'none',
              outline: 'none',
              resize: 'none',
              fontFamily: 'inherit',
              fontSize: element.style.fontSize ?? 12,
              fontWeight: element.style.fontWeight ?? 'normal',
              color: element.style.color ?? '#000000',
              textAlign: element.style.textAlign ?? 'left',
              padding: '2px 4px',
              cursor: 'text',
            }}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          />
        </div>
      );
    }

    case 'image':
      return element.src ? (
        <img
          src={element.src}
          alt="element"
          style={{ width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none' }}
        />
      ) : (
        <div style={{ ...style, justifyContent: 'center', border: '2px dashed #888', color: '#888', fontSize: 11 }}>
          Click to upload image
        </div>
      );

    case 'table': {
      const cellWidth = element.width / element.cols;
      const cellHeight = element.height / element.rows;
      return (
        <div style={{ width: '100%', height: '100%', overflow: 'hidden', pointerEvents: 'none' }}>
          {Array.from({ length: element.rows }, (_, r) => (
            <div key={r} style={{ display: 'flex', height: cellHeight }}>
              {Array.from({ length: element.cols }, (_, c) => {
                const key = `${r},${c}`;
                const cellVal = element.cells[key] ?? '';
                const display = cellVal.startsWith('field:')
                  ? (schema.find((f) => f.id === cellVal.slice(6))?.fieldName ?? cellVal)
                  : cellVal;
                return (
                  <div
                    key={c}
                    style={{
                      width: cellWidth,
                      height: cellHeight,
                      border: `${element.style.borderWidth ?? 1}px solid ${element.style.borderColor ?? '#ccc'}`,
                      fontSize: element.style.fontSize ?? 10,
                      display: 'flex',
                      alignItems: 'center',
                      padding: '0 4px',
                      overflow: 'hidden',
                      boxSizing: 'border-box',
                    }}
                  >
                    {display}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      );
    }

    case 'shape': {
      if (element.shapeType === 'ellipse') {
        return (
          <div style={{
            width: '100%', height: '100%',
            borderRadius: '50%',
            backgroundColor: element.fill,
            border: `${element.strokeWidth}px solid ${element.stroke}`,
            opacity: element.style.opacity ?? 1,
            pointerEvents: 'none',
          }} />
        );
      }
      if (element.shapeType === 'line') {
        return (
          <div style={{
            width: '100%',
            height: element.strokeWidth,
            marginTop: (element.height - element.strokeWidth) / 2,
            backgroundColor: element.stroke,
            opacity: element.style.opacity ?? 1,
            pointerEvents: 'none',
          }} />
        );
      }
      return (
        <div style={{
          width: '100%', height: '100%',
          backgroundColor: element.fill,
          border: `${element.strokeWidth}px solid ${element.stroke}`,
          borderRadius: element.style.borderRadius ?? 0,
          opacity: element.style.opacity ?? 1,
          pointerEvents: 'none',
        }} />
      );
    }

    case 'divider': {
      const isH = element.orientation === 'horizontal';
      return (
        <div style={{
          width: '100%', height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
        }}>
          <div style={{
            ...(isH
              ? { width: '100%', height: element.thickness, backgroundColor: element.color }
              : { width: element.thickness, height: '100%', backgroundColor: element.color }),
          }} />
        </div>
      );
    }
  }
}

const DraggableElement = React.memo(function DraggableElement({ element, isSelected, schema, zoom }: Props) {
  const moveElement = useCanvasStore((s) => s.moveElement);
  const setSelected = useCanvasStore((s) => s.setSelected);
  const toggleSelected = useCanvasStore((s) => s.toggleSelected);
  const resizeElement = useCanvasStore((s) => s.resizeElement);
  const clearGuides = useCanvasStore((s) => s.clearGuides);
  const updateElement = useCanvasStore((s) => s.updateElement);
  const pushHistory = useCanvasStore((s) => s.pushHistory);

  const dragOffset = useRef({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const resizeHandle = useRef<Handle | null>(null);
  const resizeStart = useRef({ mouseX: 0, mouseY: 0, elX: 0, elY: 0, elW: 0, elH: 0 });
  const [isDraggingState, setIsDraggingState] = useState(false);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.stopPropagation();

    if (e.metaKey || e.ctrlKey) {
      toggleSelected(element.id);
      return;
    }
    if (!isSelected) {
      setSelected([element.id]);
    }

    dragOffset.current = {
      x: e.clientX / zoom - element.x,
      y: e.clientY / zoom - element.y,
    };
    isDragging.current = true;
    setIsDraggingState(true);

    const onMove = (me: MouseEvent) => {
      if (!isDragging.current) return;
      const newX = me.clientX / zoom - dragOffset.current.x;
      const newY = me.clientY / zoom - dragOffset.current.y;
      moveElement(element.id, Math.max(0, newX), Math.max(0, newY));
    };

    const onUp = () => {
      isDragging.current = false;
      setIsDraggingState(false);
      clearGuides();
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [element, isSelected, zoom, moveElement, setSelected, toggleSelected, clearGuides]);

  const onResizeMouseDown = useCallback((e: React.MouseEvent, handle: Handle) => {
    e.stopPropagation();
    e.preventDefault();
    pushHistory();
    resizeHandle.current = handle;
    resizeStart.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      elX: element.x,
      elY: element.y,
      elW: element.width,
      elH: element.height,
    };

    const onMove = (me: MouseEvent) => {
      const dx = (me.clientX - resizeStart.current.mouseX) / zoom;
      const dy = (me.clientY - resizeStart.current.mouseY) / zoom;
      const h = resizeHandle.current;
      let { elX, elY, elW, elH } = resizeStart.current;

      if (h === 'e' || h === 'se' || h === 'ne') elW += dx;
      if (h === 'w' || h === 'sw' || h === 'nw') { elW -= dx; elX += dx; }
      if (h === 's' || h === 'se' || h === 'sw') elH += dy;
      if (h === 'n' || h === 'ne' || h === 'nw') { elH -= dy; elY += dy; }

      resizeElement(element.id, Math.max(20, elW), Math.max(10, elH), elX, elY);
    };

    const onUp = () => {
      resizeHandle.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [element, zoom, resizeElement, pushHistory]);

  const onImageClick = useCallback(() => {
    if (element.type !== 'image') return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const src = ev.target?.result as string;
        updateElement(element.id, { src } as Partial<ReportElement>);
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }, [element, updateElement]);

  return (
    <div
      onMouseDown={element.type === 'image' && !element.src ? undefined : onMouseDown}
      onClick={element.type === 'image' ? onImageClick : undefined}
      style={{
        position: 'absolute',
        willChange: 'transform',
        transform: `translate3d(${element.x}px, ${element.y}px, 0)`,
        width: element.width,
        height: element.height,
        cursor: isDraggingState ? 'grabbing' : 'grab',
        outline: isSelected ? '2px solid #00d4ff' : 'none',
        outlineOffset: 1,
        userSelect: 'none',
        boxSizing: 'border-box',
      }}
    >
      <ElementContent element={element} schema={schema} />

      {isSelected && RESIZE_HANDLES.map((handle) => (
        <div
          key={handle}
          style={{ ...getHandleStyle(handle), cursor: getHandleCursor(handle), zIndex: 10 }}
          onMouseDown={(e) => onResizeMouseDown(e, handle)}
        />
      ))}
    </div>
  );
});

export default DraggableElement;

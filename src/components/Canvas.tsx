import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useCanvasStore } from '../stores/useCanvasStore';
import { useSchemaStore } from '../stores/useSchemaStore';
import DraggableElement from './DraggableElement';
import type { ReportElement, FieldSchema } from '../types/schema';


const A4_WIDTH = 794;
const A4_HEIGHT = 1123;

function buildDefaultElement(
  type: ReportElement['type'],
  x: number,
  y: number,
  fieldRef?: string
): Omit<ReportElement, 'id'> {
  const style = {};
  switch (type) {
    case 'field':
      return { type: 'field', x, y, width: 200, height: 40, fieldRef: fieldRef ?? '', style } as Omit<ReportElement, 'id'>;
    case 'label':
      return { type: 'label', x, y, width: 200, height: 40, content: 'Label text', style } as Omit<ReportElement, 'id'>;
    case 'image':
      return { type: 'image', x, y, width: 150, height: 120, src: undefined, style } as Omit<ReportElement, 'id'>;
    case 'table':
      return { type: 'table', x, y, width: 300, height: 120, rows: 3, cols: 3, cells: {}, style } as Omit<ReportElement, 'id'>;
    case 'shape':
      return { type: 'shape', x, y, width: 120, height: 80, shapeType: 'rect', fill: '#e0e0e0', stroke: '#888888', strokeWidth: 1, style } as Omit<ReportElement, 'id'>;
    case 'divider':
      return { type: 'divider', x, y, width: 300, height: 8, orientation: 'horizontal', thickness: 2, color: '#cccccc', style } as Omit<ReportElement, 'id'>;
    default: {
      const _exhaustive: never = type;
      return { type: 'label', x, y, width: 200, height: 40, content: '', style } as Omit<ReportElement, 'id'>;
      void _exhaustive;
    }
  }
}

interface LassoRect {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

export default function Canvas(): React.ReactElement {
  const {
    elements,
    selectedIds,
    guides,
    zoom,
    showGrid,
    toolMode,
    addElement,
    setSelected,
    selectAll,
    clearSelected,
    deleteSelected,
    moveElement,
    undo,
    setZoom,
  } = useCanvasStore(
    useShallow((s) => ({
      elements: s.elements,
      selectedIds: s.selectedIds,
      guides: s.guides,
      zoom: s.zoom,
      showGrid: s.showGrid,
      toolMode: s.toolMode,
      addElement: s.addElement,
      setSelected: s.setSelected,
      selectAll: s.selectAll,
      clearSelected: s.clearSelected,
      deleteSelected: s.deleteSelected,
      moveElement: s.moveElement,
      undo: s.undo,
      setZoom: s.setZoom,
    }))
  );

  const schema = useSchemaStore((s) => s.schema);
  const canvasRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [lasso, setLasso] = useState<LassoRect | null>(null);
  const lassoStart = useRef<{ x: number; y: number } | null>(null);

  // Stable refs so event listeners don't need to re-register on every element mutation
  const selectedIdsRef = useRef(selectedIds);
  const elementsRef = useRef(elements);
  useLayoutEffect(() => {
    selectedIdsRef.current = selectedIds;
    elementsRef.current = elements;
  });

  // Keyboard handlers — uses refs so listener is registered once, not on every element mutation
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'TEXTAREA' || tag === 'INPUT') return;

      const currentSelectedIds = selectedIdsRef.current;
      const currentElements = elementsRef.current;

      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        undo();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'a') {
        e.preventDefault();
        selectAll();
        return;
      }
      if (e.key === 'Escape') {
        clearSelected();
        return;
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (currentSelectedIds.size > 0) {
          e.preventDefault();
          deleteSelected();
        }
        return;
      }

      const nudge = e.shiftKey ? 10 : 1;
      if (e.key === 'ArrowLeft') {
        for (const id of currentSelectedIds) {
          const el = currentElements.get(id);
          if (el) moveElement(id, el.x - nudge, el.y);
        }
      } else if (e.key === 'ArrowRight') {
        for (const id of currentSelectedIds) {
          const el = currentElements.get(id);
          if (el) moveElement(id, el.x + nudge, el.y);
        }
      } else if (e.key === 'ArrowUp') {
        for (const id of currentSelectedIds) {
          const el = currentElements.get(id);
          if (el) moveElement(id, el.x, el.y - nudge);
        }
      } else if (e.key === 'ArrowDown') {
        for (const id of currentSelectedIds) {
          const el = currentElements.get(id);
          if (el) moveElement(id, el.x, el.y + nudge);
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [undo, selectAll, clearSelected, deleteSelected, moveElement]);

  // Ctrl+Scroll zoom
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        setZoom(zoom + delta);
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [zoom, setZoom]);

  // Drop from SchemaPanel
  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const fieldId = e.dataTransfer.getData('fieldId');
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = Math.round((e.clientX - rect.left) / zoom);
      const y = Math.round((e.clientY - rect.top) / zoom);
      addElement(buildDefaultElement('field', x, y, fieldId));
    },
    [zoom, addElement]
  );

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  // Canvas mousedown — lasso or tool placement
  const onCanvasMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = (e.clientX - rect.left) / zoom;
      const y = (e.clientY - rect.top) / zoom;

      if (toolMode !== 'select') {
        const typeMap: Record<string, ReportElement['type']> = {
          label: 'label',
          rect: 'shape',
          ellipse: 'shape',
          line: 'shape',
          image: 'image',
          table: 'table',
          divider: 'divider',
        };
        const elType = typeMap[toolMode];
        if (elType) {
          const el = buildDefaultElement(elType, Math.round(x), Math.round(y));
          if (el.type === 'shape' && (toolMode === 'ellipse' || toolMode === 'line')) {
            const shapeType = toolMode as 'ellipse' | 'line';
            addElement({ ...el, shapeType } as Omit<ReportElement, 'id'>);
          } else {
            addElement(el);
          }
        }
        return;
      }

      clearSelected();
      lassoStart.current = { x, y };
      setLasso({ startX: x, startY: y, endX: x, endY: y });

      const onMove = (me: MouseEvent) => {
        if (!lassoStart.current) return;
        const ex = (me.clientX - rect.left) / zoom;
        const ey = (me.clientY - rect.top) / zoom;
        setLasso({ startX: lassoStart.current.x, startY: lassoStart.current.y, endX: ex, endY: ey });
      };

      const onUp = (me: MouseEvent) => {
        if (!lassoStart.current) return;
        const ex = (me.clientX - rect.left) / zoom;
        const ey = (me.clientY - rect.top) / zoom;
        const lx = Math.min(lassoStart.current.x, ex);
        const ly = Math.min(lassoStart.current.y, ey);
        const lw = Math.abs(ex - lassoStart.current.x);
        const lh = Math.abs(ey - lassoStart.current.y);

        if (lw > 5 || lh > 5) {
          const intersected: string[] = [];
          for (const [id, el] of elementsRef.current) {
            if (
              el.x < lx + lw &&
              el.x + el.width > lx &&
              el.y < ly + lh &&
              el.y + el.height > ly
            ) {
              intersected.push(id);
            }
          }
          if (intersected.length > 0) setSelected(intersected);
        }

        lassoStart.current = null;
        setLasso(null);
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      };

      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    },
    [toolMode, zoom, addElement, clearSelected, setSelected]
  );

  const lassoStyle: React.CSSProperties | undefined = lasso
    ? {
        position: 'absolute',
        left: Math.min(lasso.startX, lasso.endX),
        top: Math.min(lasso.startY, lasso.endY),
        width: Math.abs(lasso.endX - lasso.startX),
        height: Math.abs(lasso.endY - lasso.startY),
        border: '1px dashed #00d4ff',
        backgroundColor: 'rgba(0, 212, 255, 0.05)',
        pointerEvents: 'none',
        zIndex: 1000,
      }
    : undefined;

  return (
    <div
      ref={scrollRef}
      style={{
        flex: 1,
        overflow: 'auto',
        backgroundColor: '#0f0f1a',
        backgroundImage: showGrid
          ? 'radial-gradient(circle, rgba(255,255,255,0.12) 1px, transparent 1px)'
          : 'none',
        backgroundSize: '20px 20px',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: 40,
        minHeight: 0,
      }}
    >
      <div
        style={{
          transform: `scale(${zoom})`,
          transformOrigin: 'top center',
          flexShrink: 0,
        }}
      >
        <div
          ref={canvasRef}
          style={{
            position: 'relative',
            width: A4_WIDTH,
            height: A4_HEIGHT,
            backgroundColor: '#ffffff',
            boxShadow: '0 8px 64px rgba(0,0,0,0.6)',
            overflow: 'hidden',
            cursor: toolMode !== 'select' ? 'crosshair' : 'default',
          }}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onMouseDown={onCanvasMouseDown}
        >
          {Array.from(elements.values()).map((el) => (
            <DraggableElement
              key={el.id}
              element={el}
              isSelected={selectedIds.has(el.id)}
              schema={schema as FieldSchema[]}
              zoom={zoom}
            />
          ))}

          {/* Snap guides */}
          {guides.x !== undefined && (
            <div
              style={{
                position: 'absolute',
                left: guides.x,
                top: 0,
                width: 1,
                height: '100%',
                backgroundColor: '#ff3b3b',
                pointerEvents: 'none',
                zIndex: 999,
                borderLeft: '1px dashed #ff3b3b',
              }}
            />
          )}
          {guides.y !== undefined && (
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: guides.y,
                width: '100%',
                height: 1,
                backgroundColor: '#ff3b3b',
                pointerEvents: 'none',
                zIndex: 999,
                borderTop: '1px dashed #ff3b3b',
              }}
            />
          )}

          {/* Lasso selection rect */}
          {lassoStyle && <div style={lassoStyle} />}
        </div>
      </div>
    </div>
  );
}


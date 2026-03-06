import React, { useState, useCallback, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useCanvasStore } from '../stores/useCanvasStore';
import { useSchemaStore } from '../stores/useSchemaStore';
import { exportPDF, exportJSON } from '../utils/exportToPDF.tsx';
import type { ToolMode } from '../types/schema';

const TOOLS: { mode: ToolMode; label: string; key: string }[] = [
  { mode: 'select', label: 'Select', key: 'V' },
  { mode: 'label', label: 'Text', key: 'T' },
  { mode: 'rect', label: 'Rect', key: 'R' },
  { mode: 'ellipse', label: 'Ellipse', key: 'E' },
  { mode: 'line', label: 'Line', key: 'L' },
  { mode: 'image', label: 'Image', key: 'I' },
  { mode: 'table', label: 'Table', key: 'B' },
  { mode: 'divider', label: 'Divider', key: 'D' },
];

export default function Toolbar(): React.ReactElement {
  const { toolMode, zoom, snapToGrid, showGrid, setToolMode, setZoom, toggleSnap, toggleGrid, elements } =
    useCanvasStore(
      useShallow((s) => ({
        toolMode: s.toolMode,
        zoom: s.zoom,
        snapToGrid: s.snapToGrid,
        showGrid: s.showGrid,
        setToolMode: s.setToolMode,
        setZoom: s.setZoom,
        toggleSnap: s.toggleSnap,
        toggleGrid: s.toggleGrid,
        elements: s.elements,
      }))
    );

  const schema = useSchemaStore((s) => s.schema);
  const [templateName, setTemplateName] = useState('Untitled Template');
  const [editingName, setEditingName] = useState(false);
  const [exporting, setExporting] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const handleExportPDF = useCallback(async () => {
    setExporting(true);
    try {
      await exportPDF(Array.from(elements.values()), schema);
    } finally {
      setExporting(false);
    }
  }, [elements, schema]);

  const handleExportJSON = useCallback(() => {
    exportJSON(Array.from(elements.values()));
  }, [elements]);

  const btnStyle = (active: boolean): React.CSSProperties => ({
    padding: '5px 10px',
    backgroundColor: active ? '#00d4ff' : 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 6,
    color: active ? '#0f0f1a' : '#ccc',
    cursor: 'pointer',
    fontSize: 11,
    fontFamily: 'JetBrains Mono, monospace',
    fontWeight: active ? 700 : 400,
    transition: 'all 0.15s',
    whiteSpace: 'nowrap',
  });

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '0 16px',
        height: 52,
        backgroundColor: 'rgba(15,15,26,0.9)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        flexShrink: 0,
        zIndex: 100,
      }}
    >
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 160 }}>
        <div style={{
          width: 28,
          height: 28,
          backgroundColor: '#00d4ff',
          borderRadius: 6,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 14,
          fontWeight: 700,
          color: '#0f0f1a',
        }}>
          R
        </div>
        {editingName ? (
          <input
            ref={nameInputRef}
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            onBlur={() => setEditingName(false)}
            onKeyDown={(e) => { if (e.key === 'Enter') setEditingName(false); }}
            autoFocus
            style={{
              background: 'none',
              border: 'none',
              borderBottom: '1px solid #00d4ff',
              color: '#fff',
              fontSize: 13,
              fontWeight: 600,
              outline: 'none',
              fontFamily: 'DM Sans, sans-serif',
              width: 140,
            }}
          />
        ) : (
          <span
            onClick={() => setEditingName(true)}
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: '#e0e0e0',
              cursor: 'pointer',
              maxWidth: 140,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
            title="Click to rename"
          >
            {templateName}
          </span>
        )}
      </div>

      {/* Divider */}
      <div style={{ width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.1)', flexShrink: 0 }} />

      {/* Tool mode buttons */}
      <div style={{ display: 'flex', gap: 4, overflowX: 'auto' }}>
        {TOOLS.map(({ mode, label, key }) => (
          <button
            key={mode}
            onClick={() => setToolMode(mode)}
            title={`${label} (${key})`}
            style={btnStyle(toolMode === mode)}
          >
            {label}
            <span style={{ fontSize: 9, opacity: 0.6, marginLeft: 4 }}>{key}</span>
          </button>
        ))}
      </div>

      {/* Divider */}
      <div style={{ width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.1)', flexShrink: 0 }} />

      {/* Toggle buttons */}
      <div style={{ display: 'flex', gap: 4 }}>
        <button onClick={toggleSnap} title="Snap to elements" style={btnStyle(snapToGrid)}>
          Snap
        </button>
        <button onClick={toggleGrid} title="Show grid" style={btnStyle(showGrid)}>
          Grid
        </button>
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Zoom */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <button
          onClick={() => setZoom(zoom - 0.1)}
          style={{ ...btnStyle(false), padding: '4px 8px' }}
        >
          −
        </button>
        <span style={{ fontSize: 12, color: '#ccc', minWidth: 44, textAlign: 'center', fontFamily: 'JetBrains Mono, monospace' }}>
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={() => setZoom(zoom + 0.1)}
          style={{ ...btnStyle(false), padding: '4px 8px' }}
        >
          +
        </button>
      </div>

      {/* Divider */}
      <div style={{ width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.1)', flexShrink: 0 }} />

      {/* Export buttons */}
      <div style={{ display: 'flex', gap: 6 }}>
        <button
          onClick={handleExportJSON}
          style={btnStyle(false)}
          title="Export JSON template"
        >
          JSON
        </button>
        <button
          onClick={handleExportPDF}
          disabled={exporting}
          style={{
            padding: '5px 14px',
            backgroundColor: exporting ? 'rgba(0,212,255,0.4)' : '#00d4ff',
            border: 'none',
            borderRadius: 6,
            color: '#0f0f1a',
            cursor: exporting ? 'wait' : 'pointer',
            fontSize: 12,
            fontWeight: 700,
            fontFamily: 'DM Sans, sans-serif',
            transition: 'all 0.15s',
          }}
        >
          {exporting ? 'Generating…' : 'Export PDF'}
        </button>
      </div>
    </div>
  );
}

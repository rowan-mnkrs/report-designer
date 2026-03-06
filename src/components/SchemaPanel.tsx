import React, { useState, useMemo, useCallback } from 'react';
import { useSchemaStore } from '../stores/useSchemaStore';
import type { FieldSchema } from '../types/schema';

const typeIcons: Record<FieldSchema['dataType'], string> = {
  string: 'Aa',
  number: '#',
  date: '📅',
  boolean: '✓',
};

const typeColors: Record<FieldSchema['dataType'], string> = {
  string: '#00d4ff',
  number: '#ffb800',
  date: '#a78bfa',
  boolean: '#34d399',
};

interface ChipProps {
  field: FieldSchema;
}

const FieldChip = React.memo(function FieldChip({ field }: ChipProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  const onDragStart = useCallback((e: React.DragEvent) => {
    e.dataTransfer.setData('fieldId', field.id);
    e.dataTransfer.effectAllowed = 'copy';
  }, [field.id]);

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '5px 8px',
        backgroundColor: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 6,
        cursor: 'grab',
        fontSize: 12,
        fontFamily: 'JetBrains Mono, monospace',
        color: '#e0e0e0',
        userSelect: 'none',
      }}
    >
      <span
        style={{
          fontSize: 10,
          fontWeight: 700,
          color: typeColors[field.dataType],
          minWidth: 16,
          textAlign: 'center',
        }}
      >
        {typeIcons[field.dataType]}
      </span>
      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {field.fieldName}
      </span>

      {showTooltip && field.sampleValues.length > 0 && (
        <div
          style={{
            position: 'fixed',
            left: 288,
            zIndex: 9999,
            backgroundColor: '#1a1a2e',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 6,
            padding: '8px 10px',
            fontSize: 11,
            color: '#ccc',
            whiteSpace: 'nowrap',
            maxWidth: 220,
            boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
            pointerEvents: 'none',
          }}
        >
          <div style={{ color: '#00d4ff', fontWeight: 600, marginBottom: 4 }}>Sample values</div>
          {field.sampleValues.map((v, i) => (
            <div key={i} style={{ padding: '1px 0', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {v}
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

export default function SchemaPanel(): React.ReactElement {
  const schema = useSchemaStore((s) => s.schema);
  const clearSchema = useSchemaStore((s) => s.clearSchema);
  const [query, setQuery] = useState('');

  const grouped = useMemo(() => {
    const q = query.toLowerCase();
    const filtered = q ? schema.filter((f) => f.fieldName.toLowerCase().includes(q)) : schema;
    const groups = new Map<string, FieldSchema[]>();
    for (const field of filtered) {
      const key = `${field.source}:${field.sheetOrPath}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(field);
    }
    return groups;
  }, [schema, query]);

  return (
    <div
      style={{
        width: 280,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRight: '1px solid rgba(255,255,255,0.08)',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div style={{ padding: '12px 14px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: 1 }}>
            Schema Fields
          </span>
          <button
            onClick={clearSchema}
            style={{
              fontSize: 10,
              color: '#666',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '2px 4px',
            }}
            title="Clear schema and go back to upload"
          >
            ↩ Re-upload
          </button>
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search fields…"
          style={{
            width: '100%',
            padding: '6px 10px',
            backgroundColor: 'rgba(255,255,255,0.07)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 6,
            color: '#e0e0e0',
            fontSize: 12,
            fontFamily: 'JetBrains Mono, monospace',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Field groups */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 10px' }}>
        {grouped.size === 0 ? (
          <div style={{ color: '#555', fontSize: 12, textAlign: 'center', marginTop: 24 }}>
            No fields match
          </div>
        ) : (
          Array.from(grouped.entries()).map(([groupKey, fields]) => {
            const [source, path] = groupKey.split(':');
            return (
              <div key={groupKey} style={{ marginBottom: 16 }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  marginBottom: 6,
                  fontSize: 10,
                  color: '#888',
                  textTransform: 'uppercase',
                  letterSpacing: 0.8,
                }}>
                  <span style={{
                    backgroundColor: source === 'xlsx' ? 'rgba(0,212,255,0.15)' : 'rgba(167,139,250,0.15)',
                    color: source === 'xlsx' ? '#00d4ff' : '#a78bfa',
                    padding: '1px 5px',
                    borderRadius: 3,
                    fontSize: 9,
                    fontWeight: 700,
                  }}>
                    {source?.toUpperCase()}
                  </span>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {path}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {fields.map((field) => (
                    <FieldChip key={field.id} field={field} />
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer count */}
      <div style={{
        padding: '8px 14px',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        fontSize: 11,
        color: '#555',
      }}>
        {schema.length} field{schema.length !== 1 ? 's' : ''} total
      </div>
    </div>
  );
}

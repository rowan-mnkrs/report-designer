import React, { useCallback } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useCanvasStore } from '../stores/useCanvasStore';
import { useSchemaStore } from '../stores/useSchemaStore';
import type { ElementStyle, ReportElement } from '../types/schema';

function Label({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <label style={{ fontSize: 10, color: '#888', textTransform: 'uppercase', letterSpacing: 0.8, display: 'block', marginBottom: 4 }}>
      {children}
    </label>
  );
}

function Row({ children }: { children: React.ReactNode }): React.ReactElement {
  return <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>{children}</div>;
}

function NumberInput({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
}): React.ReactElement {
  return (
    <div style={{ flex: 1 }}>
      <Label>{label}</Label>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
        style={inputStyle}
      />
    </div>
  );
}

function ColorInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}): React.ReactElement {
  return (
    <div style={{ flex: 1 }}>
      <Label>{label}</Label>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <input
          type="color"
          value={value || '#000000'}
          onChange={(e) => onChange(e.target.value)}
          style={{ width: 28, height: 28, border: 'none', padding: 0, background: 'none', cursor: 'pointer' }}
        />
        <input
          type="text"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          style={{ ...inputStyle, flex: 1 }}
        />
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '5px 8px',
  backgroundColor: 'rgba(255,255,255,0.07)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 5,
  color: '#e0e0e0',
  fontSize: 12,
  fontFamily: 'JetBrains Mono, monospace',
  outline: 'none',
  boxSizing: 'border-box',
};

function Section({ title, children }: { title: string; children: React.ReactNode }): React.ReactElement {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10, paddingBottom: 6, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        {title}
      </div>
      {children}
    </div>
  );
}

export default function PropertyPanel(): React.ReactElement | null {
  const { elements, selectedIds, updateStyle, updateElement, resizeElement, moveElement } =
    useCanvasStore(
      useShallow((s) => ({
        elements: s.elements,
        selectedIds: s.selectedIds,
        updateStyle: s.updateStyle,
        updateElement: s.updateElement,
        resizeElement: s.resizeElement,
        moveElement: s.moveElement,
      }))
    );
  const schema = useSchemaStore((s) => s.schema);

  // Derive selected elements and shared state (before any hooks that depend on them)
  const selectedEls = Array.from(selectedIds)
    .map((id) => elements.get(id))
    .filter(Boolean) as ReportElement[];

  const single = selectedEls.length === 1 ? selectedEls[0] ?? null : null;
  const ids = Array.from(selectedIds);
  const first = selectedEls[0];

  const sharedStyle: Partial<ElementStyle> = {};
  if (first) {
    if (selectedEls.every((el) => el.style.fontSize === first.style.fontSize)) {
      sharedStyle.fontSize = first.style.fontSize ?? 12;
    }
    if (selectedEls.every((el) => el.style.color === first.style.color)) {
      sharedStyle.color = first.style.color ?? '#000000';
    }
    if (selectedEls.every((el) => el.style.opacity === first.style.opacity)) {
      sharedStyle.opacity = first.style.opacity ?? 1;
    }
    if (selectedEls.every((el) => el.style.textAlign === first.style.textAlign)) {
      sharedStyle.textAlign = first.style.textAlign ?? 'left';
    }
  }

  // All hooks must be called unconditionally before any early returns
  const onStyle = useCallback(
    (patch: Partial<ElementStyle>) => updateStyle(ids, patch),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ids.join(','), updateStyle]
  );

  const onEl = useCallback(
    (patch: Partial<ReportElement>) => {
      if (single) updateElement(single.id, patch);
    },
    [single, updateElement]
  );

  // Early returns after all hooks
  if (selectedIds.size === 0 || selectedEls.length === 0 || !first) return null;

  return (
    <div
      style={{
        width: 280,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderLeft: '1px solid rgba(255,255,255,0.08)',
        overflow: 'hidden',
      }}
    >
      <div style={{ padding: '12px 14px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: 1 }}>
          Properties
        </span>
        {selectedIds.size > 1 && (
          <span style={{ fontSize: 10, color: '#555', marginLeft: 6 }}>({selectedIds.size} selected)</span>
        )}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '14px' }}>

        {/* Position & Size (single select) */}
        {single && (
          <Section title="Position & Size">
            <Row>
              <NumberInput label="X" value={Math.round(single.x)} onChange={(v) => moveElement(single.id, v, single.y)} />
              <NumberInput label="Y" value={Math.round(single.y)} onChange={(v) => moveElement(single.id, single.x, v)} />
            </Row>
            <Row>
              <NumberInput label="W" value={Math.round(single.width)} min={20} onChange={(v) => resizeElement(single.id, v, single.height)} />
              <NumberInput label="H" value={Math.round(single.height)} min={10} onChange={(v) => resizeElement(single.id, single.width, v)} />
            </Row>
          </Section>
        )}

        {/* Opacity */}
        <Section title="Appearance">
          <Label>Opacity</Label>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={sharedStyle.opacity ?? 1}
            onChange={(e) => onStyle({ opacity: Number(e.target.value) })}
            style={{ width: '100%', marginBottom: 12, accentColor: '#00d4ff' }}
          />
        </Section>

        {/* Text controls */}
        {(first.type === 'field' || first.type === 'label') && (
          <Section title="Text">
            <Row>
              <NumberInput label="Size" value={sharedStyle.fontSize ?? 12} min={6} max={200} onChange={(v) => onStyle({ fontSize: v })} />
              <div style={{ flex: 1 }}>
                <Label>Weight</Label>
                <select
                  value={first.style.fontWeight ?? 'normal'}
                  onChange={(e) => onStyle({ fontWeight: e.target.value })}
                  style={{ ...inputStyle, width: '100%' }}
                >
                  <option value="300">Light</option>
                  <option value="normal">Normal</option>
                  <option value="500">Medium</option>
                  <option value="600">Semi</option>
                  <option value="bold">Bold</option>
                </select>
              </div>
            </Row>
            <Row>
              <ColorInput label="Color" value={sharedStyle.color ?? '#000000'} onChange={(v) => onStyle({ color: v })} />
            </Row>
            <Row>
              <div style={{ flex: 1 }}>
                <Label>Align</Label>
                <div style={{ display: 'flex', gap: 4 }}>
                  {(['left', 'center', 'right'] as const).map((a) => (
                    <button
                      key={a}
                      onClick={() => onStyle({ textAlign: a })}
                      style={{
                        flex: 1,
                        padding: '5px 0',
                        backgroundColor: sharedStyle.textAlign === a ? '#00d4ff' : 'rgba(255,255,255,0.07)',
                        border: '1px solid rgba(255,255,255,0.12)',
                        borderRadius: 4,
                        color: sharedStyle.textAlign === a ? '#000' : '#888',
                        cursor: 'pointer',
                        fontSize: 11,
                      }}
                    >
                      {a === 'left' ? '⬅' : a === 'center' ? '↔' : '➡'}
                    </button>
                  ))}
                </div>
              </div>
            </Row>

            {/* Field binding */}
            {single?.type === 'field' && (
              <div style={{ marginTop: 4 }}>
                <Label>Field binding</Label>
                <select
                  value={single.fieldRef}
                  onChange={(e) => onEl({ fieldRef: e.target.value } as Partial<ReportElement>)}
                  style={{ ...inputStyle, width: '100%' }}
                >
                  <option value="">-- select field --</option>
                  {schema.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.fieldName} ({f.sheetOrPath})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </Section>
        )}

        {/* Background */}
        <Section title="Background">
          <Row>
            <ColorInput
              label="Background"
              value={first.style.backgroundColor ?? ''}
              onChange={(v) => onStyle({ backgroundColor: v })}
            />
          </Row>
        </Section>

        {/* Border */}
        <Section title="Border">
          <Row>
            <ColorInput label="Color" value={first.style.borderColor ?? '#cccccc'} onChange={(v) => onStyle({ borderColor: v })} />
            <NumberInput label="Width" value={first.style.borderWidth ?? 0} min={0} onChange={(v) => onStyle({ borderWidth: v })} />
          </Row>
          <Row>
            <NumberInput label="Radius" value={first.style.borderRadius ?? 0} min={0} onChange={(v) => onStyle({ borderRadius: v })} />
          </Row>
        </Section>

        {/* Image controls */}
        {single?.type === 'image' && (
          <Section title="Image">
            <button
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/*';
                input.onchange = () => {
                  const file = input.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = (ev) => {
                    onEl({ src: ev.target?.result as string } as Partial<ReportElement>);
                  };
                  reader.readAsDataURL(file);
                };
                input.click();
              }}
              style={{
                width: '100%',
                padding: '8px',
                backgroundColor: 'rgba(0,212,255,0.1)',
                border: '1px solid rgba(0,212,255,0.3)',
                borderRadius: 6,
                color: '#00d4ff',
                cursor: 'pointer',
                fontSize: 12,
              }}
            >
              Replace image
            </button>
          </Section>
        )}

        {/* Table controls */}
        {single?.type === 'table' && (
          <Section title="Table">
            <Row>
              <NumberInput
                label="Rows"
                value={single.rows}
                min={1}
                onChange={(v) => onEl({ rows: Math.max(1, v) } as Partial<ReportElement>)}
              />
              <NumberInput
                label="Cols"
                value={single.cols}
                min={1}
                onChange={(v) => onEl({ cols: Math.max(1, v) } as Partial<ReportElement>)}
              />
            </Row>
            <Label>Cells (click to bind fields)</Label>
            <div style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${single.cols}, 1fr)`,
              gap: 2,
              marginTop: 4,
            }}>
              {Array.from({ length: single.rows }, (_, r) =>
                Array.from({ length: single.cols }, (_, c) => {
                  const key = `${r},${c}`;
                  const val = single.cells[key] ?? '';
                  const isField = val.startsWith('field:');
                  const display = isField
                    ? (schema.find((f) => f.id === val.slice(6))?.fieldName ?? '?')
                    : val;
                  return (
                    <div
                      key={key}
                      title="Click to edit cell"
                      onClick={() => {
                        const userInput = window.prompt('Enter static text or select a field (type field:<id>):', val);
                        if (userInput !== null) {
                          onEl({ cells: { ...single.cells, [key]: userInput } } as Partial<ReportElement>);
                        }
                      }}
                      style={{
                        padding: '3px',
                        fontSize: 9,
                        backgroundColor: isField ? 'rgba(0,212,255,0.1)' : 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 2,
                        cursor: 'pointer',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        color: isField ? '#00d4ff' : '#ccc',
                        minHeight: 20,
                      }}
                    >
                      {display || '·'}
                    </div>
                  );
                })
              )}
            </div>
          </Section>
        )}

        {/* Shape controls */}
        {single?.type === 'shape' && (
          <Section title="Shape">
            <Row>
              <div style={{ flex: 1 }}>
                <Label>Type</Label>
                <select
                  value={single.shapeType}
                  onChange={(e) => onEl({ shapeType: e.target.value as 'rect' | 'ellipse' | 'line' } as Partial<ReportElement>)}
                  style={{ ...inputStyle, width: '100%' }}
                >
                  <option value="rect">Rectangle</option>
                  <option value="ellipse">Ellipse</option>
                  <option value="line">Line</option>
                </select>
              </div>
            </Row>
            <Row>
              <ColorInput label="Fill" value={single.fill} onChange={(v) => onEl({ fill: v } as Partial<ReportElement>)} />
            </Row>
            <Row>
              <ColorInput label="Stroke" value={single.stroke} onChange={(v) => onEl({ stroke: v } as Partial<ReportElement>)} />
              <NumberInput label="Width" value={single.strokeWidth} min={0} onChange={(v) => onEl({ strokeWidth: v } as Partial<ReportElement>)} />
            </Row>
          </Section>
        )}

        {/* Divider controls */}
        {single?.type === 'divider' && (
          <Section title="Divider">
            <Row>
              <div style={{ flex: 1 }}>
                <Label>Orientation</Label>
                <div style={{ display: 'flex', gap: 4 }}>
                  {(['horizontal', 'vertical'] as const).map((o) => (
                    <button
                      key={o}
                      onClick={() => onEl({ orientation: o } as Partial<ReportElement>)}
                      style={{
                        flex: 1,
                        padding: '5px 0',
                        backgroundColor: single.orientation === o ? '#00d4ff' : 'rgba(255,255,255,0.07)',
                        border: '1px solid rgba(255,255,255,0.12)',
                        borderRadius: 4,
                        color: single.orientation === o ? '#000' : '#888',
                        cursor: 'pointer',
                        fontSize: 11,
                      }}
                    >
                      {o === 'horizontal' ? '— H' : '| V'}
                    </button>
                  ))}
                </div>
              </div>
            </Row>
            <Row>
              <ColorInput label="Color" value={single.color} onChange={(v) => onEl({ color: v } as Partial<ReportElement>)} />
              <NumberInput label="Thickness" value={single.thickness} min={1} onChange={(v) => onEl({ thickness: v } as Partial<ReportElement>)} />
            </Row>
          </Section>
        )}
      </div>
    </div>
  );
}

import { pdf, Document, Page, View, Text, Image } from '@react-pdf/renderer';
import type { Style } from '@react-pdf/types';
import type { ReportElement, FieldSchema } from '../types/schema';

const PX_TO_PT = 0.75;
function pt(px: number): number { return px * PX_TO_PT; }

function resolveField(fieldRef: string, schema: FieldSchema[]): string {
  const field = schema.find((f) => f.id === fieldRef);
  return field ? (field.sampleValues[0] ?? field.fieldName) : `{{${fieldRef}}}`;
}

function resolveCell(value: string, schema: FieldSchema[]): string {
  if (value.startsWith('field:')) return resolveField(value.slice(6), schema);
  return value;
}

function toNode(el: ReportElement, schema: FieldSchema[]): React.ReactElement | null {
  const pos: Style = {
    position: 'absolute',
    left: pt(el.x),
    top: pt(el.y),
    width: pt(el.width),
    height: pt(el.height),
  };

  const textStyle: Style = {
    fontSize: el.style.fontSize ? pt(el.style.fontSize) : 10,
    color: el.style.color ?? '#000000',
    textAlign: (el.style.textAlign ?? 'left') as 'left' | 'center' | 'right' | 'justify',
    opacity: el.style.opacity ?? 1,
  };

  switch (el.type) {
    case 'field':
      return (
        <View key={el.id} style={{ ...pos, backgroundColor: el.style.backgroundColor }}>
          <Text style={textStyle}>{resolveField(el.fieldRef, schema)}</Text>
        </View>
      );

    case 'label':
      return (
        <View key={el.id} style={{ ...pos, backgroundColor: el.style.backgroundColor }}>
          <Text style={textStyle}>{el.content}</Text>
        </View>
      );

    case 'image':
      if (!el.src) return null;
      return (
        <Image
          key={el.id}
          src={el.src}
          style={{ ...pos }}
        />
      );

    case 'table': {
      const cellW = pt(el.width) / el.cols;
      const cellH = pt(el.height) / el.rows;
      return (
        <View key={el.id} style={pos}>
          {Array.from({ length: el.rows }, (_, r) => (
            <View key={r} style={{ flexDirection: 'row' }}>
              {Array.from({ length: el.cols }, (_, c) => {
                const cellKey = `${r},${c}`;
                const val = resolveCell(el.cells[cellKey] ?? '', schema);
                return (
                  <View
                    key={c}
                    style={{
                      width: cellW,
                      height: cellH,
                      borderWidth: 0.5,
                      borderColor: el.style.borderColor ?? '#cccccc',
                      justifyContent: 'center',
                      paddingHorizontal: 4,
                    }}
                  >
                    <Text style={{ ...textStyle, fontSize: 8 }}>{val}</Text>
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      );
    }

    case 'shape': {
      if (el.shapeType === 'line') {
        return (
          <View
            key={el.id}
            style={{
              position: 'absolute',
              left: pt(el.x),
              top: pt(el.y) + pt(el.height) / 2,
              width: pt(el.width),
              height: el.strokeWidth,
              backgroundColor: el.stroke,
              opacity: el.style.opacity ?? 1,
            }}
          />
        );
      }
      const borderRadius = el.shapeType === 'ellipse'
        ? Math.min(pt(el.width), pt(el.height)) / 2
        : (el.style.borderRadius ?? 0);
      return (
        <View
          key={el.id}
          style={{
            ...pos,
            backgroundColor: el.fill,
            borderWidth: el.strokeWidth,
            borderColor: el.stroke,
            borderRadius,
            opacity: el.style.opacity ?? 1,
          }}
        />
      );
    }

    case 'divider': {
      const isH = el.orientation === 'horizontal';
      return (
        <View
          key={el.id}
          style={{
            ...pos,
            ...(isH
              ? { borderTopWidth: el.thickness, borderTopColor: el.color, height: el.thickness }
              : { borderLeftWidth: el.thickness, borderLeftColor: el.color, width: el.thickness }),
          }}
        />
      );
    }
  }
}

function ReportDocument({ elements, schema }: { elements: ReportElement[]; schema: FieldSchema[] }): React.ReactElement {
  const sorted = [...elements].sort((a, b) => a.y - b.y);
  return (
    <Document>
      <Page size="A4" style={{ position: 'relative', backgroundColor: '#ffffff' }}>
        {sorted.map((el) => toNode(el, schema))}
      </Page>
    </Document>
  );
}

export async function exportPDF(elements: ReportElement[], schema: FieldSchema[]): Promise<void> {
  const blob = await pdf(<ReportDocument elements={elements} schema={schema} />).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'report-template.pdf';
  a.click();
  URL.revokeObjectURL(url);
}

export function exportJSON(elements: ReportElement[]): void {
  const data = JSON.stringify(elements, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'template.json';
  a.click();
  URL.revokeObjectURL(url);
}

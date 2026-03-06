import { z } from 'zod';

// ───────────────────────────────────────────────
// FieldSchema — raw schema extracted from files
// ───────────────────────────────────────────────
export interface FieldSchema {
  id: string;
  source: 'xlsx' | 'xml';
  sheetOrPath: string;
  fieldName: string;
  dataType: 'string' | 'number' | 'date' | 'boolean';
  sampleValues: string[];
}

// ───────────────────────────────────────────────
// ReportElement — Zod-validated canvas element
// ───────────────────────────────────────────────
const StyleSchema = z.object({
  fontSize: z.number().optional(),
  fontWeight: z.string().optional(),
  color: z.string().optional(),
  backgroundColor: z.string().optional(),
  borderColor: z.string().optional(),
  borderWidth: z.number().optional(),
  borderRadius: z.number().optional(),
  opacity: z.number().min(0).max(1).optional(),
  textAlign: z.enum(['left', 'center', 'right']).optional(),
});

export const ReportElementSchema = z.union([
  z.object({
    id: z.string(),
    type: z.literal('field'),
    x: z.number(),
    y: z.number(),
    width: z.number(),
    height: z.number(),
    fieldRef: z.string(),
    label: z.string().optional(),
    style: StyleSchema,
  }),
  z.object({
    id: z.string(),
    type: z.literal('label'),
    x: z.number(),
    y: z.number(),
    width: z.number(),
    height: z.number(),
    content: z.string(),
    style: StyleSchema,
  }),
  z.object({
    id: z.string(),
    type: z.literal('image'),
    x: z.number(),
    y: z.number(),
    width: z.number(),
    height: z.number(),
    src: z.string().optional(),
    style: StyleSchema,
  }),
  z.object({
    id: z.string(),
    type: z.literal('table'),
    x: z.number(),
    y: z.number(),
    width: z.number(),
    height: z.number(),
    rows: z.number().min(1),
    cols: z.number().min(1),
    cells: z.record(z.string(), z.string()),
    style: StyleSchema,
  }),
  z.object({
    id: z.string(),
    type: z.literal('shape'),
    x: z.number(),
    y: z.number(),
    width: z.number(),
    height: z.number(),
    shapeType: z.enum(['rect', 'ellipse', 'line']),
    fill: z.string(),
    stroke: z.string(),
    strokeWidth: z.number(),
    style: StyleSchema,
  }),
  z.object({
    id: z.string(),
    type: z.literal('divider'),
    x: z.number(),
    y: z.number(),
    width: z.number(),
    height: z.number(),
    orientation: z.enum(['horizontal', 'vertical']),
    thickness: z.number(),
    color: z.string(),
    style: StyleSchema,
  }),
]);

export type ReportElement = z.infer<typeof ReportElementSchema>;
export type ElementStyle = z.infer<typeof StyleSchema>;

// Tool modes
export type ToolMode =
  | 'select'
  | 'label'
  | 'rect'
  | 'ellipse'
  | 'line'
  | 'image'
  | 'table'
  | 'divider';

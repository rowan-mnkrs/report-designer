# Report Designer SaaS — CLAUDE.md

## App Overview

A professional-grade Report Designer SaaS with two phases:
1. **Schema Extraction** — parse XLSX + XML files into `FieldSchema[]`
2. **Template Designer** — Miro/Draw.io-style canvas for mapping schema fields to A4 layout, with PDF export

## Aesthetic Tokens
- Background: `#0f0f1a` (canvas-bg)
- Panel: `rgba(255,255,255,0.05)` (panel-bg)
- Accent blue: `#00d4ff` (brand-blue)
- Accent amber: `#ffb800` (brand-amber)
- Font: JetBrains Mono (code/labels), DM Sans (UI)

## Phase Architecture

### Phase 1: Upload
- Two drag-and-drop zones (XLSX / XML)
- File preview cards (name, size, type badge)
- "Extract Schema" CTA → calls `extractSchema()` → `setSchema()`
- Transitions to Designer when `schema.length > 0`

### Phase 2: Designer
- `<Toolbar>` top
- `<SchemaPanel>` left (280px)
- `<Canvas>` center (flex-grow)
- `<PropertyPanel>` right (280px, conditional on selection)

## Types

```ts
// src/types/schema.ts

interface FieldSchema {
  id: string;
  source: 'xlsx' | 'xml';
  sheetOrPath: string;
  fieldName: string;
  dataType: 'string' | 'number' | 'date' | 'boolean';
  sampleValues: string[];
}

// ReportElement derived from Zod schema
// type: 'field' | 'label' | 'image' | 'table' | 'shape' | 'divider'
```

## File Structure

```
src/
  stores/
    useSchemaStore.ts       # Zustand: FieldSchema[], persist to sessionStorage
    useCanvasStore.ts       # Zustand: elements Map, history, guides, zoom
  components/
    Canvas.tsx              # A4 workspace + guidelines overlay
    DraggableElement.tsx    # Memoized GPU-optimized element
    SchemaPanel.tsx         # Left panel: draggable field chips
    PropertyPanel.tsx       # Right panel: style editor for selected elements
    Toolbar.tsx             # Top bar: tools, zoom, snap, export
  utils/
    fileParser.ts           # XLSX + XML → FieldSchema[]
    exportToPDF.ts          # ReportElement[] → @react-pdf/renderer PDF
  types/
    schema.ts               # FieldSchema type + Zod ReportElementSchema
  App.tsx                   # Phase router: Upload → Designer
```

## Best Practices

- **TypeScript**: `strict: true`, `noImplicitAny: true`, zero `any` types
- **Validation**: Zod at all data boundaries (file parsing output, store mutations)
- **Performance**: `React.memo` + `useShallow` (from `zustand/react/shallow`) for all store selectors
- **GPU optimization**: `transform: translate3d(x,y,0)` + `will-change: transform` on draggable elements
- **History**: Max 50 undo snapshots, push snapshot before every mutation
- **Drag**: Delta pattern — `dragOffset.current = { x: e.clientX - el.x, y: e.clientY - el.y }` on mousedown; `newX = e.clientX - dragOffset.current.x` on mousemove
- **Snap**: 5px threshold on left/right/top/bottom/center edges of all other elements
- **Native APIs**: Prefer `DOMParser`, `FileReader`, `URL.createObjectURL` over heavy deps

## Key Technical Decisions

| Decision | Choice | Reason |
|---|---|---|
| Drag implementation | Custom `onMouseMove` delta pattern | Sub-pixel precision, no "jump to cursor" |
| State management | Zustand with `useShallow` | Minimal re-renders on element move |
| PDF generation | `@react-pdf/renderer` | Browser-based, no server needed |
| XLSX parsing | SheetJS (`xlsx`) | De-facto standard |
| XML parsing | Native `DOMParser` | Zero dependency |
| Validation | Zod for `ReportElement` | Runtime safety on positions/styles |
| GPU optimization | `translate3d` + `will-change: transform` | Compositor layer promotion |

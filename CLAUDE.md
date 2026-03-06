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
| Ref sync in Canvas | `useLayoutEffect` (no deps) | Keeps `elementsRef`/`selectedIdsRef` current after every render without exposing them to event listener effect deps |

---

## Current Status (2026-03-06)

### ✅ Completed & Stable
- Full two-phase flow: Upload (XLSX/XML parsing) → Designer
- All 6 element types: `field`, `label`, `image`, `table`, `shape`, `divider`
- Drag-and-drop from SchemaPanel → Canvas (creates `field` element at drop coords)
- Tool placement from Toolbar (click canvas to place label/rect/ellipse/line/image/table/divider)
- Resize handles (8 anchors, all directions) with live preview
- Snap guides (5px threshold, red overlay lines)
- Multi-select (Cmd+click, lasso drag)
- Keyboard shortcuts: Delete, arrows (1px/10px nudge), Cmd+A, Cmd+Z, Escape
- PropertyPanel: position/size, opacity, text style, field binding, table cell editor, image upload, shape/divider controls
- Undo (50-snapshot history, push on add/delete/style/updateElement)
- Zoom (Ctrl+scroll + toolbar +/−)
- Grid toggle, snap toggle
- PDF export (`@react-pdf/renderer`)
- JSON template export
- Schema persisted to sessionStorage via Zustand persist
- TypeScript: zero errors (`tsc --noEmit` clean)
- ESLint: zero errors/warnings

### 🐛 Bugs Fixed
- PropertyPanel: hooks called after conditional return → Rules of Hooks crash
- SchemaPanel: tooltip `position:absolute left:100%` caused mouse-enter/leave flicker loop at browser-event frequency → freeze
- Zod v4: `z.discriminatedUnion` → `z.union`; `z.record(z.string())` → `z.record(z.string(), z.string())`
- `resizeElement` pushed history on every `mousemove` (60fps O(n) allocs) → removed history push, call `pushHistory()` once at resize start
- `forceUpdate` in drag `onMove` caused double render per frame → replaced with `isDraggingState` (2 renders total per drag)
- Keyboard `useEffect` deps included `elements` Map → listener re-registered 60fps during drag → moved to `useLayoutEffect` ref sync pattern
- `onCanvasMouseDown` deps included `elements` → same 60fps recreation → use `elementsRef.current` in lasso handler
- `clearGuides` created new `{}` on every call → stable `EMPTY_GUIDES` constant

### ⚠️ Known Limitations / Future Work
- `updateElement` pushes history on every label textarea keystroke — acceptable for now, could debounce
- `resizeElement` via PropertyPanel number inputs is not undoable (no history push) — by design for now
- Table cell editor uses `window.prompt` — should be replaced with inline editing UI
- Toolbar keyboard shortcuts (V/T/R/E/L/I/B/D) are labelled but not wired up
- No copy/paste of elements
- No layer ordering (z-index control)
- No multi-page support

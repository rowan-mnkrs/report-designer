import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { ReportElement, ElementStyle, ToolMode } from '../types/schema';

const MAX_HISTORY = 50;
const SNAP_THRESHOLD = 5;

export interface Guides {
  x?: number;
  y?: number;
}

interface CanvasState {
  elements: Map<string, ReportElement>;
  selectedIds: Set<string>;
  guides: Guides;
  history: ReportElement[][];
  zoom: number;
  snapToGrid: boolean;
  showGrid: boolean;
  toolMode: ToolMode;

  // Actions
  addElement: (element: Omit<ReportElement, 'id'>) => string;
  moveElement: (id: string, x: number, y: number) => void;
  resizeElement: (id: string, width: number, height: number, x?: number, y?: number) => void;
  deleteSelected: () => void;
  setSelected: (ids: string[]) => void;
  toggleSelected: (id: string) => void;
  selectAll: () => void;
  clearSelected: () => void;
  updateStyle: (ids: string[], style: Partial<ElementStyle>) => void;
  updateElement: (id: string, patch: Partial<ReportElement>) => void;
  undo: () => void;
  setZoom: (zoom: number) => void;
  toggleSnap: () => void;
  toggleGrid: () => void;
  setToolMode: (mode: ToolMode) => void;
  clearGuides: () => void;
}

function snapshot(elements: Map<string, ReportElement>): ReportElement[] {
  return Array.from(elements.values());
}

function computeGuides(
  id: string,
  x: number,
  y: number,
  width: number,
  height: number,
  elements: Map<string, ReportElement>
): Guides {
  const guides: Guides = {};

  for (const [otherId, other] of elements) {
    if (otherId === id) continue;

    const otherRight = other.x + other.width;
    const otherBottom = other.y + other.height;
    const otherCenterX = other.x + other.width / 2;
    const otherCenterY = other.y + other.height / 2;

    const elRight = x + width;
    const elCenterX = x + width / 2;
    const elCenterY = y + height / 2;

    // Vertical guides (x-axis alignment)
    if (Math.abs(x - other.x) < SNAP_THRESHOLD) guides.x = other.x;
    else if (Math.abs(x - otherRight) < SNAP_THRESHOLD) guides.x = otherRight;
    else if (Math.abs(elRight - other.x) < SNAP_THRESHOLD) guides.x = other.x;
    else if (Math.abs(elRight - otherRight) < SNAP_THRESHOLD) guides.x = otherRight;
    else if (Math.abs(elCenterX - otherCenterX) < SNAP_THRESHOLD) guides.x = otherCenterX;

    // Horizontal guides (y-axis alignment)
    if (Math.abs(y - other.y) < SNAP_THRESHOLD) guides.y = other.y;
    else if (Math.abs(y - otherBottom) < SNAP_THRESHOLD) guides.y = otherBottom;
    else if (Math.abs(y + height - other.y) < SNAP_THRESHOLD) guides.y = other.y;
    else if (Math.abs(y + height - otherBottom) < SNAP_THRESHOLD) guides.y = otherBottom;
    else if (Math.abs(elCenterY - otherCenterY) < SNAP_THRESHOLD) guides.y = otherCenterY;
  }

  return guides;
}

export const useCanvasStore = create<CanvasState>()((set) => ({
  elements: new Map(),
  selectedIds: new Set(),
  guides: {},
  history: [],
  zoom: 1,
  snapToGrid: true,
  showGrid: true,
  toolMode: 'select',

  addElement: (elementData) => {
    const id = uuidv4();
    set((state) => {
      const newElements = new Map(state.elements);
      const element = { ...elementData, id } as ReportElement;
      newElements.set(id, element);
      const newHistory = [
        ...state.history.slice(-MAX_HISTORY + 1),
        snapshot(state.elements),
      ];
      return { elements: newElements, history: newHistory, selectedIds: new Set([id]) };
    });
    return id;
  },

  moveElement: (id, x, y) => {
    set((state) => {
      const el = state.elements.get(id);
      if (!el) return state;

      let snappedX = x;
      let snappedY = y;
      const guides = computeGuides(id, x, y, el.width, el.height, state.elements);

      if (state.snapToGrid) {
        if (guides.x !== undefined) snappedX = guides.x;
        if (guides.y !== undefined) snappedY = guides.y;
      }

      const newElements = new Map(state.elements);
      newElements.set(id, { ...el, x: snappedX, y: snappedY });

      return { elements: newElements, guides };
    });
  },

  resizeElement: (id, width, height, x, y) => {
    set((state) => {
      const el = state.elements.get(id);
      if (!el) return state;
      const newElements = new Map(state.elements);
      const newHistory = [
        ...state.history.slice(-MAX_HISTORY + 1),
        snapshot(state.elements),
      ];
      newElements.set(id, {
        ...el,
        width: Math.max(20, width),
        height: Math.max(10, height),
        x: x ?? el.x,
        y: y ?? el.y,
      });
      return { elements: newElements, history: newHistory };
    });
  },

  deleteSelected: () => {
    set((state) => {
      const newElements = new Map(state.elements);
      const newHistory = [
        ...state.history.slice(-MAX_HISTORY + 1),
        snapshot(state.elements),
      ];
      for (const id of state.selectedIds) {
        newElements.delete(id);
      }
      return { elements: newElements, selectedIds: new Set(), history: newHistory };
    });
  },

  setSelected: (ids) => set({ selectedIds: new Set(ids) }),

  toggleSelected: (id) => {
    set((state) => {
      const next = new Set(state.selectedIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { selectedIds: next };
    });
  },

  selectAll: () => {
    set((state) => ({ selectedIds: new Set(state.elements.keys()) }));
  },

  clearSelected: () => set({ selectedIds: new Set() }),

  updateStyle: (ids, style) => {
    set((state) => {
      const newElements = new Map(state.elements);
      const newHistory = [
        ...state.history.slice(-MAX_HISTORY + 1),
        snapshot(state.elements),
      ];
      for (const id of ids) {
        const el = newElements.get(id);
        if (el) {
          newElements.set(id, { ...el, style: { ...el.style, ...style } });
        }
      }
      return { elements: newElements, history: newHistory };
    });
  },

  updateElement: (id, patch) => {
    set((state) => {
      const el = state.elements.get(id);
      if (!el) return state;
      const newElements = new Map(state.elements);
      const newHistory = [
        ...state.history.slice(-MAX_HISTORY + 1),
        snapshot(state.elements),
      ];
      newElements.set(id, { ...el, ...patch } as ReportElement);
      return { elements: newElements, history: newHistory };
    });
  },

  undo: () => {
    set((state) => {
      if (state.history.length === 0) return state;
      const prev = state.history[state.history.length - 1];
      if (!prev) return state;
      const restoredElements = new Map<string, ReportElement>();
      for (const el of prev) {
        restoredElements.set(el.id, el);
      }
      return {
        elements: restoredElements,
        history: state.history.slice(0, -1),
        selectedIds: new Set(),
      };
    });
  },

  setZoom: (zoom) => set({ zoom: Math.min(2, Math.max(0.5, zoom)) }),

  toggleSnap: () => set((state) => ({ snapToGrid: !state.snapToGrid })),

  toggleGrid: () => set((state) => ({ showGrid: !state.showGrid })),

  setToolMode: (mode) => set({ toolMode: mode }),

  clearGuides: () => set({ guides: {} }),
}));

// Selector helpers
export const selectElements = (state: CanvasState) => state.elements;
export const selectSelectedIds = (state: CanvasState) => state.selectedIds;
export const selectGuides = (state: CanvasState) => state.guides;
export const selectZoom = (state: CanvasState) => state.zoom;
export const selectToolMode = (state: CanvasState) => state.toolMode;
export const selectShowGrid = (state: CanvasState) => state.showGrid;
export const selectSnapToGrid = (state: CanvasState) => state.snapToGrid;

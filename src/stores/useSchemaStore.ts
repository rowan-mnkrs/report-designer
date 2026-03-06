import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { FieldSchema } from '../types/schema';

interface SchemaState {
  schema: FieldSchema[];
  setSchema: (schema: FieldSchema[]) => void;
  clearSchema: () => void;
}

export const useSchemaStore = create<SchemaState>()(
  persist(
    (set) => ({
      schema: [],
      setSchema: (schema) => set({ schema }),
      clearSchema: () => set({ schema: [] }),
    }),
    {
      name: 'report-designer-schema',
      storage: {
        getItem: (key) => {
          const item = sessionStorage.getItem(key);
          return item ? JSON.parse(item) : null;
        },
        setItem: (key, value) => sessionStorage.setItem(key, JSON.stringify(value)),
        removeItem: (key) => sessionStorage.removeItem(key),
      },
    }
  )
);

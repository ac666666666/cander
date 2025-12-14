import { create } from 'zustand';
import { API_URL } from '@/constants/config';

export type Quadrant = 'I' | 'II' | 'III' | 'IV';
export type Priority = 'high' | 'medium' | 'low';

export type ChecklistItem = {
  id: string;
  title: string;
  done: boolean;
  createdAt: number;
  quadrant?: Quadrant;
  priority?: Priority;
  deadline?: string; // ISO string
};

type ChecklistState = {
  items: ChecklistItem[];
  fetchItems: () => Promise<void>;
  addItem: (title: string, priority?: Priority, deadline?: string) => Promise<void>;
  updateItem: (id: string, patch: Partial<ChecklistItem>) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
  toggleDone: (id: string) => Promise<void>;
  renameItem: (id: string, title: string) => Promise<void>;
  clearCompleted: () => Promise<void>;
  itemsByQuadrant: (q: Quadrant) => ChecklistItem[];
};

export const useChecklistStore = create<ChecklistState>((set, get) => ({
  items: [],

  fetchItems: async () => {
    try {
      const res = await fetch(`${API_URL}/todos`);
      if (res.ok) {
        const data = await res.json();
        set({ items: data });
      }
    } catch (e) {
      console.error('Failed to fetch todos', e);
    }
  },

  addItem: async (title, priority = 'medium', deadline) => {
    const newItem: ChecklistItem = {
      id: Math.random().toString(36).slice(2) + Date.now(),
      title,
      done: false,
      createdAt: Date.now(),
      priority,
      deadline,
    };
    // 乐观更新
    set((s) => ({ items: [newItem, ...s.items] }));
    try {
      await fetch(`${API_URL}/todos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newItem),
      });
    } catch (err) {
      console.error('Failed to add todo', err);
      set((s) => ({ items: s.items.filter((i) => i.id !== newItem.id) }));
    }
  },

  updateItem: async (id, patch) => {
    const oldItems = get().items;
    set((s) => ({ items: s.items.map((it) => (it.id === id ? { ...it, ...patch } : it)) }));
    try {
      await fetch(`${API_URL}/todos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
    } catch (err) {
      set({ items: oldItems });
    }
  },

  removeItem: async (id) => {
    const oldItems = get().items;
    set((s) => ({ items: s.items.filter((it) => it.id !== id) }));
    try {
      await fetch(`${API_URL}/todos/${id}`, { method: 'DELETE' });
    } catch (err) {
      set({ items: oldItems });
    }
  },

  toggleDone: async (id) => {
    const item = get().items.find((i) => i.id === id);
    if (!item) return;
    const newDone = !item.done;
    const oldItems = get().items;
    
    set((s) => ({ items: s.items.map((it) => (it.id === id ? { ...it, done: newDone } : it)) }));
    try {
      await fetch(`${API_URL}/todos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ done: newDone }),
      });
    } catch (err) {
      set({ items: oldItems });
    }
  },

  renameItem: async (id, title) => {
    const oldItems = get().items;
    set((s) => ({ items: s.items.map((it) => (it.id === id ? { ...it, title } : it)) }));
    try {
      await fetch(`${API_URL}/todos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      });
    } catch (err) {
      set({ items: oldItems });
    }
  },

  clearCompleted: async () => {
    const completedIds = get().items.filter(i => i.done).map(i => i.id);
    const oldItems = get().items;
    set((s) => ({ items: s.items.filter((it) => !it.done) }));
    try {
      // 简单循环删除，生产环境可优化为批量删除接口
      for (const id of completedIds) {
        await fetch(`${API_URL}/todos/${id}`, { method: 'DELETE' });
      }
    } catch (err) {
      set({ items: oldItems });
    }
  },

  itemsByQuadrant: (q) => get().items.filter((it) => it.quadrant === q),
}));

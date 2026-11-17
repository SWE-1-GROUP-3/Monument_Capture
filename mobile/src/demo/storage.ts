// Native fallback: keeps local data in memory for the app session.
// The web implementation persists the same state to localStorage.
let memory: string | null = null;

export const demoStorage = {
  load(): string | null {
    return memory;
  },
  save(value: string): boolean {
    memory = value;
    return true;
  },
  clear() {
    memory = null;
  },
};

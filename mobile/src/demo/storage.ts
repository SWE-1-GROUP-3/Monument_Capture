// Native fallback: keeps demo data in memory for the app session.
// (The demo targets the web build, where storage.web.ts persists to localStorage.)
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

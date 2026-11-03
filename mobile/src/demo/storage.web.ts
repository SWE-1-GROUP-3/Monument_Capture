// Web: persists demo data in localStorage so it survives a page refresh.
const KEY = "monument-capture-demo";

export const demoStorage = {
  load(): string | null {
    try {
      return window.localStorage.getItem(KEY);
    } catch {
      return null;
    }
  },
  save(value: string): boolean {
    try {
      window.localStorage.setItem(KEY, value);
      return true;
    } catch {
      // Private browsing or storage full: keep working in memory.
      return false;
    }
  },
  clear() {
    try {
      window.localStorage.removeItem(KEY);
    } catch {
      // ignore
    }
  },
};

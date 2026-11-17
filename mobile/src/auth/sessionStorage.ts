import * as SecureStore from "expo-secure-store";

// Chunk large JWT sessions below native keychain item limits. Publish the
// manifest only after all chunks are written; a failed write keeps the old session.
export const sessionStorage = {
  async getItem(key: string) {
    const raw = await SecureStore.getItemAsync(key);
    if (!raw) return null;
    const manifest = JSON.parse(raw) as { generation: string; count: number };
    if (!Number.isInteger(manifest.count) || manifest.count < 1 || manifest.count > 1000) return null;
    const chunks = await Promise.all(Array.from({ length: manifest.count }, (_, i) =>
      SecureStore.getItemAsync(`${key}.${manifest.generation}.${i}`)));
    return chunks.some(c => c === null) ? null : chunks.join("");
  },
  async setItem(key: string, value: string) {
    const previous = await SecureStore.getItemAsync(key);
    const generation = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const chunks = value.match(/[\s\S]{1,400}/g) ?? [""];
    try {
      const results = await Promise.allSettled(chunks.map((chunk, i) => SecureStore.setItemAsync(`${key}.${generation}.${i}`, chunk)));
      const failure = results.find(result => result.status === "rejected");
      if (failure?.status === "rejected") throw failure.reason;
      await SecureStore.setItemAsync(key, JSON.stringify({ generation, count: chunks.length }));
    } catch (error) {
      await Promise.all(chunks.map((_, i) => SecureStore.deleteItemAsync(`${key}.${generation}.${i}`)));
      throw error;
    }
    if (previous) await removeChunks(key, previous);
  },
  async removeItem(key: string) {
    const raw = await SecureStore.getItemAsync(key);
    await SecureStore.deleteItemAsync(key);
    if (raw) await removeChunks(key, raw);
  },
};

async function removeChunks(key: string, raw: string) {
  const { generation, count } = JSON.parse(raw) as { generation: string; count: number };
  await Promise.all(Array.from({ length: count }, (_, i) => SecureStore.deleteItemAsync(`${key}.${generation}.${i}`)));
}

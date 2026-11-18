// Turns a capture's photoUri into something an <img> can show.
//
// Local mode stores data URLs, which work as they are. In Supabase mode the
// photo is in a private Storage bucket, referenced as "storage:<path>"; this
// asks Storage for a short-lived signed URL (allowed only for the player who
// took it and for moderators) and caches it until shortly before it expires.

import { useEffect, useState } from "react";

import { PHOTO_BUCKET } from "./game";
import { STORAGE_PHOTO_PREFIX } from "./serverMap";
import { getSupabase } from "./supabaseClient";

const SIGNED_URL_SECONDS = 60 * 60;
const cache = new Map<string, { url: string; expiresAt: number }>();

export async function resolvePhotoUrl(photoUri: string): Promise<string | null> {
  if (!photoUri) return null;
  if (!photoUri.startsWith(STORAGE_PHOTO_PREFIX)) return photoUri;
  const path = photoUri.slice(STORAGE_PHOTO_PREFIX.length);
  const hit = cache.get(path);
  if (hit && hit.expiresAt > Date.now() + 60_000) return hit.url;
  const { data, error } = await getSupabase().storage.from(PHOTO_BUCKET).createSignedUrl(path, SIGNED_URL_SECONDS);
  if (error || !data?.signedUrl) return null;
  cache.set(path, { url: data.signedUrl, expiresAt: Date.now() + SIGNED_URL_SECONDS * 1000 });
  return data.signedUrl;
}

/** The displayable URL for a photo, or null while loading / if unavailable. */
export function usePhotoUrl(photoUri: string | undefined): string | null {
  const direct = photoUri && !photoUri.startsWith(STORAGE_PHOTO_PREFIX) ? photoUri : null;
  const [signed, setSigned] = useState<string | null>(null);
  useEffect(() => {
    if (!photoUri || direct) return;
    let live = true;
    void resolvePhotoUrl(photoUri).then((url) => {
      if (live) setSigned(url);
    });
    return () => {
      live = false;
    };
  }, [photoUri, direct]);
  return direct ?? signed;
}

/** Test helper. */
export function __clearPhotoUrlCache() {
  cache.clear();
}

import * as ImagePicker from "expo-image-picker";

const MAX_SIDE = 960;

/**
 * Web: shrink the photo and turn it into a JPEG data URL, so it can be kept in
 * localStorage (which only holds a few MB) and survives a page refresh.
 */
export async function preparePhoto(uri: string): Promise<string> {
  const img = new Image();
  img.src = uri;
  try {
    await img.decode();
  } catch {
    // Whatever the file claims to be, the browser can't show it as a picture.
    throw new Error("That file isn't a photo. Choose a JPG, PNG or HEIC image of the monument.");
  }
  try {
    const scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return uri;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.72);
  } catch {
    return uri;
  }
}

export type PhotoSource = "camera" | "library";

/** On phones the browser opens the camera; on laptops it opens a file picker. */
export async function pickPhoto(source: PhotoSource): Promise<string | null> {
  const options: ImagePicker.ImagePickerOptions = { mediaTypes: ["images"], quality: 0.8 };
  let result: ImagePicker.ImagePickerResult;
  try {
    result = source === "camera"
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);
  } catch (e) {
    // The picker rejects non-image files itself; reword its message for players.
    if (e instanceof Error && /unsupported file type/i.test(e.message)) {
      throw new Error("That file isn't a photo. Choose a JPG, PNG or HEIC image of the monument.");
    }
    throw new Error("Couldn't read that file. Try a different photo.");
  }
  const asset = result.canceled ? undefined : result.assets[0];
  if (!asset?.uri) return null;
  checkPickedFile(asset);
  return preparePhoto(asset.uri);
}

const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

/** Rejects files that aren't images or are too big to handle. */
export function checkPickedFile(asset: { mimeType?: string | null; fileSize?: number | null; uri: string }) {
  const type = asset.mimeType ?? (asset.uri.startsWith("data:") ? asset.uri.slice(5, asset.uri.indexOf(";")) : "");
  if (type && !type.startsWith("image/")) {
    throw new Error("That file isn't a photo. Choose a JPG, PNG or HEIC image of the monument.");
  }
  if (asset.fileSize && asset.fileSize > MAX_UPLOAD_BYTES) {
    throw new Error("That photo is too large (over 15 MB). Choose a smaller one.");
  }
}

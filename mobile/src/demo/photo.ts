import * as ImagePicker from "expo-image-picker";

/** Native: keep the picked file URI as-is. */
export async function preparePhoto(uri: string): Promise<string> {
  return uri;
}

export type PhotoSource = "camera" | "library";

/** Opens the camera (or photo library) and returns a storable photo, or null if cancelled. */
export async function pickPhoto(source: PhotoSource): Promise<string | null> {
  if (source === "camera") {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) throw new Error("Camera permission is needed to photograph the monument.");
  }
  const options: ImagePicker.ImagePickerOptions = { mediaTypes: ["images"], quality: 0.7, allowsEditing: false };
  const result = source === "camera"
    ? await ImagePicker.launchCameraAsync(options)
    : await ImagePicker.launchImageLibraryAsync(options);
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

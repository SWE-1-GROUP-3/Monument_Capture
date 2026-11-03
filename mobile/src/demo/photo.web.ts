import * as ImagePicker from "expo-image-picker";

const MAX_SIDE = 960;

/**
 * Web: shrink the photo and turn it into a JPEG data URL, so it can be kept in
 * localStorage (which only holds a few MB) and survives a page refresh.
 */
export async function preparePhoto(uri: string): Promise<string> {
  try {
    const img = new Image();
    img.src = uri;
    await img.decode();
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
  const result = source === "camera"
    ? await ImagePicker.launchCameraAsync(options)
    : await ImagePicker.launchImageLibraryAsync(options);
  const uri = result.canceled ? undefined : result.assets[0]?.uri;
  return uri ? preparePhoto(uri) : null;
}

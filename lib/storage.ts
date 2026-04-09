import { supabase } from "./supabase";
import { decode } from "base64-arraybuffer";
import * as FileSystem from "expo-file-system";

/**
 * Upload a local file URI to Supabase Storage and return the public URL.
 *
 * Files are stored under: event-media/{userId}/{timestamp}-{random}.{ext}
 */
export async function uploadMediaToSupabase(
  localUri: string,
  userId: string
): Promise<string> {
  // Read file as base64
  const base64 = await FileSystem.readAsStringAsync(localUri, {
    encoding: "base64",
  });

  // Determine file extension and MIME type
  const ext = localUri.split(".").pop()?.toLowerCase() ?? "jpg";
  const mimeMap: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
    mp4: "video/mp4",
    mov: "video/quicktime",
  };
  const contentType = mimeMap[ext] ?? "application/octet-stream";
  const isVideo = contentType.startsWith("video");

  // Create a unique path
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const filePath = `${userId}/${timestamp}-${random}.${ext}`;

  // Upload to Supabase Storage
  const { data, error } = await supabase.storage
    .from("event-media")
    .upload(filePath, decode(base64), {
      contentType,
      upsert: false,
    });

  if (error) throw error;

  // Get public URL
  const {
    data: { publicUrl },
  } = supabase.storage.from("event-media").getPublicUrl(data.path);

  return publicUrl;
}

/**
 * Upload multiple media files and return an array of public URLs.
 */
export async function uploadMultipleMedia(
  uris: string[],
  userId: string,
  onProgress?: (completed: number, total: number) => void
): Promise<{ url: string; type: "photo" | "video" }[]> {
  const results: { url: string; type: "photo" | "video" }[] = [];

  for (let i = 0; i < uris.length; i++) {
    const uri = uris[i];
    const ext = uri.split(".").pop()?.toLowerCase() ?? "jpg";
    const isVideo = ["mp4", "mov", "avi"].includes(ext);

    const publicUrl = await uploadMediaToSupabase(uri, userId);
    results.push({ url: publicUrl, type: isVideo ? "video" : "photo" });

    onProgress?.(i + 1, uris.length);
  }

  return results;
}

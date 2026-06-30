import { supabase } from "./supabase";

const BUCKET = "user-files";

export const MAX_FILE_SIZE = 10 * 1024 * 1024;
export const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/png"];
export const ALLOWED_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png"];

export function validateFile(file) {
  if (file.size > MAX_FILE_SIZE) {
    return `File is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum size is 10 MB.`;
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return "Only PDF, JPG, and PNG files are allowed.";
  }
  return null;
}

export function fileTypeLabel(fileType) {
  if (fileType === "application/pdf") return "PDF";
  if (fileType === "image/jpeg") return "JPG";
  if (fileType === "image/png") return "PNG";
  return fileType?.split("/")[1]?.toUpperCase() || "FILE";
}

export function fileTypeIcon(fileType) {
  if (fileType === "application/pdf") return "📄";
  if (fileType?.startsWith("image/")) return "🖼️";
  return "📎";
}

export function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function mapFile(row) {
  return {
    id: row.id,
    fileName: row.file_name,
    storageName: row.storage_name,
    fileSize: row.file_size,
    fileType: row.file_type,
    storagePath: row.storage_path,
    downloadUrl: row.download_url,
    createdAt: row.created_at,
  };
}

export async function uploadFile(uid, file, onProgress) {
  const ext = file.name.includes(".") ? "." + file.name.split(".").pop() : "";
  const baseName = file.name.includes(".") ? file.name.slice(0, file.name.lastIndexOf(".")) : file.name;
  const storageName = `${baseName}_${Date.now()}${ext}`;
  const storagePath = `${uid}/${storageName}`;

  if (onProgress) onProgress(10);

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, file, { contentType: file.type, upsert: false });
  if (uploadError) throw new Error(uploadError.message);

  if (onProgress) onProgress(80);

  const { data: { publicUrl: downloadUrl } } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);

  const { data, error: insertError } = await supabase.from("user_files").insert({
    uid,
    file_name: file.name,
    storage_name: storageName,
    file_size: file.size,
    file_type: file.type,
    storage_path: storagePath,
    download_url: downloadUrl,
  }).select().single();
  if (insertError) throw new Error(insertError.message);

  if (onProgress) onProgress(100);
  return data.id;
}

export function subscribeFiles(uid, callback) {
  let active = true;

  async function fetch() {
    const { data } = await supabase
      .from("user_files")
      .select("*")
      .eq("uid", uid)
      .order("created_at", { ascending: false });
    if (active) callback((data || []).map(mapFile));
  }

  fetch();

  const channel = supabase
    .channel(`user-files-${uid}`)
    .on("postgres_changes", {
      event: "*",
      schema: "public",
      table: "user_files",
      filter: `uid=eq.${uid}`,
    }, fetch)
    .subscribe();

  return () => { active = false; supabase.removeChannel(channel); };
}

export async function deleteFile(uid, fileId, storagePath) {
  await supabase.storage.from(BUCKET).remove([storagePath]);
  const { error } = await supabase.from("user_files").delete().eq("id", fileId);
  if (error) throw new Error(error.message);
}

import { supabase, COHORT_ID } from "./supabase";

const BUCKET = "gallery";

function mapPhoto(row) {
  return {
    id: row.id,
    url: row.url,
    storagePath: row.storage_path,
    city: row.city,
    uploaderUid: row.uploader_uid,
    uploaderName: row.uploader_name,
    createdAt: row.created_at,
    likes: (row.photo_likes || []).map((l) => l.uid),
  };
}

export function subscribePhotos(onData, city = null) {
  let active = true;

  async function fetch() {
    let q = supabase
      .from("photos")
      .select("*, photo_likes(uid)")
      .eq("cohort_id", COHORT_ID)
      .order("created_at", { ascending: false });
    if (city) q = q.eq("city", city);
    const { data } = await q;
    if (active) onData((data || []).map(mapPhoto));
  }

  fetch();

  const channel = supabase
    .channel(`photos-${COHORT_ID}-${city || "all"}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "photos" }, fetch)
    .on("postgres_changes", { event: "*", schema: "public", table: "photo_likes" }, fetch)
    .subscribe();

  return () => {
    active = false;
    supabase.removeChannel(channel);
  };
}

export async function uploadPhoto(file, { city, uploaderUid, uploaderName }, onProgress) {
  if (!file.type.startsWith("image/")) throw new Error("Only image files are allowed.");
  if (file.size > 10 * 1024 * 1024) throw new Error("Photos must be under 10 MB.");

  const ext = file.name.split(".").pop();
  const storagePath = `${COHORT_ID}/${uploaderUid}/${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, file, { contentType: file.type, upsert: false });
  if (uploadError) throw new Error(uploadError.message);

  if (onProgress) onProgress(100);

  const { data: { publicUrl: url } } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);

  const { error: insertError } = await supabase.from("photos").insert({
    cohort_id: COHORT_ID,
    url,
    storage_path: storagePath,
    city,
    uploader_uid: uploaderUid,
    uploader_name: uploaderName,
  });
  if (insertError) throw new Error(insertError.message);
}

export async function toggleLike(photoId, uid, liked) {
  if (liked) {
    await supabase.from("photo_likes").delete().match({ photo_id: photoId, uid });
  } else {
    await supabase.from("photo_likes").insert({ photo_id: photoId, uid });
  }
}

export async function deletePhoto(photo) {
  await supabase.storage.from(BUCKET).remove([photo.storagePath]);
  await supabase.from("photos").delete().eq("id", photo.id);
}

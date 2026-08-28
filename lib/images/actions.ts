"use server";

import { requireSession } from "@/lib/auth/require-session";
import { getSupabaseClient } from "@/lib/database/client";
import { getSupabaseStorageBucket } from "@/lib/constants/env";
import {
  buildImageStoragePath,
  validateImageFile,
  type AllowedImageMimeType,
} from "@/lib/validation/image";
import type { ImageActionState } from "@/lib/images/types";

const UPLOAD_FAILED = "The image could not be uploaded. Try again.";
const IMAGE_ORIGINAL_NAME_MAX = 255;

function readImageFile(formData: FormData): File | null {
  const value = formData.get("image");
  if (value instanceof File && value.size > 0) {
    return value;
  }
  return null;
}

function storage() {
  return getSupabaseClient().storage.from(getSupabaseStorageBucket());
}

/**
 * Best-effort deletion of a stored image object. A failure is logged but
 * never surfaced to the user (SPEC.md section 21.4) — the recipe-level
 * change it accompanies has already succeeded.
 */
export async function deleteRecipeImageObject(path: string | null): Promise<void> {
  if (!path) return;
  const { error } = await storage().remove([path]);
  if (error) {
    console.error("deleteRecipeImageObject: storage cleanup failed", path, error);
  }
}

async function putObjectAndReference(
  recipeId: string,
  file: File,
  mimeType: AllowedImageMimeType
): Promise<{ ok: true; path: string } | { ok: false; message: string }> {
  const supabase = getSupabaseClient();
  const path = buildImageStoragePath(recipeId, mimeType);

  const uploaded = await supabase.storage
    .from(getSupabaseStorageBucket())
    .upload(path, file, { contentType: mimeType, upsert: false });
  if (uploaded.error) {
    console.error("uploadRecipeImage: storage upload failed", uploaded.error);
    return { ok: false, message: UPLOAD_FAILED };
  }

  const { error: updateError } = await supabase
    .from("recipes")
    .update({
      image_storage_path: path,
      image_original_name: file.name.slice(0, IMAGE_ORIGINAL_NAME_MAX),
      image_mime_type: mimeType,
    })
    .eq("id", recipeId);

  if (updateError) {
    // Roll back the just-uploaded object so it does not leak.
    await deleteRecipeImageObject(path);
    console.error("uploadRecipeImage: reference update failed", updateError);
    return { ok: false, message: UPLOAD_FAILED };
  }

  return { ok: true, path };
}

async function currentImagePath(recipeId: string): Promise<string | null> {
  const { data, error } = await getSupabaseClient()
    .from("recipes")
    .select("image_storage_path")
    .eq("id", recipeId)
    .maybeSingle();
  if (error || !data) return null;
  return (data as { image_storage_path: string | null }).image_storage_path;
}

/** Uploads the first image for a recipe (SPEC.md sections 21.1, 24.3). */
export async function uploadRecipeImage(
  recipeId: string,
  formData: FormData
): Promise<ImageActionState> {
  await requireSession();

  const file = readImageFile(formData);
  if (!file) {
    return { status: "error", message: UPLOAD_FAILED };
  }

  const validation = validateImageFile({ type: file.type, size: file.size });
  if (!validation.ok) {
    return { status: "error", message: validation.message };
  }

  const result = await putObjectAndReference(recipeId, file, validation.mimeType);
  return result.ok ? { status: "success" } : { status: "error", message: result.message };
}

/**
 * Replaces a recipe's image (SPEC.md section 21.2): upload and validate the
 * new object, point the recipe at it, then delete the previous object. If
 * any step before the reference update fails, the old image is left intact.
 */
export async function replaceRecipeImage(
  recipeId: string,
  formData: FormData
): Promise<ImageActionState> {
  await requireSession();

  const file = readImageFile(formData);
  if (!file) {
    return { status: "error", message: UPLOAD_FAILED };
  }

  const validation = validateImageFile({ type: file.type, size: file.size });
  if (!validation.ok) {
    return { status: "error", message: validation.message };
  }

  const previousPath = await currentImagePath(recipeId);

  const result = await putObjectAndReference(recipeId, file, validation.mimeType);
  if (!result.ok) {
    return { status: "error", message: result.message };
  }

  if (previousPath && previousPath !== result.path) {
    await deleteRecipeImageObject(previousPath);
  }

  return { status: "success" };
}

/** Removes a recipe's image (SPEC.md section 21.3). */
export async function removeRecipeImage(recipeId: string): Promise<ImageActionState> {
  await requireSession();

  const previousPath = await currentImagePath(recipeId);

  const { error } = await getSupabaseClient()
    .from("recipes")
    .update({
      image_storage_path: null,
      image_original_name: null,
      image_mime_type: null,
    })
    .eq("id", recipeId);

  if (error) {
    console.error("removeRecipeImage: reference clear failed", error);
    return { status: "error", message: "The image could not be removed. Try again." };
  }

  await deleteRecipeImageObject(previousPath);
  return { status: "success" };
}

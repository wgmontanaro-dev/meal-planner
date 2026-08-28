import { randomUUID } from "node:crypto";

// SPEC.md section 11.7 / 21.1: recipe images are optional, at most one per
// recipe, JPEG/PNG/WebP only, validated on the server by MIME type and size.
export const ALLOWED_IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export type AllowedImageMimeType = (typeof ALLOWED_IMAGE_MIME_TYPES)[number];

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB — "reasonable maximum" (SPEC.md 11.7)
export const MAX_IMAGE_LABEL = "5 MB";

// SPEC.md section 23.1 wording.
export const IMAGE_TYPE_MESSAGE = "The image must be a JPEG, PNG or WebP file.";
export const IMAGE_SIZE_MESSAGE = `The image must be ${MAX_IMAGE_LABEL} or smaller.`;

const EXTENSION_BY_MIME: Record<AllowedImageMimeType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export function isAllowedImageMimeType(value: string): value is AllowedImageMimeType {
  return (ALLOWED_IMAGE_MIME_TYPES as readonly string[]).includes(value);
}

type ImageFileFacts = { type: string; size: number };

export type ImageValidationResult =
  | { ok: true; mimeType: AllowedImageMimeType }
  | { ok: false; message: string };

/** Validates an uploaded file's MIME type and size (SPEC.md sections 11.7, 21.1). */
export function validateImageFile(file: ImageFileFacts): ImageValidationResult {
  if (!isAllowedImageMimeType(file.type)) {
    return { ok: false, message: IMAGE_TYPE_MESSAGE };
  }
  if (file.size <= 0 || file.size > MAX_IMAGE_BYTES) {
    return { ok: false, message: IMAGE_SIZE_MESSAGE };
  }
  return { ok: true, mimeType: file.type };
}

/**
 * Builds the object path for a recipe image. The client-provided filename is
 * never used as a storage path (SPEC.md section 21.1): the name is a random
 * UUID under a per-recipe prefix, with the extension derived from the
 * validated MIME type.
 */
export function buildImageStoragePath(recipeId: string, mimeType: AllowedImageMimeType): string {
  return `${recipeId}/${randomUUID()}.${EXTENSION_BY_MIME[mimeType]}`;
}

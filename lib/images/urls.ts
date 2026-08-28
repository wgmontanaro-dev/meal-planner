import "server-only";

import { getSupabaseClient } from "@/lib/database/client";
import { getSupabaseStorageBucket } from "@/lib/constants/env";
import type { RecipeImageUrls } from "@/lib/images/types";

export type { RecipeImageUrls };

const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 hour

// Thumbnail rendition kept small so a large library never downloads full
// images into every row (SPEC.md sections 11.7, 27.4). If the Supabase
// project has image transformations disabled the signed URL simply serves
// the original — acceptable degradation, documented in the README.
const THUMB_TRANSFORM = { width: 192, height: 192, resize: "cover" } as const;
const FULL_TRANSFORM = { width: 1400, resize: "contain" } as const;

/**
 * Returns short-lived signed URLs for a recipe image: a small thumbnail
 * rendition and a larger one for the enlarged preview (SPEC.md sections
 * 12.8, 21.1). Returns null when the path is empty or signing fails.
 */
export async function signRecipeImageUrls(
  imageStoragePath: string | null
): Promise<RecipeImageUrls | null> {
  if (!imageStoragePath) {
    return null;
  }

  const storage = getSupabaseClient().storage.from(getSupabaseStorageBucket());

  const [thumb, full] = await Promise.all([
    storage.createSignedUrl(imageStoragePath, SIGNED_URL_TTL_SECONDS, {
      transform: THUMB_TRANSFORM,
    }),
    storage.createSignedUrl(imageStoragePath, SIGNED_URL_TTL_SECONDS, {
      transform: FULL_TRANSFORM,
    }),
  ]);

  if (thumb.error || full.error || !thumb.data || !full.data) {
    console.error("signRecipeImageUrls: could not sign", thumb.error ?? full.error);
    return null;
  }

  return { thumbUrl: thumb.data.signedUrl, fullUrl: full.data.signedUrl };
}

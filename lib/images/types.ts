export type ImageActionState = {
  status: "idle" | "error" | "success";
  message?: string;
};

export const initialImageActionState: ImageActionState = { status: "idle" };

// Short-lived signed URLs for a stored recipe image: a small thumbnail
// rendition and a larger one for the enlarged preview (SPEC.md section 12.8).
export type RecipeImageUrls = {
  thumbUrl: string;
  fullUrl: string;
};

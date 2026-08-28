import { describe, it, expect, vi, beforeEach } from "vitest";

// Mutable per-test responses for the Supabase stubs.
let updateResult: { error: unknown } = { error: null };
let selectResult: { data: { image_storage_path: string | null } | null; error: unknown } = {
  data: { image_storage_path: null },
  error: null,
};
let uploadResult: { error: unknown } = { error: null };
let removeResult: { error: unknown } = { error: null };

const tableApi = {
  update: vi.fn(() => tableApi),
  select: vi.fn(() => tableApi),
  eq: vi.fn(() => tableApi),
  maybeSingle: vi.fn(() => Promise.resolve(selectResult)),
  then: (resolve: (value: unknown) => unknown) => resolve(updateResult),
};
const storageApi = {
  upload: vi.fn<
    (path: string, file: unknown, options: { contentType: string; upsert: boolean }) => Promise<{ error: unknown }>
  >(() => Promise.resolve(uploadResult)),
  remove: vi.fn<(paths: string[]) => Promise<{ error: unknown }>>(() =>
    Promise.resolve(removeResult)
  ),
};
const from = vi.fn(() => tableApi);
const storageFrom = vi.fn(() => storageApi);

vi.mock("@/lib/database/client", () => ({
  getSupabaseClient: () => ({ from, storage: { from: storageFrom } }),
}));
vi.mock("@/lib/constants/env", () => ({ getSupabaseStorageBucket: () => "recipe-images" }));
vi.mock("@/lib/auth/require-session", () => ({ requireSession: vi.fn(async () => {}) }));

const { uploadRecipeImage, replaceRecipeImage, removeRecipeImage } = await import("./actions");

const RECIPE_ID = "3f1a9b2c-4d5e-6f70-8192-a3b4c5d6e7f8";

function formDataWith(file: File | null): FormData {
  const fd = new FormData();
  if (file) fd.set("image", file);
  return fd;
}

function pngFile(name = "photo.png", bytes = 2048): File {
  return new File([new Uint8Array(bytes)], name, { type: "image/png" });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  updateResult = { error: null };
  selectResult = { data: { image_storage_path: null }, error: null };
  uploadResult = { error: null };
  removeResult = { error: null };
});

describe("uploadRecipeImage (SPEC 21.1)", () => {
  it("rejects an unsupported file without touching storage", async () => {
    const gif = new File([new Uint8Array(16)], "x.gif", { type: "image/gif" });
    const result = await uploadRecipeImage(RECIPE_ID, formDataWith(gif));

    expect(result.status).toBe("error");
    expect(storageApi.upload).not.toHaveBeenCalled();
  });

  it("uploads under a generated path then records the reference", async () => {
    const result = await uploadRecipeImage(RECIPE_ID, formDataWith(pngFile()));
    expect(result.status).toBe("success");

    const [path, , options] = storageApi.upload.mock.calls[0];
    expect(path.startsWith(`${RECIPE_ID}/`)).toBe(true);
    expect(path.endsWith(".png")).toBe(true);
    expect(options).toEqual({ contentType: "image/png", upsert: false });

    expect(tableApi.update).toHaveBeenCalledWith({
      image_storage_path: path,
      image_original_name: "photo.png",
      image_mime_type: "image/png",
    });
  });

  it("removes the just-uploaded object if the reference update fails", async () => {
    updateResult = { error: { message: "db down" } };

    const result = await uploadRecipeImage(RECIPE_ID, formDataWith(pngFile()));
    expect(result.status).toBe("error");

    const uploadedPath = storageApi.upload.mock.calls[0][0];
    expect(storageApi.remove).toHaveBeenCalledWith([uploadedPath]);
  });
});

describe("removeRecipeImage (SPEC 21.3)", () => {
  it("clears every image column then deletes the stored object", async () => {
    selectResult = { data: { image_storage_path: "old/pic.png" }, error: null };

    const result = await removeRecipeImage(RECIPE_ID);
    expect(result.status).toBe("success");
    expect(tableApi.update).toHaveBeenCalledWith({
      image_storage_path: null,
      image_original_name: null,
      image_mime_type: null,
    });
    expect(storageApi.remove).toHaveBeenCalledWith(["old/pic.png"]);
  });
});

describe("replaceRecipeImage (SPEC 21.2)", () => {
  it("deletes the previous object only after the new one is stored and referenced", async () => {
    selectResult = { data: { image_storage_path: "old/pic.png" }, error: null };

    const result = await replaceRecipeImage(RECIPE_ID, formDataWith(pngFile("new.png")));
    expect(result.status).toBe("success");
    expect(storageApi.upload).toHaveBeenCalledTimes(1);
    expect(storageApi.remove).toHaveBeenCalledWith(["old/pic.png"]);
  });

  it("keeps the previous image when the new upload fails", async () => {
    selectResult = { data: { image_storage_path: "old/pic.png" }, error: null };
    uploadResult = { error: { message: "upload failed" } };

    const result = await replaceRecipeImage(RECIPE_ID, formDataWith(pngFile("new.png")));
    expect(result.status).toBe("error");
    expect(storageApi.remove).not.toHaveBeenCalledWith(["old/pic.png"]);
  });
});

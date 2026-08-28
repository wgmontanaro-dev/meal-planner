import { describe, it, expect } from "vitest";
import {
  buildImageStoragePath,
  isAllowedImageMimeType,
  validateImageFile,
  MAX_IMAGE_BYTES,
  IMAGE_TYPE_MESSAGE,
  IMAGE_SIZE_MESSAGE,
} from "./image";

const RECIPE_ID = "3f1a9b2c-4d5e-6f70-8192-a3b4c5d6e7f8";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

describe("validateImageFile (SPEC 11.7 / 21.1)", () => {
  it("accepts JPEG, PNG and WebP within the size limit", () => {
    for (const type of ["image/jpeg", "image/png", "image/webp"]) {
      expect(validateImageFile({ type, size: 1024 })).toEqual({ ok: true, mimeType: type });
    }
  });

  it("accepts a file exactly at the maximum size", () => {
    expect(validateImageFile({ type: "image/png", size: MAX_IMAGE_BYTES }).ok).toBe(true);
  });

  it("rejects an unsupported MIME type", () => {
    expect(validateImageFile({ type: "image/gif", size: 1024 })).toEqual({
      ok: false,
      message: IMAGE_TYPE_MESSAGE,
    });
    expect(validateImageFile({ type: "", size: 1024 }).ok).toBe(false);
  });

  it("rejects an empty or oversized file", () => {
    expect(validateImageFile({ type: "image/png", size: 0 })).toEqual({
      ok: false,
      message: IMAGE_SIZE_MESSAGE,
    });
    expect(validateImageFile({ type: "image/png", size: MAX_IMAGE_BYTES + 1 })).toEqual({
      ok: false,
      message: IMAGE_SIZE_MESSAGE,
    });
  });
});

describe("isAllowedImageMimeType", () => {
  it("is true only for the three allowed types", () => {
    expect(isAllowedImageMimeType("image/webp")).toBe(true);
    expect(isAllowedImageMimeType("image/svg+xml")).toBe(false);
  });
});

describe("buildImageStoragePath (SPEC 21.1)", () => {
  it("namespaces under the recipe id with a random uuid and mime-derived extension", () => {
    const path = buildImageStoragePath(RECIPE_ID, "image/jpeg");
    expect(path.startsWith(`${RECIPE_ID}/`)).toBe(true);
    expect(path.endsWith(".jpg")).toBe(true);
    const name = path.slice(RECIPE_ID.length + 1, -".jpg".length);
    expect(name).toMatch(UUID_RE);
  });

  it("maps each mime type to its conventional extension", () => {
    expect(buildImageStoragePath(RECIPE_ID, "image/png").endsWith(".png")).toBe(true);
    expect(buildImageStoragePath(RECIPE_ID, "image/webp").endsWith(".webp")).toBe(true);
  });

  it("produces a fresh unpredictable name each call", () => {
    expect(buildImageStoragePath(RECIPE_ID, "image/png")).not.toBe(
      buildImageStoragePath(RECIPE_ID, "image/png")
    );
  });
});

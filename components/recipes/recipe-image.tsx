"use client";

import { useState } from "react";
import { ImageIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { RecipeImageUrls } from "@/lib/images/types";

const SIZE_CLASS = {
  sm: "size-12",
  md: "size-16",
  lg: "size-40",
  cover: "aspect-video w-full",
} as const;

/**
 * Recipe image thumbnail with an enlarged, dismissible preview (SPEC.md
 * sections 11.7, 12.8). Rendered as a real button that stops event
 * propagation so tapping it never follows a surrounding row link or the
 * recipe's source link.
 */
export function RecipeImageThumbnail({
  urls,
  title,
  size = "sm",
  fallback,
  className,
}: {
  urls: RecipeImageUrls | null;
  title: string;
  size?: keyof typeof SIZE_CLASS;
  /** Bundled illustration shown when no image has been uploaded. */
  fallback?: { src: string; alt: string };
  /** Extra classes on the outer wrapper (e.g. to override the cover height). */
  className?: string;
}) {
  const [previewOpen, setPreviewOpen] = useState(false);

  const isCover = size === "cover";

  if (!urls) {
    if (fallback) {
      return (
        <div
          className={cn(
            "overflow-hidden bg-muted",
            isCover ? "" : "shrink-0 rounded-lg border border-border",
            SIZE_CLASS[size],
            className
          )}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- bundled SVG in /public, next/image adds no value */}
          <img src={fallback.src} alt={fallback.alt} className="size-full object-cover" />
        </div>
      );
    }
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-muted text-muted-foreground",
          isCover ? "" : "shrink-0 rounded-lg",
          SIZE_CLASS[size],
          className
        )}
        aria-hidden="true"
      >
        <ImageIcon className={isCover ? "size-8" : "size-5"} />
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setPreviewOpen(true);
        }}
        className={cn(
          "overflow-hidden focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
          isCover ? "block" : "shrink-0 rounded-lg border border-border",
          SIZE_CLASS[size],
          className
        )}
        aria-label={`Enlarge image of ${title}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- signed Supabase Storage URL, not a static asset */}
        <img src={urls.thumbUrl} alt={title} className="size-full object-cover" />
      </button>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="w-full max-w-3xl p-4">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription className="sr-only">Enlarged recipe image</DialogDescription>
          </DialogHeader>
          {/* eslint-disable-next-line @next/next/no-img-element -- signed Supabase Storage URL, not a static asset */}
          <img
            src={urls.fullUrl}
            alt={title}
            className="max-h-[75vh] w-full rounded-lg object-contain"
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

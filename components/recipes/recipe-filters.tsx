"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { FilterIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  FilterFields,
  FILTER_PARAM_KEYS,
  type FilterKey,
  type DraftFilters,
} from "@/components/recipes/filter-fields";
import { MOBILE_ONLY_DIALOG_CONTENT_CLASS } from "@/components/shared/dialog-classes";
import type { RecipeFilters as RecipeFilterValues } from "@/lib/recipes/types";

function buildHref(pathname: string, filters: DraftFilters): string {
  const params = new URLSearchParams();
  for (const key of FILTER_PARAM_KEYS) {
    const value = filters[key];
    if (value) {
      params.set(key, value);
    }
  }
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function RecipeFilters({ filters }: { filters: RecipeFilterValues }) {
  const router = useRouter();
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [draft, setDraft] = useState<DraftFilters>(filters);

  const activeCount = FILTER_PARAM_KEYS.filter((key) => filters[key]).length;

  function updateDraft(key: FilterKey, value: string | undefined) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function applyDesktopFilter(key: FilterKey, value: string | undefined) {
    router.push(buildHref(pathname, { ...filters, [key]: value }));
  }

  function applyDrawerFilters() {
    router.push(buildHref(pathname, draft));
    setDrawerOpen(false);
  }

  function clearAll() {
    router.push(pathname);
    setDraft({});
    setDrawerOpen(false);
  }

  return (
    <div>
      {/* Mobile: filter drawer, applied via an explicit "Show results" action. */}
      <div className="sm:hidden">
        <Dialog
          open={drawerOpen}
          onOpenChange={(next) => {
            setDrawerOpen(next);
            if (next) {
              setDraft(filters);
            }
          }}
        >
          <DialogTrigger
            render={
              <Button variant="outline" size="sm">
                <FilterIcon aria-hidden="true" />
                Filters{activeCount > 0 ? ` (${activeCount})` : ""}
              </Button>
            }
          />
          <DialogContent className={MOBILE_ONLY_DIALOG_CONTENT_CLASS}>
            <div className="flex flex-col gap-6 p-4">
              <DialogHeader>
                <DialogTitle>Filter recipes</DialogTitle>
              </DialogHeader>
              <FilterFields filters={draft} onChange={updateDraft} />
              <div className="-mx-4 -mb-4 flex flex-col-reverse gap-2 rounded-b-xl border-t bg-muted/50 p-4">
                <Button type="button" variant="outline" onClick={clearAll}>
                  Clear filters
                </Button>
                <Button type="button" onClick={applyDrawerFilters}>
                  Show results
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tablet and desktop: inline controls that apply immediately. */}
      <div className="hidden items-end gap-3 sm:flex sm:flex-wrap">
        <FilterFields filters={filters} onChange={applyDesktopFilter} />
        {activeCount > 0 ? (
          <Button type="button" variant="ghost" size="sm" onClick={clearAll}>
            <XIcon aria-hidden="true" />
            Clear filters
          </Button>
        ) : null}
      </div>
    </div>
  );
}

import Link from "next/link";
import { ImageIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  CUISINE_LABELS,
  DIET_TYPE_LABELS,
  PREP_TIME_LABELS,
  STORAGE_TYPE_LABELS,
  CHILD_FRIENDLY_LABELS,
  PREPARATION_TYPE_LABELS,
} from "@/lib/constants/categories";
import type { Recipe } from "@/lib/database/types";

// Recipe images are implemented in Stage 6; every recipe shows the
// placeholder until then.
function Thumbnail() {
  return (
    <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
      <ImageIcon className="size-5" aria-hidden="true" />
    </div>
  );
}

function SourceLink({ sourceUrl }: { sourceUrl: string | null }) {
  if (!sourceUrl) {
    return <span className="text-sm text-muted-foreground">No source</span>;
  }
  return (
    <a
      href={sourceUrl}
      target="_blank"
      rel="noopener noreferrer"
      title={sourceUrl}
      className="text-sm text-primary underline-offset-4 hover:underline"
    >
      View source
    </a>
  );
}

export function RecipeLibrary({ recipes }: { recipes: Recipe[] }) {
  return (
    <>
      {/* Mobile: summary cards. */}
      <ul className="flex flex-col gap-3 sm:hidden">
        {recipes.map((recipe) => (
          <li
            key={recipe.id}
            className="flex items-start gap-3 rounded-xl border border-border p-3"
          >
            <Thumbnail />
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <Link
                href={`/recipes/${recipe.id}`}
                className="font-medium underline-offset-4 hover:underline"
              >
                {recipe.title}
              </Link>
              <div className="flex flex-wrap gap-1">
                <Badge variant="outline">{PREP_TIME_LABELS[recipe.prepTimeCategory]}</Badge>
                <Badge variant="outline">{CUISINE_LABELS[recipe.cuisine]}</Badge>
                <Badge variant="outline">{DIET_TYPE_LABELS[recipe.dietType]}</Badge>
              </div>
              <SourceLink sourceUrl={recipe.sourceUrl} />
            </div>
          </li>
        ))}
      </ul>

      {/* Tablet and desktop: table. */}
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="py-2 pr-3 font-medium">Recipe</th>
              <th className="py-2 pr-3 font-medium">Prep time</th>
              <th className="py-2 pr-3 font-medium">Cuisine</th>
              <th className="py-2 pr-3 font-medium">Storage</th>
              <th className="py-2 pr-3 font-medium">Diet</th>
              <th className="py-2 pr-3 font-medium">Child-friendly</th>
              <th className="py-2 pr-3 font-medium">Preparation</th>
              <th className="py-2 pr-3 font-medium">Source</th>
            </tr>
          </thead>
          <tbody>
            {recipes.map((recipe) => (
              <tr key={recipe.id} className="border-b last:border-0">
                <td className="py-2 pr-3">
                  <Link
                    href={`/recipes/${recipe.id}`}
                    className="flex items-center gap-3 font-medium underline-offset-4 hover:underline"
                  >
                    <Thumbnail />
                    {recipe.title}
                  </Link>
                </td>
                <td className="py-2 pr-3">{PREP_TIME_LABELS[recipe.prepTimeCategory]}</td>
                <td className="py-2 pr-3">{CUISINE_LABELS[recipe.cuisine]}</td>
                <td className="py-2 pr-3">{STORAGE_TYPE_LABELS[recipe.storageType]}</td>
                <td className="py-2 pr-3">{DIET_TYPE_LABELS[recipe.dietType]}</td>
                <td className="py-2 pr-3">{CHILD_FRIENDLY_LABELS[recipe.childFriendly]}</td>
                <td className="py-2 pr-3">{PREPARATION_TYPE_LABELS[recipe.preparationType]}</td>
                <td className="py-2 pr-3">
                  <SourceLink sourceUrl={recipe.sourceUrl} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

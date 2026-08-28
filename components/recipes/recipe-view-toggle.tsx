import Link from "next/link";
import { LayoutGrid, List } from "lucide-react";
import { cn } from "@/lib/utils";

export type RecipeView = "card" | "list";

/**
 * Card / list switch for the Recipe Library. The choice lives in the URL
 * (`?view=list`) so it survives refresh and sharing; the hrefs are built on
 * the server to preserve any active filter params.
 */
export function RecipeViewToggle({
  view,
  cardHref,
  listHref,
}: {
  view: RecipeView;
  cardHref: string;
  listHref: string;
}) {
  const items = [
    { key: "card" as const, label: "Card", href: cardHref, icon: LayoutGrid },
    { key: "list" as const, label: "List", href: listHref, icon: List },
  ];

  return (
    <div
      role="group"
      aria-label="Recipe view"
      className="flex items-center gap-1 rounded-full border border-border bg-muted p-1"
    >
      {items.map(({ key, label, href, icon: Icon }) => {
        const active = view === key;
        return (
          <Link
            key={key}
            href={href}
            aria-current={active ? "true" : undefined}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
              active
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="size-3.5" aria-hidden="true" />
            {label}
          </Link>
        );
      })}
    </div>
  );
}

import { CalendarDays, BookOpen, ShoppingBasket } from "lucide-react";

export const NAV_LINKS = [
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/recipes", label: "Recipes", icon: BookOpen },
  { href: "/shopping-list", label: "Shopping List", icon: ShoppingBasket },
] as const;

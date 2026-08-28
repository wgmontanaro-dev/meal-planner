import { CalendarDays, BookOpen } from "lucide-react";

export const NAV_LINKS = [
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/recipes", label: "Recipes", icon: BookOpen },
] as const;

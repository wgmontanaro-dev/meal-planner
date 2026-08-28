// Full-screen dialogue below the `sm:` breakpoint so complex forms never
// render in a cramped mobile popup (SPEC.md section 26.3); a conventional
// centred dialogue from `sm:` up. Shared by the recipe form dialog, the
// recipe filter drawer and the meal-slot dialog.
export const FORM_DIALOG_CONTENT_CLASS =
  "fixed inset-0 top-0 left-0 flex h-full max-h-full w-full max-w-full translate-x-0 translate-y-0 flex-col overflow-y-auto rounded-none p-0 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:h-auto sm:max-h-[calc(100vh-4rem)] sm:w-full sm:max-w-2xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl";

// Mobile-only full-screen variant (no sm: override) — used for drawers that
// are only ever presented as a mobile sheet, with desktop rendering inline
// controls instead of a dialogue at all.
export const MOBILE_ONLY_DIALOG_CONTENT_CLASS =
  "fixed inset-0 top-0 left-0 flex h-full max-h-full w-full max-w-full translate-x-0 translate-y-0 flex-col overflow-y-auto rounded-none p-0";

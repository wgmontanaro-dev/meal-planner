import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { UtensilsCrossed, Info } from "lucide-react";
import { LoginForm } from "@/components/auth/login-form";
import { validateSession } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Log in — Meal Planner",
};

export default async function LoginPage() {
  if (await validateSession()) {
    redirect("/calendar");
  }

  return (
    <main className="flex min-h-screen flex-1 items-center justify-center p-4">
      <div className="w-full max-w-md rounded-xl border border-border/60 bg-card p-8 shadow-sm sm:p-10">
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex size-16 items-center justify-center rounded-full bg-muted text-primary">
            <UtensilsCrossed className="size-8" aria-hidden="true" />
          </div>
          <h1 className="font-heading text-4xl font-bold tracking-tight text-primary">Meal Planner</h1>
          <p className="mt-1 text-lg text-muted-foreground">Household Planner</p>
        </div>

        <LoginForm />

        <div className="mt-8 border-t border-border/60 pt-6 text-center">
          <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <Info className="size-4" aria-hidden="true" />
            Shared access requires your household password.
          </p>
        </div>
      </div>
    </main>
  );
}

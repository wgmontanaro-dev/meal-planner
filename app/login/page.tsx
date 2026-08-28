import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">Meal Planner</CardTitle>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
      </Card>
    </main>
  );
}

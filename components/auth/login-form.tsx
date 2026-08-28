"use client";

import { useActionState } from "react";
import { LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  authenticateSharedPassword,
  type LoginState,
} from "@/lib/auth/actions";

const initialState: LoginState = { status: "idle" };

export function LoginForm() {
  const [state, formAction, pending] = useActionState(
    authenticateSharedPassword,
    initialState
  );

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Household password</Label>
        <div className="relative">
          <LockKeyhole
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            autoFocus
            placeholder="Enter shared password"
            className="h-10 pl-9"
            aria-invalid={state.status === "error"}
            aria-describedby={
              state.status === "error" ? "password-error" : undefined
            }
          />
        </div>
        {state.status === "error" ? (
          <p id="password-error" role="alert" className="text-sm text-destructive">
            {state.message}
          </p>
        ) : null}
      </div>
      <Button type="submit" size="lg" disabled={pending} className="w-full">
        {pending ? "Checking…" : "Access meal planner"}
      </Button>
    </form>
  );
}

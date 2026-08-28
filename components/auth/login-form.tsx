"use client";

import { useActionState } from "react";
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
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          autoFocus
          aria-invalid={state.status === "error"}
          aria-describedby={
            state.status === "error" ? "password-error" : undefined
          }
        />
        {state.status === "error" ? (
          <p id="password-error" role="alert" className="text-sm text-destructive">
            {state.message}
          </p>
        ) : null}
      </div>
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Checking…" : "Access meal planner"}
      </Button>
    </form>
  );
}

"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { getAppSharedPassword } from "@/lib/constants/env";
import { createSession } from "@/lib/auth/session";

const loginSchema = z.object({
  password: z.string().min(1),
});

export type LoginState = {
  status: "idle" | "error";
  message?: string;
};

export async function authenticateSharedPassword(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { status: "error", message: "That password is not correct." };
  }

  if (parsed.data.password !== getAppSharedPassword()) {
    return { status: "error", message: "That password is not correct." };
  }

  await createSession();

  redirect("/calendar");
}

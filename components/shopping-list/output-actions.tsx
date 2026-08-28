"use client";

import { useState } from "react";
import { Copy, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

// SPEC.md section 20.8: copy a readable plain-text list to the clipboard
// (with a fallback message on failure) and print via the browser. The text
// is prepared server-side and passed in verbatim.
export function ShoppingListOutputActions({ text }: { text: string }) {
  const [message, setMessage] = useState<string | null>(null);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setMessage("Shopping list copied to the clipboard.");
    } catch {
      setMessage(
        "Couldn’t access the clipboard. Select the list below and copy it manually."
      );
    }
  }

  return (
    <div className="flex flex-col gap-2" data-print-hidden>
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" onClick={copy}>
          <Copy aria-hidden="true" />
          Copy to clipboard
        </Button>
        <Button type="button" variant="terracotta" size="sm" onClick={() => window.print()}>
          <Printer aria-hidden="true" />
          Print
        </Button>
      </div>
      {message ? (
        <p role="status" className="text-sm text-muted-foreground">
          {message}
        </p>
      ) : null}
    </div>
  );
}

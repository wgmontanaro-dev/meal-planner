"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ReceiptText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FORM_DIALOG_CONTENT_CLASS } from "@/components/shared/dialog-classes";
import { getRetentionBoundaryDate, getTodayIsoDateLondon } from "@/lib/dates/calendar";

// SPEC.md sections 20.1–20.2: entry point on the Calendar page that opens a
// start/end date dialogue. Client-side validation mirrors the server rules
// in lib/shopping-list/actions.ts (which stays authoritative).
export function ShoppingListDialog() {
  const router = useRouter();
  const today = getTodayIsoDateLondon();
  const earliest = getRetentionBoundaryDate();

  const [open, setOpen] = useState(false);
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!startDate || !endDate) {
      setError("Enter both a start and an end date.");
      return;
    }
    if (startDate > endDate) {
      setError("The start date must be on or before the end date.");
      return;
    }
    if (startDate < earliest) {
      setError("The start date can’t be before the earliest retained date.");
      return;
    }

    setError(null);
    setOpen(false);
    router.push(`/shopping-list?start=${startDate}&end=${endDate}`);
  }

  return (
    <>
      <Button type="button" variant="terracotta" size="sm" onClick={() => setOpen(true)}>
        <ReceiptText aria-hidden="true" />
        Generate shopping list
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className={FORM_DIALOG_CONTENT_CLASS}>
          <form onSubmit={handleSubmit} className="flex flex-col gap-6 p-4">
            <DialogHeader>
              <DialogTitle>Generate shopping list</DialogTitle>
              <DialogDescription>
                Choose an inclusive date range. Future dates are allowed; manual meals are
                not included.
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-2">
              <Label htmlFor="shopping-list-start">Start date</Label>
              <Input
                id="shopping-list-start"
                type="date"
                required
                min={earliest}
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="shopping-list-end">End date</Label>
              <Input
                id="shopping-list-end"
                type="date"
                required
                min={startDate || earliest}
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
              />
            </div>

            {error ? (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Generate</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

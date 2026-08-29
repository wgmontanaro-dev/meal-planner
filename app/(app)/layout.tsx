import { PrimaryNav } from "@/components/shared/primary-nav";
import { Toaster } from "@/components/ui/toast";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-1">
      <PrimaryNav />
      <main className="flex min-w-0 flex-1 flex-col pb-16 sm:pb-0">{children}</main>
      <Toaster />
    </div>
  );
}

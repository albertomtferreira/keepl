import { WifiOff } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Offline",
};

export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#fbfaf7] px-4 py-10 text-foreground">
      <div className="w-full max-w-sm rounded-lg border bg-white p-6 shadow-sm">
        <WifiOff className="mb-4 size-6 text-muted-foreground" aria-hidden="true" />
        <h1 className="text-xl font-semibold tracking-normal">You are offline</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Keepl can still open its installed shell. Reconnect to refresh people, memories, dates, and reminders.
        </p>
        <Button asChild className="mt-5 w-full">
          <Link href="/home">Return home</Link>
        </Button>
      </div>
    </main>
  );
}

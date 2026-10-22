"use client";
import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
export function LivePageRefresh() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  useEffect(() => {
    if (pending) return;
    const timer = setTimeout(() => {
      if (document.visibilityState === "visible")
        startTransition(() => router.refresh());
    }, 10_000);
    return () => clearTimeout(timer);
  }, [pending, router]);
  return (
    <div className="iw-live-refresh">
      <button
        disabled={pending}
        onClick={() => startTransition(() => router.refresh())}
      >
        {pending ? "Refreshing…" : "Refresh intelligence"}
      </button>
      <span>Updates every 10 seconds while visible</span>
    </div>
  );
}

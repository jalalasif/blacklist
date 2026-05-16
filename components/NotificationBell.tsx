"use client";

import { usePushSubscription } from "@/hooks/usePushSubscription";

export function NotificationBell() {
  const { supported, subscribed, loading, subscribe, unsubscribe } =
    usePushSubscription();

  if (!supported) return null;

  return (
    <button
      onClick={subscribed ? unsubscribe : subscribe}
      disabled={loading}
      title={subscribed ? "Disable reminders" : "Enable reminders"}
      className="text-[11px] font-medium tracking-[0.15em] uppercase text-black/40 hover:text-black transition-colors disabled:opacity-30"
    >
      {subscribed ? "Reminders On" : "Reminders Off"}
    </button>
  );
}

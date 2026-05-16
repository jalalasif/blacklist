"use client";

interface TagBadgeProps {
  name: string;
  color?: string;
  onRemove?: () => void;
  muted?: boolean;
}

export function TagBadge({ name, onRemove, muted }: TagBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium tracking-wide uppercase border transition-colors ${
        muted
          ? "border-black/20 text-black/40"
          : "border-black text-black"
      }`}
    >
      #{name}
      {onRemove && (
        <button
          onClick={onRemove}
          className="hover:opacity-50 transition-opacity leading-none ml-0.5"
          aria-label={`Remove tag ${name}`}
        >
          ×
        </button>
      )}
    </span>
  );
}

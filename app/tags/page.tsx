import { TagManager } from "@/components/tag/TagManager";
import Link from "next/link";

export default function TagsPage() {
  return (
    <div className="space-y-10">
      <div className="space-y-2">
        <Link
          href="/"
          className="text-[11px] tracking-[0.2em] uppercase text-black/40 hover:text-black transition-colors"
        >
          ← Back
        </Link>
        <h1 className="font-display text-3xl">Tags</h1>
        <p className="text-sm text-black/40">
          Create tags to organize your tasks.
        </p>
      </div>
      <TagManager />
    </div>
  );
}

"use client";

import { cn } from "@/lib/utils";

type Categorie = {
  id: string;
  label: string;
  labelMG?: string;
  icon: string;
};

export function POSCategorieBar({
  categories,
  active,
  onSelect,
}: {
  categories: Categorie[];
  active: string | null;
  onSelect: (id: string | null) => void;
}) {
  return (
    <div className="relative shrink-0 border-b border-[--pos-border] bg-[--pos-surface]">
      {/* Fade droite pour indiquer le scroll */}
      <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 z-10"
        style={{ background: "linear-gradient(to right, transparent, var(--pos-surface))" }}
      />
    <div className="flex items-center gap-2 px-4 py-2 overflow-x-auto no-scrollbar">
      <button
        onClick={() => onSelect(null)}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap shrink-0",
          "transition-all duration-150",
          active === null
            ? "bg-[--pos-primary] text-white"
            : "bg-[--pos-surface-hover] text-[--pos-text-muted] hover:bg-[--pos-border] hover:text-[--pos-text]"
        )}
      >
        <span>Tous</span>
      </button>
      {categories.map((cat) => (
        <button
          key={cat.id}
          onClick={() => onSelect(cat.id === active ? null : cat.id)}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap shrink-0",
            "transition-all duration-150",
            active === cat.id
              ? "bg-[--pos-primary] text-white"
              : "bg-[--pos-surface-hover] text-[--pos-text-muted] hover:bg-[--pos-border] hover:text-[--pos-text]"
          )}
        >
          <span>{cat.icon}</span>
          <span>{cat.label}</span>
        </button>
      ))}
    </div>
    </div>
  );
}

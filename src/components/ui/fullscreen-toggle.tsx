"use client";

import { useState, useEffect, useCallback } from "react";
import { Maximize2, Minimize2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  iconOnly?: boolean;
};

export function FullscreenToggle({ className, iconOnly = false }: Props) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const toggle = useCallback(async () => {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen().catch(() => {});
    } else {
      await document.exitFullscreen().catch(() => {});
    }
  }, []);

  return (
    <button
      onClick={toggle}
      title={isFullscreen ? "Quitter le plein écran" : "Plein écran"}
      className={cn(
        "flex items-center gap-2 text-[--foreground-muted] transition-colors",
        "hover:text-[--foreground] rounded-lg p-1.5 hover:bg-[--accent]",
        className
      )}
    >
      {isFullscreen ? (
        <Minimize2 className="w-4 h-4 shrink-0" />
      ) : (
        <Maximize2 className="w-4 h-4 shrink-0" />
      )}
      {!iconOnly && (
        <span className="text-xs font-medium">
          {isFullscreen ? "Quitter" : "Plein écran"}
        </span>
      )}
    </button>
  );
}

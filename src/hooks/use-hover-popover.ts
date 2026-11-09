"use client";

import { useRef, useState } from "react";

/**
 * Open state for a popover that opens on tap/click, and also on hover when using a mouse.
 * Spread `hoverProps` on both the trigger and the content so moving between them keeps it open.
 */
export function useHoverPopover() {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hover = (next: boolean) => (event: React.PointerEvent) => {
    if (event.pointerType !== "mouse") return;
    if (closeTimer.current) clearTimeout(closeTimer.current);
    if (next) setOpen(true);
    else closeTimer.current = setTimeout(() => setOpen(false), 150);
  };

  return { open, setOpen, hoverProps: { onPointerEnter: hover(true), onPointerLeave: hover(false) } };
}

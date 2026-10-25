import { useCallback, useRef } from "react";

const tapPalette = [28, 157, 190, 328];

export function useAmbientInteraction() {
  const backdropRef = useRef(null);
  const paletteIndex = useRef(0);
  const burstTimer = useRef(null);

  const setPosition = useCallback((event, hue) => {
    const backdrop = backdropRef.current;
    if (!backdrop) return;
    const bounds = backdrop.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((event.clientX - bounds.left) / bounds.width) * 100));
    const y = Math.max(0, Math.min(100, ((event.clientY - bounds.top) / bounds.height) * 100));
    backdrop.style.setProperty("--pointer-x", `${x}%`);
    backdrop.style.setProperty("--pointer-y", `${y}%`);
    backdrop.style.setProperty("--pointer-hue", hue);
  }, []);

  const onPointerMove = useCallback((event) => {
    if (event.pointerType === "touch") return;
    const backdrop = backdropRef.current;
    if (!backdrop) return;
    const bounds = backdrop.getBoundingClientRect();
    const hue = Math.round(145 + ((event.clientX - bounds.left) / Math.max(1, bounds.width)) * 170) % 360;
    setPosition(event, hue);
    backdrop.classList.add("ambient-active");
  }, [setPosition]);

  const onPointerDown = useCallback((event) => {
    const backdrop = backdropRef.current;
    if (!backdrop) return;
    const hue = tapPalette[paletteIndex.current % tapPalette.length];
    paletteIndex.current += 1;
    setPosition(event, hue);
    backdrop.classList.add("ambient-active");
    backdrop.classList.remove("ambient-burst");
    void backdrop.offsetWidth;
    backdrop.classList.add("ambient-burst");
    window.clearTimeout(burstTimer.current);
    burstTimer.current = window.setTimeout(() => backdrop.classList.remove("ambient-burst"), 900);
  }, [setPosition]);

  const onPointerLeave = useCallback(() => {
    backdropRef.current?.classList.remove("ambient-active");
  }, []);

  return { backdropRef, onPointerMove, onPointerDown, onPointerLeave };
}

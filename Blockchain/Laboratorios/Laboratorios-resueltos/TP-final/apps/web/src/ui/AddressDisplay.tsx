import { CheckIcon, CopyIcon, CrossCircledIcon } from "@radix-ui/react-icons";
import { useEffect, useId, useRef, useState } from "react";
import type { Address } from "viem";

type AddressDisplayProps = {
  address: Address;
  format: "short" | "long";
};

type CopyStatus = "idle" | "success" | "error";

const shorten = (address: Address) => `${address.slice(0, 6)}…${address.slice(-4)}`;

export function AddressDisplay({ address, format }: AddressDisplayProps) {
  const [copyStatus, setCopyStatus] = useState<CopyStatus>("idle");
  const [touchOpen, setTouchOpen] = useState(false);
  const containerRef = useRef<HTMLSpanElement>(null);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const tooltipId = useId();
  const abbreviated = shorten(address);

  useEffect(() => {
    const closeFromOutside = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setTouchOpen(false);
    };
    document.addEventListener("pointerdown", closeFromOutside);
    return () => document.removeEventListener("pointerdown", closeFromOutside);
  }, []);

  useEffect(() => () => clearTimeout(resetTimerRef.current), []);

  const copyAddress = async () => {
    clearTimeout(resetTimerRef.current);
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(address);
      setCopyStatus("success");
    } catch {
      setCopyStatus("error");
    }
    resetTimerRef.current = setTimeout(() => setCopyStatus("idle"), 2_000);
  };

  const shortValue = (className = "") => (
    <span
      role="button"
      tabIndex={0}
      aria-label={`Mostrar dirección completa: ${address}`}
      aria-describedby={tooltipId}
      className={`cursor-help select-all ${className}`}
      onClick={() => setTouchOpen((open) => !open)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          setTouchOpen((open) => !open);
        }
      }}
    >
      {abbreviated}
    </span>
  );

  const feedback =
    copyStatus === "success" ? "Copiada" : copyStatus === "error" ? "No se pudo copiar" : "";

  return (
    <span
      ref={containerRef}
      className="group relative inline-flex max-w-full items-center rounded-lg border border-line bg-surface-raised font-mono text-sm text-ink shadow-sm transition hover:border-primary hover:shadow-[0_0_0_2px_rgb(119_201_154/0.12)] focus-within:border-primary"
      onKeyDown={(event) => {
        if (event.key === "Escape") setTouchOpen(false);
      }}
    >
      <span className="min-w-0 px-2.5 py-1.5">
        {format === "short" ? (
          shortValue()
        ) : (
          <>
            <span data-testid="address-mobile" className="md:hidden">
              {shortValue()}
            </span>
            <span data-testid="address-desktop" className="hidden select-all md:inline">
              {address}
            </span>
          </>
        )}
      </span>
      <span className="h-5 w-px bg-line" aria-hidden="true" />
      <button
        type="button"
        aria-label={copyStatus === "success" ? "Dirección copiada" : "Copiar dirección"}
        className="m-0.5 inline-flex size-7 cursor-pointer items-center justify-center rounded-md text-muted transition hover:bg-primary/10 hover:text-primary-strong focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"
        onClick={copyAddress}
      >
        {copyStatus === "success" ? (
          <CheckIcon aria-hidden="true" />
        ) : copyStatus === "error" ? (
          <CrossCircledIcon aria-hidden="true" />
        ) : (
          <CopyIcon aria-hidden="true" />
        )}
      </button>
      <span
        id={tooltipId}
        role="tooltip"
        data-open={touchOpen ? "true" : "false"}
        className={`${touchOpen ? "flex" : "hidden"} absolute bottom-full left-1/2 z-20 mb-2 max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center rounded-md border border-line bg-surface px-2.5 py-2 text-xs break-all md:break-normal whitespace-normal text-ink shadow-panel group-hover:flex group-focus-within:flex ${format === "long" ? "md:hidden" : ""}`}
      >
        {address}
      </span>
      <span className="sr-only" aria-live="polite">
        {feedback}
      </span>
      {feedback && (
        <span className="absolute top-full right-0 z-10 mt-1 rounded bg-surface px-2 py-1 font-sans text-xs whitespace-nowrap text-ink shadow-panel">
          {feedback}
        </span>
      )}
    </span>
  );
}

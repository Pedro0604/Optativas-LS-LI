import { CheckIcon, CopyIcon, CrossCircledIcon, OpenInNewWindowIcon } from "@radix-ui/react-icons";
import { Tooltip } from "radix-ui";
import { useEffect, useRef, useState } from "react";
import type { Address } from "viem";
import { useExplorerUrl } from "./ExplorerProvider";

type AddressDisplayProps = {
  address: Address;
  format: "short" | "long";
  tooltipSide?: "top" | "right" | "bottom" | "left";
};

type CopyStatus = "idle" | "success" | "error";

const shorten = (address: Address) => `${address.slice(0, 6)}…${address.slice(-4)}`;

export function AddressDisplay({ address, format, tooltipSide = "top" }: AddressDisplayProps) {
  const explorerUrl = useExplorerUrl();
  const [copyStatus, setCopyStatus] = useState<CopyStatus>("idle");
  const resetTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const abbreviated = shorten(address);

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
    <span className={`cursor-help select-all ${className}`}>{abbreviated}</span>
  );

  const feedback =
    copyStatus === "success" ? "Copiada" : copyStatus === "error" ? "No se pudo copiar" : "";

  return (
    <Tooltip.Provider>
      <span className="group relative inline-flex max-w-full items-center rounded-lg border border-line bg-surface-raised font-mono text-sm text-ink shadow-sm transition hover:border-primary hover:shadow-[0_0_0_2px_rgb(119_201_154/0.12)] focus-within:border-primary">
        <Tooltip.Root>
          <Tooltip.Trigger asChild>
            <span
              tabIndex={0}
              aria-label={`Mostrar dirección completa: ${address}`}
              className="min-w-0 px-2.5 py-1.5"
            >
              <span>
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
            </span>
          </Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Content
              side={tooltipSide}
              sideOffset={8}
              className="z-20 max-w-[calc(100vw-2rem)] rounded-md border border-line bg-surface px-2.5 py-2 text-xs break-all md:break-normal whitespace-normal text-ink shadow-panel"
            >
              {address}
            </Tooltip.Content>
          </Tooltip.Portal>
        </Tooltip.Root>
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
        {explorerUrl && (
          <>
            <span className="h-5 w-px bg-line" aria-hidden="true" />
            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <a
                  aria-label="Abrir dirección en Etherscan"
                  className="m-0.5 inline-flex size-7 cursor-pointer items-center justify-center rounded-md text-muted transition hover:bg-primary/10 hover:text-primary-strong focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"
                  href={`${explorerUrl}/address/${address}`}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  <OpenInNewWindowIcon aria-hidden="true" />
                </a>
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content
                  side={tooltipSide}
                  sideOffset={8}
                  className="z-20 rounded-md border border-line bg-surface px-2.5 py-2 font-sans text-xs text-ink shadow-panel"
                >
                  Abrir en Etherscan
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip.Root>
          </>
        )}
        <span className="sr-only" aria-live="polite">
          {feedback}
        </span>
        {feedback && (
          <span className="absolute top-full right-0 z-10 mt-1 rounded bg-surface px-2 py-1 font-sans text-xs whitespace-nowrap text-ink shadow-panel">
            {feedback}
          </span>
        )}
      </span>
    </Tooltip.Provider>
  );
}

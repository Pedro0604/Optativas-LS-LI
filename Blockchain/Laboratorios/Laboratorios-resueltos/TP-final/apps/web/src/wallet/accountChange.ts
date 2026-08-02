import { useEffect, useRef } from "react";

export const walletContextChangedEvent = "pacto:wallet-context-changed";

/** Keeps an edited form intact unless its owner confirms it may be discarded. */
export function useDiscardDirtyFormOnWalletChange(isDirty: boolean, discard: () => void) {
  const latest = useRef({ isDirty, discard });
  latest.current = { isDirty, discard };

  useEffect(() => {
    const onWalletChange = () => {
      const { isDirty: dirty, discard: reset } = latest.current;
      if (
        !dirty ||
        window.confirm("Cambiar de cuenta descartará los cambios sin guardar. ¿Continuar?")
      )
        reset();
    };
    window.addEventListener(walletContextChangedEvent, onWalletChange);
    return () => window.removeEventListener(walletContextChangedEvent, onWalletChange);
  }, []);
}

/** Transaction coordinators use this to clear a pending action bound to the prior account. */
export function useResetAccountSensitiveState(reset: () => void) {
  const latestReset = useRef(reset);
  latestReset.current = reset;

  useEffect(() => {
    const onWalletChange = () => latestReset.current();
    window.addEventListener(walletContextChangedEvent, onWalletChange);
    return () => window.removeEventListener(walletContextChangedEvent, onWalletChange);
  }, []);
}

import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { Button } from "../ui/Button";
import { walletContextChangedEvent } from "./accountChange";
import { canWrite, SEPOLIA_CHAIN_ID, walletConnectionRequestEvent } from "./wallet";
import { AddressDisplay } from "../ui/AddressDisplay";

const isGenericInjectedConnector = (connector: { name: string }) => connector.name === "Injected";

function WalletStateInvalidator() {
  const { address, chainId, isConnected } = useAccount();
  const queryClient = useQueryClient();
  const previous = useRef<string | undefined>(undefined);
  const current = isConnected ? `${address}:${chainId}` : undefined;

  useEffect(() => {
    if (previous.current !== undefined && previous.current !== current) {
      queryClient.cancelQueries({ queryKey: ["my-escrows"] });
      queryClient.invalidateQueries();
      window.dispatchEvent(new CustomEvent(walletContextChangedEvent));
    }
    previous.current = current;
  }, [current, queryClient]);

  return null;
}

function WalletControlsContent() {
  const { address, chainId, isConnected } = useAccount();
  const { connectors, connect, error: connectionError, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, error: switchError, isPending: isSwitching } = useSwitchChain();
  const [showProviders, setShowProviders] = useState(false);
  const wrongNetwork = isConnected && !canWrite(chainId);
  const hasNamedConnector = connectors.some((connector) => !isGenericInjectedConnector(connector));
  const visibleConnectors = hasNamedConnector
    ? connectors.filter((connector) => !isGenericInjectedConnector(connector))
    : connectors;

  useEffect(() => {
    const show = () => setShowProviders(true);
    window.addEventListener(walletConnectionRequestEvent, show);
    return () => window.removeEventListener(walletConnectionRequestEvent, show);
  }, []);

  if (!isConnected)
    return (
      <div className="relative">
        <Button aria-expanded={showProviders} onClick={() => setShowProviders((open) => !open)}>
          Conectar wallet
        </Button>
        {showProviders && (
          <div className="absolute right-0 z-10 mt-2 min-w-52 rounded-lg border border-line bg-surface-raised p-2 shadow-panel">
            {visibleConnectors.map((connector) => (
              <Button
                key={connector.uid}
                className="mb-1 w-full justify-start last:mb-0"
                disabled={isPending}
                onClick={() => connect({ connector })}
              >
                {isGenericInjectedConnector(connector) ? "Wallet del navegador" : connector.name}
              </Button>
            ))}
            {connectionError && (
              <p className="mt-2 text-xs text-danger">No se pudo conectar la wallet.</p>
            )}
          </div>
        )}
      </div>
    );

  return (
    <div className="flex items-center gap-2">
      {wrongNetwork && (
        <div className="flex items-center gap-2" role="alert">
          <span className="text-xs font-semibold text-accent">Wallet fuera de Sepolia</span>
          <Button disabled={isSwitching} onClick={() => switchChain({ chainId: SEPOLIA_CHAIN_ID })}>
            Usar Sepolia
          </Button>
          {switchError && <span className="text-xs text-danger">No se cambió la red.</span>}
        </div>
      )}
      <AddressDisplay address={address!} format="short" tooltipSide="bottom" />
      <Button variant="ghost" onClick={() => disconnect()}>
        Desconectar
      </Button>
    </div>
  );
}

export function WalletControls() {
  return (
    <>
      <WalletStateInvalidator />
      <WalletControlsContent />
    </>
  );
}

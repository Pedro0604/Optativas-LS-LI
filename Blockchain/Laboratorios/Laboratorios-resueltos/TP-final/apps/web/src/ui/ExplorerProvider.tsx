import { createContext, type ReactNode, useContext } from "react";

const ExplorerUrlContext = createContext<string | undefined>(undefined);

export function ExplorerProvider({
  children,
  explorerUrl,
}: {
  children: ReactNode;
  explorerUrl: string;
}) {
  return <ExplorerUrlContext value={explorerUrl}>{children}</ExplorerUrlContext>;
}

export function useExplorerUrl() {
  return useContext(ExplorerUrlContext);
}

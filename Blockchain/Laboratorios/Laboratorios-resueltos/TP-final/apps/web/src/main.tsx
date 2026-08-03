import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { WagmiProvider } from "wagmi";
import { ConfigurationError } from "./config";
import "./styles.css";
import { Panel } from "./ui/Panel";
import { ExplorerProvider } from "./ui/ExplorerProvider";

const eyebrowClassName = "text-xs font-bold tracking-[0.12em] text-primary uppercase";

const element = document.getElementById("root")!;
function renderConfigurationError(error: unknown) {
  ReactDOM.createRoot(element).render(
    <React.StrictMode>
      <Panel as="main" className="mx-auto mt-[12vh] max-w-162.5" role="alert">
        <p className={eyebrowClassName}>Configuración requerida</p>
        <h1 className="font-display text-3xl font-bold">No se puede iniciar Pacto</h1>
        <p>{error instanceof Error ? error.message : "La configuración es inválida."}</p>
        <p className="text-muted">Revisá las variables VITE_* y volvé a compilar.</p>
      </Panel>
    </React.StrictMode>,
  );
}

try {
  const [{ routeTree }, { config }] = await Promise.all([
    import("./routeTree.gen"),
    import("./runtime"),
  ]);
  const queryClient = new QueryClient({
    defaultOptions: { queries: { staleTime: 15_000, retry: 1 } },
  });
  const router = createRouter({ routeTree, context: { queryClient, config } });
  const walletConfig = (await import("./wallet/wagmi")).createWalletConfig(config);

  ReactDOM.createRoot(element).render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={walletConfig} reconnectOnMount>
          <ExplorerProvider explorerUrl={config.explorerUrl}>
            <RouterProvider router={router} />
          </ExplorerProvider>
        </WagmiProvider>
      </QueryClientProvider>
    </React.StrictMode>,
  );
} catch (error) {
  if (error instanceof ConfigurationError) renderConfigurationError(error);
  else {
    console.error(error);
    ReactDOM.createRoot(element).render(
      <Panel as="main" className="mx-auto mt-[12vh] max-w-162.5" role="alert">
        <h1 className="font-display text-3xl font-bold">No se pudo iniciar la aplicación</h1>
        <p className="text-muted">
          Ocurrió un error inesperado. Recargá la página para intentar nuevamente.
        </p>
      </Panel>,
    );
  }
}

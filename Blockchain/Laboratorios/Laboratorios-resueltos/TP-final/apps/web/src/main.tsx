import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { ConfigurationError } from "./config";
import "./styles.css";

const element = document.getElementById("root")!;
function renderConfigurationError(error: unknown) {
  ReactDOM.createRoot(element).render(
    <React.StrictMode>
      <main className="configError" role="alert">
        <p className="eyebrow">Configuración requerida</p>
        <h1>No se puede iniciar Pacto</h1>
        <p>{error instanceof Error ? error.message : "La configuración es inválida."}</p>
        <p>Revisá las variables VITE_* y volvé a compilar.</p>
      </main>
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

  ReactDOM.createRoot(element).render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </React.StrictMode>,
  );
} catch (error) {
  if (error instanceof ConfigurationError) renderConfigurationError(error);
  else {
    console.error(error);
    ReactDOM.createRoot(element).render(
      <main className="configError" role="alert">
        <h1>No se pudo iniciar la aplicación</h1>
        <p>Ocurrió un error inesperado. Recargá la página para intentar nuevamente.</p>
      </main>,
    );
  }
}

import { useQuery } from "@tanstack/react-query";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useAccount } from "wagmi";
import { config, publicClient } from "../runtime";
import { Button } from "../ui/Button";
import { Pagination } from "../ui/Pagination";
import { Panel } from "../ui/Panel";
import { WalletControls } from "../wallet/WalletControls";
import { EscrowList } from "./EscrowList";
import { escrowRoles, myEscrowsQuery, type EscrowRole } from "./myEscrows";

const roleLabels: Record<EscrowRole, string> = {
  owner: "Como owner",
  worker: "Como worker",
  arbiter: "Como árbitro",
};

export function MyEscrowsPage() {
  const search = useSearch({ from: "/my-escrows" });
  const navigate = useNavigate({ from: "/my-escrows" });
  const { address, isConnected } = useAccount();
  const query = useQuery({
    ...myEscrowsQuery(publicClient, config.factoryAddress, address!, search.role, search.page),
    enabled: isConnected && address !== undefined,
  });
  const changeRole = (role: EscrowRole) =>
    navigate({ search: (previous: typeof search) => ({ ...previous, role, page: 1 }) });
  const changePage = (page: number) =>
    navigate({ search: (previous: typeof search) => ({ ...previous, page }) });

  return (
    <>
      <section className="pb-8">
        <p className="text-xs font-bold tracking-[0.12em] text-primary uppercase">
          Tu actividad · Sepolia
        </p>
        <h1 className="my-4 font-display text-[clamp(3rem,9vw,6rem)] leading-[0.9] font-bold">
          Mis escrows
        </h1>
        <p className="max-w-155 text-muted">Consultá tus acuerdos según el rol que cumplís.</p>
      </section>
      {!isConnected ? (
        <Panel as="section" role="status" className="flex gap-2 items-center">
          <h2>Conectá tu wallet para ver tus escrows: </h2>
          <WalletControls />
        </Panel>
      ) : (
        <>
          <div className="mb-6 flex flex-wrap gap-2" role="tablist" aria-label="Rol en el escrow">
            {escrowRoles.map((role) => (
              <Button
                key={role}
                role="tab"
                aria-selected={search.role === role}
                variant={search.role === role ? "default" : "ghost"}
                onClick={() => changeRole(role)}
              >
                {roleLabels[role]}
              </Button>
            ))}
          </div>
          {query.isPending && !query.data ? (
            <Panel role="status">Cargando tus escrows…</Panel>
          ) : null}
          {query.isError && !query.data ? (
            <Panel as="section" role="alert">
              <h2>No pudimos cargar tus escrows</h2>
              <p>La consulta a Sepolia falló.</p>
              <Button onClick={() => query.refetch()}>Reintentar</Button>
            </Panel>
          ) : null}
          {query.data ? (
            <div aria-busy={query.isFetching}>
              {query.isError ? (
                <Panel
                  as="section"
                  className="mb-4 flex items-center justify-between gap-4"
                  role="alert"
                >
                  <p>No pudimos actualizar los escrows. Se muestran los resultados anteriores.</p>
                  <Button onClick={() => query.refetch()}>Reintentar</Button>
                </Panel>
              ) : null}
              <EscrowList
                items={query.data.items}
                chainTime={query.data.blockTime}
                onRetry={() => query.refetch()}
              />
              <Pagination
                page={query.data.page}
                pageCount={query.data.pageCount}
                onPageChange={changePage}
              />
            </div>
          ) : null}
        </>
      )}
    </>
  );
}

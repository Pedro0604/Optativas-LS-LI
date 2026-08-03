import { useQuery } from "@tanstack/react-query";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useRef } from "react";
import { useAccount } from "wagmi";
import { config, publicClient } from "../runtime";
import { Button } from "../ui/Button";
import { Pagination } from "../ui/Pagination";
import { Panel } from "../ui/Panel";
import { discoveryQuery } from "./discovery";
import { EscrowList } from "./EscrowList";
import { EscrowStateFilter } from "./EscrowStateFilter";

export function DiscoveryPage() {
  const search = useSearch({ from: "/" });
  const navigate = useNavigate({ from: "/" });
  const { address: account } = useAccount();
  const query = useQuery({
    ...discoveryQuery(publicClient, config.factoryAddress, search.page, search.state, account),
    placeholderData: (previousData, previousQuery) =>
      previousQuery?.queryKey[1] === (account ?? "disconnected") ? previousData : undefined,
  });
  const lastData = useRef<{ account: typeof account; data: typeof query.data }>({
    account,
    data: query.data,
  });

  if (lastData.current.account !== account) lastData.current = { account, data: undefined };
  if (query.data !== undefined) lastData.current = { account, data: query.data };
  const data = query.data ?? lastData.current.data;

  if (query.isPending && data === undefined) return <Panel role="status">Cargando escrows…</Panel>;

  if (query.isError && data === undefined)
    return (
      <Panel as="section" role="alert">
        <h2>No pudimos cargar los escrows</h2>
        <p>La consulta a Sepolia falló.</p>
        <Button onClick={() => query.refetch()}>Reintentar</Button>
      </Panel>
    );

  if (data === undefined) return null;

  const isUpdating = query.isFetching;
  const updateFailed = query.isError;
  const changePage = (page: number) =>
    navigate({ search: (previous: typeof search) => ({ ...previous, page }) });

  return (
    <>
      <section className="border-t border-line pt-8 pb-8 sm:pt-16">
        <p className="text-xs font-bold tracking-[0.12em] text-primary uppercase">
          Registro público · Sepolia
        </p>
        <h1 className="my-4 font-display text-[clamp(3rem,9vw,6rem)] leading-[0.9] font-bold">
          Escrows
        </h1>
        <p className="max-w-155 text-muted">
          Escrows creados por el factory, disponibles sin conectar una wallet.
        </p>
      </section>
      <section
        className="my-4 mb-6 flex items-center justify-between gap-4 max-[560px]:flex-col max-[560px]:items-stretch"
        aria-label="Filtros"
      >
        <EscrowStateFilter
          value={search.state}
          onChange={(state) =>
            navigate({
              search: (previous: typeof search) => ({ ...previous, page: 1, state }),
            })
          }
        />
        {isUpdating && (
          <span className="inline-flex items-center gap-2 text-sm text-muted" role="status">
            <span
              className="size-4 animate-spin rounded-full border-2 border-primary/30 border-t-primary"
              aria-hidden="true"
            />
            Actualizando…
          </span>
        )}
        <span className="text-sm text-muted">{data.count} escrows registrados</span>
      </section>
      {updateFailed && (
        <Panel as="section" className="mb-4 flex items-center justify-between gap-4" role="alert">
          <p>No pudimos actualizar los escrows. Se muestran los resultados anteriores.</p>
          <Button onClick={() => query.refetch()}>Reintentar</Button>
        </Panel>
      )}
      <div
        className={isUpdating ? "opacity-55 transition-opacity" : "transition-opacity"}
        aria-busy={isUpdating}
      >
        <EscrowList items={data.items} chainTime={data.blockTime} onRetry={() => query.refetch()} />
        <Pagination page={data.page} pageCount={data.pageCount} onPageChange={changePage} />
      </div>
    </>
  );
}

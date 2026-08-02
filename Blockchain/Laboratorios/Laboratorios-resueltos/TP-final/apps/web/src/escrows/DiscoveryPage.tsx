import { useQuery } from "@tanstack/react-query";
import { useNavigate, useSearch } from "@tanstack/react-router";
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
  const query = useQuery(
    discoveryQuery(publicClient, config.factoryAddress, search.page, search.state),
  );

  if (query.isPending) return <Panel role="status">Cargando escrows…</Panel>;

  if (query.isError)
    return (
      <Panel as="section" role="alert">
        <h2>No pudimos cargar los escrows</h2>
        <p>La consulta a Sepolia falló.</p>
        <Button onClick={() => query.refetch()}>Reintentar</Button>
      </Panel>
    );

  const data = query.data;
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
        <span className="text-sm text-muted">{data.count} escrows registrados</span>
      </section>
      <EscrowList items={data.items} onRetry={() => query.refetch()} />
      <Pagination page={data.page} pageCount={data.pageCount} onPageChange={changePage} />
    </>
  );
}

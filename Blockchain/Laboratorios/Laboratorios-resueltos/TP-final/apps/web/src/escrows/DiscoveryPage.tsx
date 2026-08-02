import { useQuery } from "@tanstack/react-query";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { config, publicClient } from "../runtime";
import { Button } from "../ui/Button";
import { Pagination } from "../ui/Pagination";
import { discoveryQuery } from "./discovery";
import { EscrowList } from "./EscrowList";
import { EscrowStateFilter } from "./EscrowStateFilter";

export function DiscoveryPage() {
  const search = useSearch({ from: "/" });
  const navigate = useNavigate({ from: "/" });
  const query = useQuery(
    discoveryQuery(publicClient, config.factoryAddress, search.page, search.state),
  );

  if (query.isPending)
    return (
      <p role="status" className="panel">
        Cargando escrows…
      </p>
    );

  if (query.isError)
    return (
      <section className="panel" role="alert">
        <h2>No pudimos cargar los escrows</h2>
        <p>La consulta a Sepolia falló.</p>
        <Button onClick={() => query.refetch()}>Reintentar</Button>
      </section>
    );

  const data = query.data;
  const changePage = (page: number) =>
    navigate({ search: (previous: typeof search) => ({ ...previous, page }) });

  return (
    <>
      <section className="hero">
        <p className="eyebrow">Registro público · Sepolia</p>
        <h1>Escrows</h1>
        <p>Escrows creados por el factory, disponibles sin conectar una wallet.</p>
      </section>
      <section className="toolbar" aria-label="Filtros">
        <EscrowStateFilter
          value={search.state}
          onChange={(state) =>
            navigate({
              search: (previous: typeof search) => ({ ...previous, page: 1, state }),
            })
          }
        />
        <span>{data.count} escrows registrados</span>
      </section>
      <EscrowList items={data.items} onRetry={() => query.refetch()} />
      <Pagination page={data.page} pageCount={data.pageCount} onPageChange={changePage} />
    </>
  );
}

import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { config, publicClient } from "../runtime";
import { discoveryQuery, displayEth, shortAddress } from "./discovery";
import { escrowStateMetadata, escrowStates, parseEscrowState } from "./EscrowState";
import { Button } from "../ui/Button";

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
  return (
    <>
      <section className="hero">
        <p className="eyebrow">Registro público · Sepolia</p>
        <h1>Escrows</h1>
        <p>Escrows creados por el factory, disponibles sin conectar una wallet.</p>
      </section>
      <section className="toolbar" aria-label="Filtros">
        <label>
          Estado{" "}
          <select
            value={search.state}
            onChange={(event) =>
              navigate({
                search: (previous: typeof search) => ({
                  ...previous,
                  page: 1,
                  state:
                    event.target.value === "all" ? "all" : parseEscrowState(event.target.value),
                }),
              })
            }
          >
            <option value="all">Todos en esta página</option>
            {escrowStates.map((state) => (
              <option value={state} key={state}>
                {escrowStateMetadata[state].label}
              </option>
            ))}
          </select>
        </label>
        <span>{data.count} escrows</span>
      </section>
      {data.items.length === 0 ? (
        <div className="panel empty">
          <h2>No hay escrows para mostrar</h2>
          <p>Cuando se cree el primero aparecerá acá.</p>
        </div>
      ) : (
        <ul className="grid">
          {data.items.map((item) => (
            <li className="card" key={item.address}>
              {item.error ? (
                <>
                  <p className="eyebrow">{shortAddress(item.address)}</p>
                  <h2>Lectura fallida</h2>
                  <p>{item.error}</p>
                  <Button onClick={() => query.refetch()}>Reintentar</Button>
                </>
              ) : (
                <>
                  <div className="cardHeading">
                    <h2>{item.card!.title}</h2>
                    <span className="badge">{escrowStateMetadata[item.card!.state].label}</span>
                  </div>
                  <strong>{displayEth(item.card!.amount)}</strong>
                  <dl>
                    <div>
                      <dt>Owner</dt>
                      <dd title={item.card!.owner}>{shortAddress(item.card!.owner)}</dd>
                    </div>
                    <div>
                      <dt>Worker</dt>
                      <dd title={item.card!.worker}>{shortAddress(item.card!.worker)}</dd>
                    </div>
                    <div>
                      <dt>Árbitro</dt>
                      <dd title={item.card!.arbiter}>{shortAddress(item.card!.arbiter)}</dd>
                    </div>
                  </dl>
                  {item.card!.deadline > 0n && (
                    <p>
                      Fecha límite:{" "}
                      <time dateTime={new Date(Number(item.card!.deadline) * 1000).toISOString()}>
                        {new Intl.DateTimeFormat("es-AR", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        }).format(Number(item.card!.deadline) * 1000)}
                      </time>
                    </p>
                  )}
                  <Link to="/escrows/$address" params={{ address: item.address }}>
                    Ver detalle
                  </Link>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
      <nav className="pagination" aria-label="Paginación">
        <Button
          disabled={data.page <= 1}
          onClick={() =>
            navigate({
              search: (previous: typeof search) => ({ ...previous, page: data.page - 1 }),
            })
          }
        >
          Anterior
        </Button>
        <span>
          Página {data.page} de {data.pageCount}
        </span>
        <Button
          disabled={data.page >= data.pageCount}
          onClick={() =>
            navigate({
              search: (previous: typeof search) => ({ ...previous, page: data.page + 1 }),
            })
          }
        >
          Siguiente
        </Button>
      </nav>
    </>
  );
}

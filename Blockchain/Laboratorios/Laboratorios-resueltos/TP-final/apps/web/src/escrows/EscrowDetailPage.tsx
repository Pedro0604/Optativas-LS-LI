 import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "@tanstack/react-router";
import type { Address } from "viem";
import { config, publicClient } from "../runtime";
import { Badge } from "../ui/Badge";
import { Button, actionClassName } from "../ui/Button";
import { Panel } from "../ui/Panel";
import { displayEth } from "./discovery";
import { escrowDetailQuery, projectEscrow, safeSubmissionUrl } from "./detail";

const date = (timestamp: bigint) =>
  new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(Number(timestamp) * 1000),
  );

function AddressRow({ label, address }: { label: string; address: Address }) {
  return (
    <div>
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="mt-1 break-all font-mono text-sm select-all">{address}</dd>
    </div>
  );
}

function Evidence({
  label,
  value,
  link = false,
}: {
  label: string;
  value: string;
  link?: boolean;
}) {
  if (!value) return null;
  const url = link ? safeSubmissionUrl(value) : undefined;
  return (
    <div>
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="mt-1 break-words">
        {url ? (
          <a
            className="text-primary underline"
            href={url}
            target="_blank"
            rel="noopener noreferrer"
          >
            {value}
          </a>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}

export function EscrowDetailPage() {
  const { address } = useParams({ from: "/escrows/$address" });
  const query = useQuery(
    escrowDetailQuery(publicClient, config.factoryAddress, address as Address),
  );
  if (query.isPending) return <Panel role="status">Cargando detalle…</Panel>;
  if (query.isError)
    return (
      <Panel role="alert">
        <h1 className="font-display text-3xl font-bold">No pudimos leer el escrow</h1>
        <p className="text-muted">La consulta a Sepolia falló. Podés volver a intentarlo.</p>
        <Button onClick={() => query.refetch()}>Reintentar</Button>
      </Panel>
    );
  if (query.data.kind === "not-found")
    return (
      <Panel role="alert">
        <h1 className="font-display text-3xl font-bold">Escrow no encontrado</h1>
        <p className="text-muted">
          La dirección es válida, pero no pertenece al factory configurado.
        </p>
        <Link to="/" className={actionClassName}>
          Volver al registro
        </Link>
      </Panel>
    );

  const { snapshot, blockTime } = query.data;
  const projection = projectEscrow(snapshot, blockTime);
  return (
    <div className="grid gap-6">
      <section className="border-t border-line pt-8">
        <p className="text-xs font-bold tracking-[0.12em] text-primary uppercase">
          Escrow canónico
        </p>
        <h1 className="my-3 font-display text-[clamp(2.4rem,7vw,5rem)] leading-none font-bold">
          {snapshot.title}
        </h1>
        <p className="break-all font-mono text-sm text-muted select-all">{snapshot.address}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Badge>{projection.stateLabel}</Badge>
          {projection.deadlineElapsed && (
            <Badge className="border-accent/40 bg-accent/10 text-accent">
              Plazo vencido · sin finalizar
            </Badge>
          )}
        </div>
      </section>
      <div className="grid gap-6 md:grid-cols-2">
        <Panel as="section">
          <h2 className="font-display text-2xl font-bold">Fondos y participantes</h2>
          <p className="text-3xl font-bold text-primary-strong">{displayEth(snapshot.amount)}</p>
          <dl className="grid gap-4">
            <AddressRow label="Owner" address={snapshot.owner} />
            <AddressRow label="Worker" address={snapshot.worker} />
            <AddressRow label="Árbitro" address={snapshot.arbiter} />
          </dl>
        </Panel>
        <Panel as="section">
          <h2 className="font-display text-2xl font-bold">Acciones disponibles</h2>
          {projection.availableActions.length ? (
            <ul>
              {projection.availableActions.map((action) => (
                <li key={action}>{action}</li>
              ))}
            </ul>
          ) : (
            <p className="text-muted">El escrow alcanzó un estado final.</p>
          )}
          {projection.terminalOutcome && (
            <p>
              <strong>Resultado:</strong> {projection.terminalOutcome}
            </p>
          )}
        </Panel>
      </div>
      <Panel as="section">
        <h2 className="font-display text-2xl font-bold">Ciclo de vida</h2>
        <ol className="mt-5 grid gap-3 md:grid-cols-4">
          {projection.timeline.map((stage) => (
            <li
              key={stage.key}
              className={`rounded-lg border p-4 ${stage.status === "current" ? "border-primary bg-primary/10" : stage.status === "elapsed" ? "border-accent bg-accent/10" : "border-line"}`}
            >
              <p className="font-semibold">{stage.label}</p>
              <Badge>
                {stage.status === "completed"
                  ? "Completada"
                  : stage.status === "current"
                    ? "Actual"
                    : stage.status === "elapsed"
                      ? "Vencida, sin finalizar"
                      : "No iniciada"}
              </Badge>
              <p className="mt-3 text-sm text-muted">
                {stage.deadline === 0n ? "Plazo aún no iniciado" : date(stage.deadline)}
              </p>
            </li>
          ))}
        </ol>
      </Panel>
      <Panel as="section">
        <h2 className="font-display text-2xl font-bold">Evidencia on-chain</h2>
        <dl className="grid gap-4">
          <Evidence label="Referencia de entrega" value={snapshot.submissionReference} link />
          <Evidence label="Motivo de disputa" value={snapshot.disputeReason} />
          <Evidence label="Motivo de resolución" value={snapshot.resolutionReason} />
          {!snapshot.submissionReference &&
            !snapshot.disputeReason &&
            !snapshot.resolutionReason && (
              <p className="text-muted">Todavía no hay evidencia registrada.</p>
            )}
        </dl>
      </Panel>
    </div>
  );
}

import { Link } from "@tanstack/react-router";
import { displayEth, type EscrowSummary } from "./discovery";
import { escrowStateMetadata } from "./EscrowState";
import { Badge } from "../ui/Badge";
import { actionClassName } from "../ui/Button";
import { Panel } from "../ui/Panel";
import { AddressDisplay } from "../ui/AddressDisplay";

type EscrowCardProps = { summary: EscrowSummary };

export function EscrowCard({ summary }: EscrowCardProps) {
  return (
    <Panel as="li" className="flex flex-col">
      <div className="flex items-start justify-between gap-3">
        <h2 className="mb-3 font-display text-xl font-bold">{summary.title}</h2>
        <Badge>{escrowStateMetadata[summary.state].label}</Badge>
      </div>
      <strong className="text-lg text-primary-strong">{displayEth(summary.amount)}</strong>
      <dl className="my-4 border-y border-line py-3">
        <div className="flex justify-between gap-4">
          <dt className="text-muted">Owner</dt>
          <dd className="m-0">
            <AddressDisplay address={summary.owner} format="short" />
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted">Worker</dt>
          <dd className="m-0">
            <AddressDisplay address={summary.worker} format="short" />
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted">Árbitro</dt>
          <dd className="m-0">
            <AddressDisplay address={summary.arbiter} format="short" />
          </dd>
        </div>
      </dl>
      {summary.deadline > 0n && (
        <p className="text-sm text-muted">
          Fecha límite:{" "}
          <time dateTime={new Date(Number(summary.deadline) * 1000).toISOString()}>
            {new Intl.DateTimeFormat("es-AR", {
              dateStyle: "medium",
              timeStyle: "short",
            }).format(Number(summary.deadline) * 1000)}
          </time>
        </p>
      )}
      <Link
        to="/escrows/$address"
        params={{ address: summary.address }}
        className={`${actionClassName} mt-auto self-start`}
      >
        Ver detalle
      </Link>
    </Panel>
  );
}

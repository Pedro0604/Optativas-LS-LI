import { Link } from "@tanstack/react-router";
import { displayEth, shortAddress, type EscrowSummary } from "./discovery";
import { escrowStateMetadata } from "./EscrowState";

type EscrowCardProps = { summary: EscrowSummary };

export function EscrowCard({ summary }: EscrowCardProps) {
  return (
    <li className="card">
      <div className="cardHeading">
        <h2>{summary.title}</h2>
        <span className="badge">{escrowStateMetadata[summary.state].label}</span>
      </div>
      <strong>{displayEth(summary.amount)}</strong>
      <dl>
        <div>
          <dt>Owner</dt>
          <dd title={summary.owner}>{shortAddress(summary.owner)}</dd>
        </div>
        <div>
          <dt>Worker</dt>
          <dd title={summary.worker}>{shortAddress(summary.worker)}</dd>
        </div>
        <div>
          <dt>Árbitro</dt>
          <dd title={summary.arbiter}>{shortAddress(summary.arbiter)}</dd>
        </div>
      </dl>
      {summary.deadline > 0n && (
        <p>
          Fecha límite:{" "}
          <time dateTime={new Date(Number(summary.deadline) * 1000).toISOString()}>
            {new Intl.DateTimeFormat("es-AR", {
              dateStyle: "medium",
              timeStyle: "short",
            }).format(Number(summary.deadline) * 1000)}
          </time>
        </p>
      )}
      <Link to="/escrows/$address" params={{ address: summary.address }}>
        Ver detalle
      </Link>
    </li>
  );
}

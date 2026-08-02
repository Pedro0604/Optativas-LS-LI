import { createFileRoute, Link } from "@tanstack/react-router";
import { actionClassName } from "../ui/Button";
import { Panel } from "../ui/Panel";
export const Route = createFileRoute("/escrows/$address")({
  component: () => (
    <Panel as="section">
      <h1 className="font-display text-3xl font-bold">Detalle del escrow</h1>
      <p className="mb-6 text-muted">El detalle completo se incorpora en el siguiente ticket.</p>
      <Link to="/" className={actionClassName}>
        Volver al registro
      </Link>
    </Panel>
  ),
});

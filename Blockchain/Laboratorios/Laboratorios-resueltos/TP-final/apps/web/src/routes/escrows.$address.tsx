import { createFileRoute, Link } from "@tanstack/react-router";
export const Route = createFileRoute("/escrows/$address")({
  component: () => (
    <section className="panel">
      <h1>Detalle del escrow</h1>
      <p>El detalle completo se incorpora en el siguiente ticket.</p>
      <Link to="/">Volver al registro</Link>
    </section>
  ),
});

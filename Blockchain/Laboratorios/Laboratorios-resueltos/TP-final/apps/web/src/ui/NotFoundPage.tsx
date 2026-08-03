import { Link } from "@tanstack/react-router";
import { actionClassName } from "./Button";
import { Panel } from "./Panel";

export function NotFoundPage() {
  return (
    <Panel as="section" className="mx-auto max-w-162.5 text-center">
      <p className="text-xs font-bold tracking-[0.12em] text-primary uppercase">Error 404</p>
      <h1 className="my-4 font-display text-4xl font-bold">Página no encontrada</h1>
      <p className="mb-6 text-muted">La ruta solicitada no existe en Pacto.</p>
      <Link className={actionClassName} to="/">
        Volver al inicio
      </Link>
    </Panel>
  );
}

import { Link } from "@tanstack/react-router";
import { actionClassName } from "./Button";

function BrokenChain({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 240 150" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="chain" x1="36" y1="28" x2="202" y2="126">
          <stop stopColor="#a0dfb9" />
          <stop offset="1" stopColor="#e3a84b" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="5" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g stroke="url(#chain)" strokeWidth="13" strokeLinecap="round" filter="url(#glow)">
        <path d="M101 55 88 42c-16-16-41-16-57 0s-16 41 0 57l13 13c16 16 41 16 57 0l15-15" />
        <path d="m139 95 13 13c16 16 41 16 57 0s16-41 0-57l-13-13c-16-16-41-16-57 0l-15 15" />
      </g>
      <g transform="translate(0 12)" stroke="#e3a84b" strokeWidth="5" strokeLinecap="round">
        <path d="m115 35-3-17M136 42l11-14M101 77l-17 5M139 73l18 4" />
      </g>
    </svg>
  );
}

export function NotFoundPage() {
  return (
    <section className="mx-auto min-h-[58vh] max-w-4xl py-10">
      <div className="overflow-hidden rounded-2xl border border-line bg-[#0c100e] shadow-[0_28px_80px_rgb(0_0_0/.4)]">
        <div className="flex items-center gap-2 border-b border-line px-5 py-3">
          <i className="size-2.5 rounded-full bg-danger" />
          <i className="size-2.5 rounded-full bg-accent" />
          <i className="size-2.5 rounded-full bg-primary" />
          <span className="ml-3 font-mono text-xs text-muted">pacto://network/lookup</span>
        </div>
        <div className="grid gap-8 p-6 sm:p-10 md:grid-cols-[1fr_240px]">
          <div className="font-mono text-sm leading-7">
            <p className="text-primary">$ resolve current_route</p>
            <p className="text-muted">Consultando nodos de Sepolia...</p>
            <p className="text-muted">0 coincidencias confirmadas</p>
            <p className="mt-5 text-danger">ERROR 404: RESOURCE_NOT_FOUND</p>
            <h1 className="mt-6 font-display text-4xl font-bold text-ink sm:text-5xl">
              Conexión rota.
            </h1>
            <p className="mt-4 max-w-lg font-sans text-base text-muted">
              Llegaste a una dirección que quedó fuera de la cadena. Reconectate desde un punto
              conocido.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link className={actionClassName} to="/">
                ↳ Reconectar al inicio
              </Link>
              <Link className={`${actionClassName} bg-transparent`} to="/my-escrows">
                Ver mis escrows
              </Link>
            </div>
          </div>
          <BrokenChain className="m-auto w-full opacity-90" />
        </div>
      </div>
    </section>
  );
}

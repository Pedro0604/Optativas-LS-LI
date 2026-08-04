import { FormEvent, useState } from "react";
import { useNavigate } from "@tanstack/react-router";

const commandHelp = "inicio · mis-escrows · crear · escrow <dirección>";
const commands = [
  { value: "inicio", detail: "Ir a la página principal" },
  { value: "mis-escrows", detail: "Ver tus escrows" },
  { value: "crear", detail: "Crear un escrow" },
  { value: "escrow ", detail: "Abrir un escrow por dirección" },
];

function CommandLine() {
  const navigate = useNavigate();
  const [command, setCommand] = useState("");
  const [error, setError] = useState("");
  const normalizedCommand = command.toLocaleLowerCase();
  const matches = command
    ? commands.filter(({ value }) => value.startsWith(normalizedCommand))
    : [];

  const complete = (value: string) => {
    setCommand(value);
    setError("");
  };

  const run = (event: FormEvent) => {
    event.preventDefault();
    const [verb, address, ...rest] = command.trim().split(/\s+/);

    if (verb === "inicio") void navigate({ to: "/" });
    else if (verb === "mis-escrows") void navigate({ to: "/my-escrows" });
    else if (verb === "crear") void navigate({ to: "/create-escrow" });
    else if (verb === "escrow") {
      if (address && rest.length === 0) {
            void navigate({ to: "/escrows/$address", params: { address } });
      } else {
        setError(`Uso: escrow <dirección>. Ejemplo: escrow 0xBBcE0C86FdfaD7ea91AC1c0f9CAA4F066215402d`)
      }
    } 
    else setError(`Comando desconocido. Probá: ${commandHelp}`);
  };

  return (
    <form onSubmit={run} className="relative mt-7">
      <label className="flex items-center gap-2 border-b border-primary/50 pb-2 font-mono text-sm focus-within:border-primary">
        <span className="shrink-0 text-primary">pacto ❯</span>
        <input
          autoFocus
          value={command}
          onChange={(event) => {
            setCommand(event.target.value);
            setError("");
          }}
          onKeyDown={(event) => {
            if (event.key === "Tab" && matches[0]) {
              event.preventDefault();
              complete(matches[0].value);
            }
          }}
          className="min-w-0 flex-1 bg-transparent text-ink outline-none placeholder:text-muted/55"
          placeholder={commandHelp}
          aria-label="Comando de navegación"
          aria-describedby="command-feedback"
        />
        <button className="rounded bg-primary/15 px-2 py-1 text-xs text-primary hover:bg-primary/25">
          Enter ↵
        </button>
      </label>
      {matches.length > 0 && (
        <div className={`absolute left-18 right-0 top-[calc(100%${error ? "+8px" : "-24px"})] z-10 overflow-hidden rounded-lg border border-line bg-[#171d1a] py-1 shadow-2xl`}>
          <div className="flex items-center justify-between border-b border-line px-3 py-1.5 text-[10px] uppercase tracking-widest text-muted">
            <span>Comandos</span>
            <span>Tab para completar</span>
          </div>
          {matches.map(({ value, detail }, index) => (
            <button
              key={value}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => complete(value)}
              className={`flex w-full items-center gap-3 px-3 py-2 text-left ${index === 0 ? "bg-primary/12" : "hover:bg-white/5"}`}
            >
              <span className="w-28 shrink-0 text-primary">{value}</span>
              <span className="font-sans text-xs text-muted">{detail}</span>
              {index === 0 && (
                <span className="ml-auto rounded border border-line px-1.5 text-[10px] text-muted">
                  Tab
                </span>
              )}
            </button>
          ))}
        </div>
      )}
      <p id="command-feedback" className="mt-2 min-h-5 text-xs text-danger" aria-live="polite">
        {error}
      </p>
    </form>
  );
}

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
      <div className="rounded-2xl border border-line bg-[#0c100e] shadow-[0_28px_80px_rgb(0_0_0/.4)]">
        <div className="flex items-center gap-2 border-b border-line px-5 py-3">
          <i className="size-2.5 rounded-full bg-danger" />
          <i className="size-2.5 rounded-full bg-accent" />
          <i className="size-2.5 rounded-full bg-primary" />
          <span className="ml-3 font-mono text-xs text-muted">pacto://network/lookup</span>
        </div>
        <div className="grid gap-8 p-6 md:grid-cols-[1fr_240px]">
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
            <CommandLine />
          </div>
          <BrokenChain className="m-auto w-full opacity-90" />
        </div>
      </div>
    </section>
  );
}

import type { HTMLAttributes } from "react";

const panelClassName = "rounded-xl border border-line bg-surface p-5 shadow-panel";

type PanelProps = HTMLAttributes<HTMLElement> & {
  as?: "div" | "section" | "li" | "main";
};

export function Panel({ as: Component = "div", className = "", ...props }: PanelProps) {
  return <Component className={`${panelClassName} ${className}`.trim()} {...props} />;
}

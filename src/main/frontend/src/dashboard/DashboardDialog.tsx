import type { ReactNode } from "react";

import { Icon } from "./icons";

type DashboardDialogProps = {
  title: string;
  children: ReactNode;
  onClose: () => void;
};

export function DashboardDialog({ title, children, onClose }: DashboardDialogProps) {
  return (
    <div className="dialog-backdrop">
      <section className="dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title">
        <button className="icon-button dialog-close" type="button" aria-label="Close" onClick={onClose}>
          <Icon name="close" />
        </button>
        <p className="eyebrow">Dashboard Library</p>
        <h2 id="dialog-title">{title}</h2>
        {children}
      </section>
    </div>
  );
}

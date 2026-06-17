import { useState } from "react";

import { DashboardDialog } from "../dashboard/DashboardDialog";
import type { WidgetInput, WidgetType } from "./types";

type WidgetAddDialogProps = {
  fieldErrors: Record<string, string>;
  operationMessage: string | null;
  onClose: () => void;
  onSubmit: (input: WidgetInput) => Promise<void>;
};

export function WidgetAddDialog({
  fieldErrors,
  operationMessage,
  onClose,
  onSubmit
}: WidgetAddDialogProps) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState<WidgetType>("table");
  const [x, setX] = useState(0);
  const [y, setY] = useState(0);
  const [w, setW] = useState(3);
  const [h, setH] = useState(2);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    await onSubmit({ title, type, x, y, w, h });
  }

  return (
    <DashboardDialog title="Add Widget" onClose={onClose}>
      <form onSubmit={submit} noValidate>
        <label className="dialog-field">
          <span>Title</span>
          <input
            autoFocus
            aria-invalid={Boolean(fieldErrors.title)}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          {fieldErrors.title ? <small className="field-error">{fieldErrors.title}</small> : null}
        </label>
        <label className="dialog-field">
          <span>Type</span>
          <select value={type} onChange={(e) => setType(e.target.value as WidgetType)}
            style={{ width: "100%", padding: "8px", borderRadius: "7px", border: "1px solid var(--line)", background: "var(--surface-warm)" }}>
            <option value="table">Table</option>
            <option value="chart">Chart</option>
            <option value="metric">Metric</option>
            <option value="text">Text</option>
          </select>
        </label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <label className="dialog-field">
            <span>X</span>
            <input type="number" min={0} value={x} onChange={(e) => setX(Number(e.target.value))} />
          </label>
          <label className="dialog-field">
            <span>Y</span>
            <input type="number" min={0} value={y} onChange={(e) => setY(Number(e.target.value))} />
          </label>
          <label className="dialog-field">
            <span>Width</span>
            <input type="number" min={1} value={w} onChange={(e) => setW(Number(e.target.value))} />
          </label>
          <label className="dialog-field">
            <span>Height</span>
            <input type="number" min={1} value={h} onChange={(e) => setH(Number(e.target.value))} />
          </label>
        </div>
        {operationMessage ? <p className="form-message">{operationMessage}</p> : null}
        <div className="dialog-actions">
          <button type="button" className="button secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="button primary">Add Widget</button>
        </div>
      </form>
    </DashboardDialog>
  );
}

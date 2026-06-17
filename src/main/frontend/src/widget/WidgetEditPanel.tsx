import { useState } from "react";

import type { Widget, WidgetInput, WidgetType } from "./types";
import { WidgetDataSourceForm } from "./WidgetDataSourceForm";

type WidgetEditPanelProps = {
  widget: Widget;
  fieldErrors: Record<string, string>;
  operationMessage: string | null;
  onClose: () => void;
  onSubmit: (input: WidgetInput) => Promise<void>;
};

export function WidgetEditPanel({
  widget,
  fieldErrors,
  operationMessage,
  onClose,
  onSubmit
}: WidgetEditPanelProps) {
  const [title, setTitle] = useState(widget.title);
  const [type, setType] = useState<WidgetType>(widget.type);
  const [x, setX] = useState(widget.x);
  const [y, setY] = useState(widget.y);
  const [w, setW] = useState(widget.w);
  const [h, setH] = useState(widget.h);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    await onSubmit({ title, type, x, y, w, h });
  }

  return (
    <div className="edit-panel-backdrop" onClick={onClose}>
      <section className="edit-panel" role="dialog" aria-modal="true" aria-label="Edit widget"
        onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h2 style={{ margin: 0, fontSize: "18px" }}>Edit Widget</h2>
          <button type="button" className="icon-button" aria-label="Close" onClick={onClose}>×</button>
        </div>
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
          <WidgetDataSourceForm widget={widget} />
          {operationMessage ? <p className="form-message">{operationMessage}</p> : null}
          <div className="dialog-actions">
            <button type="button" className="button secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="button primary">Save</button>
          </div>
        </form>
      </section>
    </div>
  );
}

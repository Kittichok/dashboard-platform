import { useState } from "react";

import { DashboardDialog } from "../dashboard/DashboardDialog";
import type { DataSource, Widget, WidgetInput, WidgetType } from "./types";
import { WidgetDataSourceForm } from "./WidgetDataSourceForm";

type WidgetAddDialogProps = {
  fieldErrors: Record<string, string>;
  operationMessage: string | null;
  onClose: () => void;
  onSubmit: (input: WidgetInput) => Promise<void>;
  existingWidgets?: Widget[];
};

function findDefaultPosition(existing: Widget[], w: number, h: number): { x: number; y: number } {
  const occupied = new Set<string>();
  for (const wgt of existing) {
    for (let dx = 0; dx < wgt.w; dx++) {
      for (let dy = 0; dy < wgt.h; dy++) {
        occupied.add(`${wgt.x + dx},${wgt.y + dy}`);
      }
    }
  }
  for (let y = 0; y < 50; y++) {
    for (let x = 0; x <= 12 - w; x++) {
      let free = true;
      for (let dx = 0; dx < w && free; dx++) {
        for (let dy = 0; dy < h && free; dy++) {
          if (occupied.has(`${x + dx},${y + dy}`)) free = false;
        }
      }
      if (free) return { x, y };
    }
  }
  return { x: 0, y: 50 };
}

export function WidgetAddDialog({
  fieldErrors,
  operationMessage,
  onClose,
  onSubmit,
  existingWidgets = []
}: WidgetAddDialogProps) {
  const defaultPos = findDefaultPosition(existingWidgets, 3, 2);
  const [title, setTitle] = useState("");
  const [type, setType] = useState<WidgetType>("table");
  const [w, setW] = useState(3);
  const [h, setH] = useState(2);
  const [displayConfig, setDisplayConfig] = useState<Record<string, unknown> | null>(null);
  const [dataSource, setDataSource] = useState<DataSource | undefined>(undefined);

  const draftWidget: Widget = {
    id: "",
    title,
    type,
    x: defaultPos.x,
    y: defaultPos.y,
    w,
    h,
    displayConfig,
    dataSource: dataSource ?? null
  };

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    await onSubmit({
      title,
      type,
      x: defaultPos.x,
      y: defaultPos.y,
      w,
      h,
      displayConfig,
      dataSource: dataSource ?? null
    });
  }

  return (
    <DashboardDialog title="Add Widget" onClose={onClose} className="dialog--wide">
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
          <option value="raw_json">Raw JSON</option>
          <option value="json_preview">JSON Preview</option>
          </select>
        </label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <label className="dialog-field">
            <span>Width</span>
            <input type="number" min={1} value={w} onChange={(e) => setW(Number(e.target.value))} />
          </label>
          <label className="dialog-field">
            <span>Height</span>
            <input type="number" min={1} value={h} onChange={(e) => setH(Number(e.target.value))} />
          </label>
        </div>
        <WidgetDataSourceForm
          dashboardId=""
          widget={draftWidget}
          displayConfig={displayConfig}
          onChange={setDataSource}
          onDisplayConfigChange={setDisplayConfig}
        />
        {operationMessage ? <p className="form-message">{operationMessage}</p> : null}
        <div className="dialog-actions">
          <button type="button" className="button secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="button primary">Add Widget</button>
        </div>
      </form>
    </DashboardDialog>
  );
}

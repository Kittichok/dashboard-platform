import { useState } from "react";

import type { DataSource, DataSourceInput } from "./types";

type DataSourceDialogProps = {
  dataSource?: DataSource;
  fieldErrors: Record<string, string>;
  operationMessage: string | null;
  onClose: () => void;
  onSubmit: (input: DataSourceInput & { version?: number }) => Promise<void>;
};

type AuthType = "none" | "bearer_token" | "api_key_header";
type HeaderRow = { id: number; name: string; value: string };

export function DataSourceDialog({
  dataSource,
  fieldErrors,
  operationMessage,
  onClose,
  onSubmit
}: DataSourceDialogProps) {
  const [name, setName] = useState(dataSource?.name ?? "");
  const [baseUrl, setBaseUrl] = useState(dataSource?.config.baseUrl ?? "");
  const [authType, setAuthType] = useState<AuthType>(dataSource?.config.authentication.type ?? "none");
  const [headerName, setHeaderName] = useState(
    dataSource?.config.authentication.type === "api_key_header"
      ? dataSource.config.authentication.headerName
      : ""
  );
  const [authValue, setAuthValue] = useState(
    dataSource?.config.authentication.type === "none" ? "" : dataSource?.config.authentication.value ?? ""
  );
  const [headerRows, setHeaderRows] = useState<HeaderRow[]>(() => {
    const headers = Object.entries(dataSource?.config.headers ?? {});
    if (headers.length > 0) {
      return headers.map(([name, value], index) => ({ id: index + 1, name, value }));
    }
    return [{ id: 1, name: "Content-Type", value: "application/json" }];
  });

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const authentication =
      authType === "none"
        ? { type: "none" as const }
        : authType === "bearer_token"
          ? { type: "bearer_token" as const, value: authValue }
          : { type: "api_key_header" as const, headerName, value: authValue };
    await onSubmit({
      name,
      type: "rest",
      config: {
        baseUrl,
        authentication,
        headers: buildHeaders(headerRows)
      },
      version: dataSource?.version
    });
  }

  function addHeaderRow() {
    setHeaderRows((current) => [...current, { id: nextHeaderId(current), name: "", value: "" }]);
  }

  function updateHeaderRow(id: number, field: "name" | "value", nextValue: string) {
    setHeaderRows((current) => current.map((row) => row.id === id ? { ...row, [field]: nextValue } : row));
  }

  function removeHeaderRow(id: number) {
    setHeaderRows((current) => current.length === 1 ? current : current.filter((row) => row.id !== id));
  }

  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <section className="dialog" role="dialog" aria-modal="true" aria-label={dataSource ? "Edit data source" : "Create data source"}
        onClick={(event) => event.stopPropagation()}>
        <button type="button" className="icon-button dialog-close" aria-label="Close" onClick={onClose}>
          x
        </button>
        <p className="eyebrow">Workspace</p>
        <h2>{dataSource ? "Edit Data Source" : "Create Data Source"}</h2>
        <form onSubmit={submit} noValidate>
          <label className="dialog-field">
            <span>Name</span>
            <input
              autoFocus
              value={name}
              onChange={(event) => setName(event.target.value)}
              aria-invalid={Boolean(fieldErrors.name)}
            />
            {fieldErrors.name ? <small className="field-error">{fieldErrors.name}</small> : null}
          </label>
          <label className="dialog-field">
            <span>Base URL</span>
            <input
              value={baseUrl}
              onChange={(event) => setBaseUrl(event.target.value)}
              aria-invalid={Boolean(fieldErrors["config.baseUrl"])}
              placeholder="https://api.example.test"
            />
            {fieldErrors["config.baseUrl"] ? (
              <small className="field-error">{fieldErrors["config.baseUrl"]}</small>
            ) : null}
          </label>
          <label className="dialog-field">
            <span>Authentication</span>
            <select
              value={authType}
              onChange={(event) => setAuthType(event.target.value as AuthType)}
              style={{ width: "100%", padding: "8px", borderRadius: "7px", border: "1px solid var(--line)", background: "var(--surface-warm)" }}
            >
              <option value="none">No authentication</option>
              <option value="bearer_token">Bearer token</option>
              <option value="api_key_header">API key header</option>
            </select>
            {fieldErrors["config.authentication.type"] ? (
              <small className="field-error">{fieldErrors["config.authentication.type"]}</small>
            ) : null}
          </label>
          {authType === "api_key_header" ? (
            <label className="dialog-field">
              <span>Header Name</span>
              <input
                value={headerName}
                onChange={(event) => setHeaderName(event.target.value)}
                aria-invalid={Boolean(fieldErrors["config.authentication.headerName"])}
                placeholder="X-API-Key"
              />
              {fieldErrors["config.authentication.headerName"] ? (
                <small className="field-error">{fieldErrors["config.authentication.headerName"]}</small>
              ) : null}
            </label>
          ) : null}
          {authType !== "none" ? (
            <label className="dialog-field">
              <span>{authType === "bearer_token" ? "Bearer Token" : "Credential Value"}</span>
              <input
                value={authValue}
                onChange={(event) => setAuthValue(event.target.value)}
                aria-invalid={Boolean(fieldErrors["config.authentication.value"])}
              />
              {fieldErrors["config.authentication.value"] ? (
                <small className="field-error">{fieldErrors["config.authentication.value"]}</small>
              ) : null}
            </label>
          ) : null}
          <fieldset className="dialog-field" style={{ gap: "10px" }}>
            <legend style={{ fontWeight: 600, marginBottom: "8px" }}>Default Headers</legend>
            {headerRows.map((row, index) => (
              <div
                key={row.id}
                style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: "8px", alignItems: "center" }}
              >
                <input
                  aria-label={`Header name ${index + 1}`}
                  value={row.name}
                  onChange={(event) => updateHeaderRow(row.id, "name", event.target.value)}
                  placeholder="Content-Type"
                />
                <input
                  aria-label={`Header value ${index + 1}`}
                  value={row.value}
                  onChange={(event) => updateHeaderRow(row.id, "value", event.target.value)}
                  placeholder="application/json"
                />
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => removeHeaderRow(row.id)}
                  disabled={headerRows.length === 1}
                >
                  Remove
                </button>
              </div>
            ))}
            <div>
              <button type="button" className="button secondary" onClick={addHeaderRow}>
                Add Header
              </button>
            </div>
            {fieldErrors["config.headers"] ? <small className="field-error">{fieldErrors["config.headers"]}</small> : null}
          </fieldset>
          {operationMessage ? <p className="form-message">{operationMessage}</p> : null}
          <div className="dialog-actions">
            <button type="button" className="button secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="button primary">
              {dataSource ? "Save" : "Create Data Source"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function buildHeaders(rows: HeaderRow[]) {
  return Object.fromEntries(
    rows
      .filter((row) => row.name.trim() !== "" || row.value.trim() !== "")
      .map((row) => [row.name.trim(), row.value.trim()])
  );
}

function nextHeaderId(rows: HeaderRow[]) {
  return rows.reduce((max, row) => Math.max(max, row.id), 0) + 1;
}

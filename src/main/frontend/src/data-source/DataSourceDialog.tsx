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
        authentication
      },
      version: dataSource?.version
    });
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

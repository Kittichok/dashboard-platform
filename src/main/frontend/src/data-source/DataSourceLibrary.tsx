import { useEffect, useMemo, useRef, useState } from "react";

import { AppSidebar } from "../dashboard/AppSidebar";
import type { ApiFailure, NetworkFailure } from "../dashboard/types";
import { useNavCollapse } from "../dashboard/NavCollapseContext";
import { Icon } from "../dashboard/icons";
import {
  createDataSource,
  deleteDataSource,
  exportDataSource,
  importDataSource,
  listDataSources,
  updateDataSource
} from "./dataSourceApi";
import { DataSourceDialog } from "./DataSourceDialog";
import { DeleteDataSourceDialog } from "./DeleteDataSourceDialog";
import type { DataSource, DataSourceInput } from "./types";

type DataSourceFailure = ApiFailure | NetworkFailure;

type DialogState =
  | { type: "create" }
  | { type: "edit"; dataSource: DataSource }
  | { type: "delete"; dataSource: DataSource }
  | null;

export function DataSourceLibrary() {
  const { collapsed: sidebarCollapsed, toggle: toggleSidebar } = useNavCollapse();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [searchText, setSearchText] = useState("");
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState<DialogState>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [operationMessage, setOperationMessage] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    listDataSources()
      .then((loaded) => {
        if (mounted) {
          setDataSources(loaded);
        }
      })
      .catch((error: DataSourceFailure) => {
        if (mounted) {
          setNotice(error.message);
        }
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  const visibleDataSources = useMemo(() => {
    const normalized = searchText.trim().toLowerCase();
    if (!normalized) {
      return dataSources;
    }
    return dataSources.filter((dataSource) =>
      `${dataSource.name} ${dataSource.config.baseUrl}`.toLowerCase().includes(normalized)
    );
  }, [dataSources, searchText]);

  function openDialog(nextDialog: DialogState) {
    setFieldErrors({});
    setOperationMessage(null);
    setDialog(nextDialog);
  }

  async function create(input: DataSourceInput & { version?: number }) {
    await runDialogMutation(async () => {
      const created = await createDataSource(input);
      setDataSources((current) => [created, ...current]);
      setDialog(null);
    });
  }

  async function update(input: DataSourceInput & { version?: number }) {
    if (dialog?.type !== "edit" || input.version == null) {
      return;
    }
    const version = input.version;
    await runDialogMutation(async () => {
      const updated = await updateDataSource(dialog.dataSource.id, {
        ...input,
        version
      });
      setDataSources((current) => current.map((item) => item.id === updated.id ? updated : item));
      setDialog(null);
    });
  }

  async function remove() {
    if (dialog?.type !== "delete") {
      return;
    }
    await runDialogMutation(async () => {
      await deleteDataSource(dialog.dataSource.id, dialog.dataSource.version);
      setDataSources((current) => current.filter((item) => item.id !== dialog.dataSource.id));
      setDialog(null);
    });
  }

  async function handleImport(file: File | null) {
    if (!file) {
      return;
    }
    try {
      const parsed = JSON.parse(await readFileText(file)) as DataSourceInput;
      const created = await importDataSource(parsed);
      setDataSources((current) => [created, ...current]);
      setNotice(`Imported ${created.name}.`);
    } catch (error) {
      const failure = error as DataSourceFailure | SyntaxError;
      if ("kind" in (failure as object)) {
        setNotice(messageFor(failure as DataSourceFailure));
      } else {
        setNotice("Import file must contain valid JSON data source config.");
      }
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  async function handleExport(dataSource: DataSource) {
    try {
      const exported = await exportDataSource(dataSource.id);
      const blob = new Blob([JSON.stringify(exported, null, 2)], { type: "application/json" });
      const href = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = href;
      anchor.download = `${slug(dataSource.name)}.json`;
      anchor.click();
      URL.revokeObjectURL(href);
      setNotice(`Exported ${dataSource.name}.`);
    } catch (error) {
      setNotice(messageFor(error as DataSourceFailure));
    }
  }

  async function runDialogMutation(operation: () => Promise<void>) {
    setFieldErrors({});
    setOperationMessage(null);
    try {
      await operation();
    } catch (error) {
      const failure = error as DataSourceFailure;
      if (failure.kind === "api" && failure.code === "validation_error") {
        setFieldErrors(failure.fieldErrors);
        setOperationMessage(failure.message);
      } else if (failure.kind === "api" && failure.code === "data_source_version_conflict") {
        setOperationMessage(`${failure.message} Reload the data source library before retrying.`);
      } else if (failure.kind === "api" && failure.code === "data_source_in_use") {
        setOperationMessage(`${failure.message} ${failure.fieldErrors.references ?? ""}`.trim());
      } else {
        setNotice(messageFor(failure));
      }
    }
  }

  return (
    <div className={`app-shell${sidebarCollapsed ? " sidebar-collapsed" : ""}`}>
      <AppSidebar
        activeItem="data-sources"
        collapsed={sidebarCollapsed}
        onToggle={toggleSidebar}
      />
      <main className="main">
        <header className="page-header">
          <div>
            <p className="eyebrow">Workspace</p>
            <h1>Data Source Library</h1>
            <p className="page-copy">Create, import, export, and manage shared REST API Sources for widgets.</p>
          </div>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              style={{ display: "none" }}
              onChange={(event) => void handleImport(event.target.files?.[0] ?? null)}
            />
            <button type="button" className="button secondary" onClick={() => fileInputRef.current?.click()}>
              Import JSON
            </button>
            <button type="button" className="button primary" onClick={() => openDialog({ type: "create" })}>
              <Icon name="plus" /> New data source
            </button>
          </div>
        </header>

        {notice ? (
          <div className="notice" role="alert">
            <span>{notice}</span>
            <button type="button" className="button secondary" onClick={() => setNotice(null)}>
              Dismiss
            </button>
          </div>
        ) : null}

        <section className="library-toolbar" aria-label="Data source tools">
          <label className="search-field">
            <Icon name="search" />
            <span className="sr-only">Search data sources</span>
            <input
              type="search"
              aria-label="Search data sources"
              value={searchText}
              placeholder="Search data sources"
              onChange={(event) => setSearchText(event.target.value)}
            />
          </label>
          <span className="result-count">{visibleDataSources.length} data sources</span>
        </section>

        {loading ? (
          <div className="empty-state" role="status">Loading data sources...</div>
        ) : dataSources.length === 0 ? (
          <div className="empty-state">
            <h2>No data sources yet</h2>
            <p>Create or import the first shared REST API Source.</p>
          </div>
        ) : visibleDataSources.length === 0 ? (
          <div className="empty-state">
            <h2>No data sources found</h2>
            <p>Try a different search.</p>
          </div>
        ) : (
          <section className="dashboard-grid" aria-live="polite">
            {visibleDataSources.map((dataSource) => (
              <article key={dataSource.id} className="dashboard-card">
                <div className="card-content">
                  <p className="eyebrow" style={{ marginBottom: "10px" }}>REST API Source</p>
                  <h2>{dataSource.name}</h2>
                  <p>{dataSource.config.baseUrl}</p>
                  <span className="card-meta">Version {dataSource.version}</span>
                  <div className="card-actions">
                    <button type="button" className="button secondary" onClick={() => openDialog({ type: "edit", dataSource })}>
                      Edit
                    </button>
                    <button type="button" className="button secondary" onClick={() => void handleExport(dataSource)}>
                      Export
                    </button>
                    <button type="button" className="button danger" onClick={() => openDialog({ type: "delete", dataSource })}>
                      Delete
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </section>
        )}
      </main>

      {dialog?.type === "create" ? (
        <DataSourceDialog
          fieldErrors={fieldErrors}
          operationMessage={operationMessage}
          onClose={() => setDialog(null)}
          onSubmit={create}
        />
      ) : null}
      {dialog?.type === "edit" ? (
        <DataSourceDialog
          dataSource={dialog.dataSource}
          fieldErrors={fieldErrors}
          operationMessage={operationMessage}
          onClose={() => setDialog(null)}
          onSubmit={update}
        />
      ) : null}
      {dialog?.type === "delete" ? (
        <DeleteDataSourceDialog
          dataSource={dialog.dataSource}
          operationMessage={operationMessage}
          onClose={() => setDialog(null)}
          onConfirm={remove}
        />
      ) : null}
    </div>
  );
}

function messageFor(failure: DataSourceFailure) {
  if (failure.kind === "api") {
    return failure.message;
  }
  return failure.message || "Network request failed.";
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

async function readFileText(file: File): Promise<string> {
  if (typeof file.text === "function") {
    return file.text();
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read import file."));
    reader.readAsText(file);
  });
}

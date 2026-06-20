import type { DataSource } from "./types";

type DeleteDataSourceDialogProps = {
  dataSource: DataSource;
  operationMessage: string | null;
  onClose: () => void;
  onConfirm: () => Promise<void>;
};

export function DeleteDataSourceDialog({
  dataSource,
  operationMessage,
  onClose,
  onConfirm
}: DeleteDataSourceDialogProps) {
  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <section className="dialog" role="dialog" aria-modal="true" aria-label="Delete data source"
        onClick={(event) => event.stopPropagation()}>
        <button type="button" className="icon-button dialog-close" aria-label="Close" onClick={onClose}>
          x
        </button>
        <p className="eyebrow">Workspace</p>
        <h2>Delete Data Source</h2>
        <p>
          Delete <strong>{dataSource.name}</strong> from the workspace?
        </p>
        {operationMessage ? <p className="form-message">{operationMessage}</p> : null}
        <div className="dialog-actions">
          <button type="button" className="button secondary" onClick={onClose}>Cancel</button>
          <button type="button" className="button danger solid" onClick={() => void onConfirm()}>
            Delete Data Source
          </button>
        </div>
      </section>
    </div>
  );
}

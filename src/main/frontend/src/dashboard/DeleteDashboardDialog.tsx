import { DashboardDialog } from "./DashboardDialog";
import type { Dashboard } from "./types";

type DeleteDashboardDialogProps = {
  dashboard: Dashboard;
  operationMessage: string | null;
  onClose: () => void;
  onConfirm: () => Promise<void>;
};

export function DeleteDashboardDialog({
  dashboard,
  operationMessage,
  onClose,
  onConfirm
}: DeleteDashboardDialogProps) {
  return (
    <DashboardDialog title="Delete dashboard" onClose={onClose}>
      <p>
        Delete <strong>{dashboard.name}</strong>? This removes it from the shared workspace.
      </p>
      {operationMessage ? <p className="form-message">{operationMessage}</p> : null}
      <div className="dialog-actions">
        <button type="button" className="button secondary" onClick={onClose}>
          Cancel
        </button>
        <button type="button" className="button danger solid" onClick={onConfirm}>
          Delete dashboard
        </button>
      </div>
    </DashboardDialog>
  );
}

import { useMemo, useState } from "react";

import { DashboardDialog } from "./DashboardDialog";
import { DashboardFields, validateDashboardInput } from "./CreateDashboardDialog";
import type { Dashboard, DashboardInput } from "./types";

type RenameDashboardDialogProps = {
  dashboard: Dashboard;
  fieldErrors: Record<string, string>;
  operationMessage: string | null;
  onClose: () => void;
  onSubmit: (input: DashboardInput & { version: number }) => Promise<void>;
};

export function RenameDashboardDialog({
  dashboard,
  fieldErrors,
  operationMessage,
  onClose,
  onSubmit
}: RenameDashboardDialogProps) {
  const [name, setName] = useState(dashboard.name);
  const [description, setDescription] = useState(dashboard.description);
  const validation = useMemo(() => validateDashboardInput(name, description), [name, description]);
  const errors = { ...validation, ...fieldErrors };

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (Object.keys(validation).length > 0) {
      return;
    }
    await onSubmit({ name, description, version: dashboard.version });
  }

  return (
    <DashboardDialog title="Rename dashboard" onClose={onClose}>
      <form onSubmit={submit} noValidate>
        <DashboardFields
          name={name}
          description={description}
          errors={errors}
          onNameChange={setName}
          onDescriptionChange={setDescription}
        />
        {operationMessage ? <p className="form-message">{operationMessage}</p> : null}
        <div className="dialog-actions">
          <button type="button" className="button secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="button primary">
            Save
          </button>
        </div>
      </form>
    </DashboardDialog>
  );
}

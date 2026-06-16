import { useMemo, useState } from "react";

import { DashboardDialog } from "./DashboardDialog";
import type { DashboardInput } from "./types";

type CreateDashboardDialogProps = {
  fieldErrors: Record<string, string>;
  operationMessage: string | null;
  onClose: () => void;
  onSubmit: (input: DashboardInput) => Promise<void>;
};

export function CreateDashboardDialog({
  fieldErrors,
  operationMessage,
  onClose,
  onSubmit
}: CreateDashboardDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const validation = useMemo(() => validateDashboardInput(name, description), [name, description]);
  const errors = { ...validation, ...fieldErrors };

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (Object.keys(validation).length > 0) {
      return;
    }
    await onSubmit({ name, description });
  }

  return (
    <DashboardDialog title="Create dashboard" onClose={onClose}>
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
            Create dashboard
          </button>
        </div>
      </form>
    </DashboardDialog>
  );
}

type DashboardFieldsProps = {
  name: string;
  description: string;
  errors: Record<string, string>;
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
};

export function DashboardFields({
  name,
  description,
  errors,
  onNameChange,
  onDescriptionChange
}: DashboardFieldsProps) {
  return (
    <>
      <label className="dialog-field">
        <span>Name</span>
        <input
          autoFocus
          aria-invalid={Boolean(errors.name)}
          value={name}
          onChange={(event) => onNameChange(event.target.value)}
        />
        {errors.name ? <small className="field-error">{errors.name}</small> : null}
      </label>
      <label className="dialog-field">
        <span>Description</span>
        <input
          aria-invalid={Boolean(errors.description)}
          value={description}
          onChange={(event) => onDescriptionChange(event.target.value)}
        />
        {errors.description ? <small className="field-error">{errors.description}</small> : null}
      </label>
    </>
  );
}

export function validateDashboardInput(name: string, description: string) {
  const errors: Record<string, string> = {};
  if (!name.trim()) {
    errors.name = "Name is required.";
  } else if (name.trim().length > 120) {
    errors.name = "Name must be 120 characters or fewer.";
  }
  if (description.trim().length > 500) {
    errors.description = "Description must be 500 characters or fewer.";
  }
  return errors;
}

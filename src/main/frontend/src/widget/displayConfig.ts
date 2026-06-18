export interface WidgetDisplayConfig {
  selectedFields?: string[];
  columns?: string[];
  value?: string;
  content?: string;
  [key: string]: unknown;
}

export function selectedFieldsFromConfig(config: Record<string, unknown> | null | undefined): string[] {
  if (!config || !Array.isArray(config.selectedFields)) {
    return [];
  }
  if (!config.selectedFields.every((field) => typeof field === "string")) {
    return [];
  }
  return config.selectedFields;
}

export function legacyColumnsFromConfig(config: Record<string, unknown> | null | undefined): string[] {
  if (!config || !Array.isArray(config.columns)) {
    return [];
  }
  if (!config.columns.every((field) => typeof field === "string")) {
    return [];
  }
  return config.columns;
}

export function withSelectedFields(
  config: Record<string, unknown> | null | undefined,
  selectedFields: string[]
): Record<string, unknown> | null {
  const next = { ...(config ?? {}) };
  if (selectedFields.length > 0) {
    next.selectedFields = selectedFields;
  } else {
    delete next.selectedFields;
  }
  return Object.keys(next).length > 0 ? next : null;
}

export function extractSelectableFields(data: unknown): string[] {
  const fields: string[] = [];
  const seen = new Set<string>();

  function addField(field: string) {
    if (!seen.has(field)) {
      seen.add(field);
      fields.push(field);
    }
  }

  if (Array.isArray(data)) {
    for (const item of data) {
      if (isRecord(item)) {
        Object.keys(item).forEach(addField);
      }
    }
    return fields;
  }

  if (isRecord(data)) {
    return Object.keys(data);
  }

  return [];
}

export function filterDataToFields(data: unknown, fields: string[] | undefined): unknown {
  if (!fields || fields.length === 0) {
    return data;
  }
  if (Array.isArray(data)) {
    return data.map((item) => (isRecord(item) ? pickFields(item, fields) : item));
  }
  if (isRecord(data)) {
    return pickFields(data, fields);
  }
  return data;
}

function pickFields(record: Record<string, unknown>, fields: string[]): Record<string, unknown> {
  const picked: Record<string, unknown> = {};
  for (const field of fields) {
    if (Object.prototype.hasOwnProperty.call(record, field)) {
      picked[field] = record[field];
    }
  }
  return picked;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

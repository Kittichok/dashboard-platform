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

  function addField(path: string) {
    if (!seen.has(path)) {
      seen.add(path);
      fields.push(path);
    }
  }

  function visitRecord(record: Record<string, unknown>, prefix?: string) {
    for (const [key, value] of Object.entries(record)) {
      const path = prefix ? `${prefix}.${key}` : key;
      addField(path);

      if (isRecord(value)) {
        visitRecord(value, path);
      }
    }
  }

  if (Array.isArray(data)) {
    for (const item of data) {
      if (isRecord(item)) {
        visitRecord(item);
      }
    }
    return fields;
  }

  if (isRecord(data)) {
    visitRecord(data);
    return fields;
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

export function fieldValueAtPath(data: unknown, path: string): unknown {
  const segments = path.split(".");
  let current: unknown = data;

  for (const segment of segments) {
    if (!isRecord(current) || !Object.prototype.hasOwnProperty.call(current, segment)) {
      return undefined;
    }
    current = current[segment];
  }

  return current;
}

function pickFields(record: Record<string, unknown>, fields: string[]): Record<string, unknown> {
  const picked: Record<string, unknown> = {};

  for (const field of fields) {
    const value = fieldValueAtPath(record, field);
    if (value !== undefined) {
      assignPath(picked, field, value);
    }
  }

  return picked;
}

function assignPath(target: Record<string, unknown>, path: string, value: unknown) {
  const segments = path.split(".");
  let current = target;

  for (const segment of segments.slice(0, -1)) {
    const next = current[segment];
    if (!isRecord(next)) {
      current[segment] = {};
    }
    current = current[segment] as Record<string, unknown>;
  }

  current[segments[segments.length - 1]] = value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

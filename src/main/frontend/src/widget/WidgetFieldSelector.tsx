type WidgetFieldSelectorProps = {
  fields: string[];
  selectedFields: string[];
  onChange: (fields: string[]) => void;
};

export function WidgetFieldSelector({
  fields,
  selectedFields,
  onChange
}: WidgetFieldSelectorProps) {
  if (fields.length === 0) {
    return null;
  }

  function toggleField(field: string) {
    if (selectedFields.includes(field)) {
      onChange(selectedFields.filter((item) => item !== field));
    } else {
      onChange([...selectedFields, field]);
    }
  }

  function selectAll() {
    onChange(fields);
  }

  function clearAll() {
    onChange([]);
  }

  return (
    <div style={{ marginTop: "12px", marginBottom: "12px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", alignItems: "center", marginBottom: "6px" }}>
        <span style={{ display: "block", fontSize: "10px", fontWeight: 750, color: "var(--muted)", textTransform: "uppercase" }}>
          Display fields
        </span>
        <div style={{ display: "flex", gap: "6px" }}>
          <button type="button" className="button secondary" onClick={selectAll} style={{ fontSize: "12px", padding: "4px 8px" }}>
            Select all
          </button>
          <button type="button" className="button secondary" onClick={clearAll} style={{ fontSize: "12px", padding: "4px 8px" }}>
            Clear
          </button>
        </div>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
        {fields.map((field) => (
          <label
            key={field}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              fontSize: "12px",
              cursor: "pointer",
              padding: "4px 8px",
              borderRadius: "6px",
              border: "1px solid var(--line)",
              background: selectedFields.includes(field) ? "var(--blue-100, #e0edff)" : "var(--surface-warm)"
            }}
          >
            <input
              type="checkbox"
              checked={selectedFields.includes(field)}
              onChange={() => toggleField(field)}
            />
            {field}
          </label>
        ))}
      </div>
    </div>
  );
}

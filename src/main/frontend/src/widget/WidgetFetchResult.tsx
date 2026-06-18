type WidgetFetchResultProps = {
  result: unknown;
};

export function WidgetFetchResult({ result }: WidgetFetchResultProps) {
  if (isFetchError(result)) {
    return (
      <div style={{
        marginTop: "8px",
        padding: "10px",
        borderRadius: "7px",
        background: "#fff8f8",
        border: "1px solid #f0cdcd",
        color: "var(--red)",
        fontSize: "13px"
      }}>
        <strong>Fetch Error</strong>
        <p style={{ margin: "4px 0 0", fontSize: "12px" }}>
          Status: {String(result.status ?? "?")}
        </p>
        {result.body ? (
          <pre style={{ margin: "6px 0 0", fontSize: "11px", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
            {String(result.body)}
          </pre>
        ) : null}
      </div>
    );
  }

  return (
    <pre style={{
      marginTop: "8px",
      padding: "10px",
      borderRadius: "7px",
      background: "#f5f6f8",
      border: "1px solid var(--line)",
      fontSize: "12px",
      whiteSpace: "pre-wrap",
      wordBreak: "break-word",
      maxHeight: "200px",
      overflow: "auto"
    }}>
      {JSON.stringify(result, null, 2)}
    </pre>
  );
}

function isFetchError(result: unknown): result is { fetchError: true; status?: number; body?: string } {
  return typeof result === "object" && result !== null && "fetchError" in result;
}

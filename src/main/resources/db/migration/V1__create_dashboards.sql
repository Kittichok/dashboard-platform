CREATE TABLE dashboards (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    widgets_json TEXT NOT NULL DEFAULT '[]',
    version INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX dashboards_updated_at_idx
    ON dashboards(updated_at DESC);

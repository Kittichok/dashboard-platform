ALTER TABLE dashboards
ADD COLUMN variable_state_json TEXT NOT NULL DEFAULT '{}';

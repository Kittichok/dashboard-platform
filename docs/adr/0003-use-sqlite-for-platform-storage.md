# Use SQLite for platform storage

Version 1 stores dashboards, widget configuration, data sources, and plaintext source credentials in SQLite because the private-network deployment runs as a single dashboard server and should remain simple to install and operate. This accepts SQLite's single-writer constraints and requires revisiting storage if the platform moves to multiple application servers or sustained concurrent writes.

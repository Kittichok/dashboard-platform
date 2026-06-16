# Store source credentials as plaintext

Version 1 stores REST API bearer tokens and API keys as plaintext in SQLite and permits visitors to reveal them in the UI. This avoids encryption-key management for the single-server private-network deployment while deliberately accepting that anyone who can read, copy, or back up the database can recover every stored credential.

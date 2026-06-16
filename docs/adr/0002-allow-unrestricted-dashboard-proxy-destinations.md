# Allow unrestricted dashboard proxy destinations

All REST API calls pass through the dashboard server, and version 1 permits that proxy to call any destination reachable from its network without a hostname allowlist or address restrictions. This maximizes access to internal APIs on the trusted private network while deliberately accepting server-side request forgery, cloud metadata access, and internal network-discovery risk; exposing the platform beyond this boundary requires revisiting the decision.

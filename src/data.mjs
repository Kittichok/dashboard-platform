export const dashboards = [
  {
    id: "dsh_service_ops_8f31",
    name: "Service Operations",
    description: "Live incidents, platform health, and regional service status.",
    updated: "Updated 12 minutes ago",
    variables: [
      { id: "date", name: "date", label: "Date", type: "date", required: true, defaultValue: "2026-06-15" },
      { id: "region", name: "region", label: "Region", type: "text", required: true, defaultValue: "us-central" },
      { id: "severity", name: "severity", label: "Minimum Severity", type: "text", required: false, defaultValue: "high" }
    ],
    widgets: [
      {
        id: "incidents",
        type: "table",
        title: "Active Incidents",
        subtitle: "Operations API · /incidents",
        columns: ["Incident", "Service", "Severity", "Started", "Owner"],
        rows: [
          ["INC-1042", "Payments API", "Critical", "08:42", "Core Platform"],
          ["INC-1038", "Worker Queue", "High", "07:16", "Runtime"],
          ["INC-1035", "Identity", "Medium", "06:51", "Access"],
          ["INC-1029", "Notifications", "High", "05:34", "Messaging"]
        ]
      },
      {
        id: "status",
        type: "text",
        title: "Current Status",
        subtitle: "Status API · /summary",
        values: [
          ["Overall status", "Degraded"],
          ["Affected regions", "2"],
          ["Open incidents", "4"],
          ["Availability", "99.82%"]
        ]
      },
      {
        id: "raw",
        type: "raw",
        title: "Raw JSON",
        subtitle: "Status API · /summary",
        value: `{
  "status": "degraded",
  "regions": ["us-central", "eu-west"],
  "openIncidents": 4,
  "availability": 99.82
}`
      },
      {
        id: "preview",
        type: "preview",
        title: "JSON Preview",
        subtitle: "Operations API · /incidents/INC-1042",
        tree: [
          ["incident", "INC-1042"],
          ["service", "Payments API"],
          ["severity", "critical"],
          ["owner.team", "Core Platform"],
          ["metrics.latencyP95", "2.84s"]
        ]
      }
    ]
  },
  {
    id: "dsh_revenue_162c",
    name: "Revenue Pulse",
    description: "Daily commercial performance and payment conversion signals.",
    updated: "Updated yesterday",
    variables: [],
    widgets: []
  },
  {
    id: "dsh_fulfillment_94b0",
    name: "Fulfillment Health",
    description: "Warehouse queues, carrier delays, and delivery exceptions.",
    updated: "Updated 3 days ago",
    variables: [],
    widgets: []
  },
  {
    id: "dsh_experience_d441",
    name: "Customer Experience",
    description: "Support demand, response targets, and satisfaction trends.",
    updated: "Updated 5 days ago",
    variables: [],
    widgets: []
  }
];

export const dataSources = [
  { name: "Operations API", detail: "Bearer token · api.internal.example" },
  { name: "Status API", detail: "No authentication · status.internal.example" }
];


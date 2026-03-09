export type InspectorSelection =
  | { kind: "none" }
  | { kind: "concept"; id: string }
  | { kind: "link"; id: string }
  | { kind: "map-settings" }
  | { kind: "create-concept" }
  | { kind: "create-link" };

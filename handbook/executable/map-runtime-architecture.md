# Map Runtime Architecture

The Map Runtime is the core visualization surface of Sorelo, responsible for rendering Concepts and Links in an interactive 2D spatial canvas.

## Architectural Stack

The map architecture strictly separates the high-performance WebGL rendering layer from the React UI and global state layer to support massive graphs (10,000+ nodes) without browser lag.

### 1. Rendering Engine (V-Layer)
- **Technology**: `Sigma.js v3` (WebGL 2)
- **Responsibility**: Exclusively handles the high-performance drawing of nodes and edges, calculating camera viewports, and handling raw mouse raycasting (`div.sigma-mouse`).
- **Location**: `src/features/map-runtime/renderers/sigma-instance.ts`

### 2. Graph Data Model (M-Layer)
- **Technology**: `Graphology`
- **Responsibility**: The mathematical model behind Sigma.js. It stores the exact coordinates (`x`, `y`), colors, sizes, and relational structure of the active snapshot. It does **not** trigger React re-renders.
- **Location**: `src/features/map-runtime/renderers/graph-builder.ts`

### 3. UI State Management (VM-Layer)
- **Technology**: `Zustand`
- **Responsibility**: Centralized state management for everything *overlaying* the map. It holds the active `interactionMode` (e.g., placeConcept, connectLink), the current `selection` (e.g., which node Inspector is open), and the camera `viewport` state.
- **Event Flow**: Sigma.js captures native canvas events (e.g., `clickNode`) and calls mutators on the Zustand store. React components listen to Zustand—ensuring the WebGL canvas never triggers expensive React DOM trees needlessly.
- **Location**: `src/features/map-runtime/store/`

### 4. UI Overlay & Dialogs
- **Technology**: `Radix UI` and `React`
- **Responsibility**: Floating action bars, Inspector panels, and creation dialogs. These components have no direct dependency on Sigma.js. They observe the Zustand store and render standard DOM elements over the `<canvas>`.

## Interaction Principles
1. **Never use React State (`useState`) for graph positions or drag-and-drop.** All drag operations synchronously manipulate the Graphology instance.
2. **Sigma Events to Zustand Actions.** When a user clicks a node, Sigma fires the `clickNode` event. We immediately translate this into a Zustand action like `setSelection({ kind: 'concept', id: ... })`.
3. **E2E Testing is Mocked.** Because Playwright cannot inspect elements inside WebGL, we test the integration boundary by emitting exact Sigma events (`window.__SIGMA__.emit('clickNode')`) and asserting that the Radix Dialogs/Inspectors appear correctly.

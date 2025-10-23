# History System - Unified Zustand Store

## Overview

The history system has been completely refactored into a **single Zustand store** that manages all undo/redo functionality for both layer editing and node editing. This eliminates the complexity of multiple stores, hooks, and contexts.

## Architecture

### Before (Old System)
```
❌ Multiple stores:
   - editor-history-store.ts
   - history-context-store.ts

❌ Multiple hooks:
   - use-editor-history.ts
   - use-node-network-history.ts  
   - use-unified-history.ts

❌ Problems:
   - Unnecessary subscriptions
   - Complex state management
   - Difficult to call actions imperatively
   - Spread across multiple files
```

### After (New System)
```
✅ Single source of truth:
   - history-store.ts (one unified Zustand store)

✅ Simple usage:
   - useHistoryStore() for reactive subscriptions
   - useHistoryStore.getState() for imperative calls
   - No hooks needed, no contexts needed

✅ Benefits:
   - No unnecessary subscriptions
   - Clean imperative API
   - All history logic in one place
   - Easy to understand and maintain
```

## Implementation

### The Unified Store (`src/lib/stores/history-store.ts`)

A single Zustand store that manages:

**State:**
- `layerHistory` - Layer editor history (past/present/future)
- `nodeHistories` - Node editor histories per network (past/present/future)
- `activeContext` - Which history is active (`'layer-editor'` | `'node-editor'`)
- `openNodeNetwork` - Currently open node network ID
- `isNodeEditorFocused` - Whether user is interacting with node editor
- `isBypassingHistory` - Global bypass flag
- `nodeDragBypass` - Per-network drag bypass flags
- `debounceTimer` - Debounce timer for value changes

**Layer Editor Actions:**
- `initializeLayerHistory()` - Initialize with current state
- `pushLayerHistory(skipDebounce?)` - Push layer state to history
- `flushPendingLayerHistory()` - Flush debounced changes
- `applyLayerHistoryState(state)` - Apply history state to stores
- `undoLayerEditor()` - Undo layer changes
- `redoLayerEditor()` - Redo layer changes
- `resetLayerHistory()` - Reset layer history

**Node Editor Actions:**
- `initializeNodeHistory(networkId)` - Initialize network history
- `pushNodeHistory(networkId, nodes, edges)` - Push node state to history
- `undoNodeEditor(networkId)` - Undo node changes
- `redoNodeEditor(networkId)` - Redo node changes
- `startNodeDrag(networkId)` - Start drag (bypass history)
- `endNodeDrag(networkId)` - End drag (resume history)

**Context Management:**
- `setActiveContext(context)` - Set active history context
- `setOpenNodeNetwork(networkId)` - Set open node network
- `setNodeEditorFocused(focused)` - Set node editor focused state

**Unified Undo/Redo:**
- `undo()` - Context-aware undo
- `redo()` - Context-aware redo
- `canUndo()` - Check if undo is available
- `canRedo()` - Check if redo is available

**Utility:**
- `setBypassHistory(bypass)` - Set bypass history flag

## Usage Examples

### Example 1: Undo/Redo from UI (Reactive)

```typescript
// In editor-toolbar.tsx
const undo = useHistoryStore((state) => state.undo);
const redo = useHistoryStore((state) => state.redo);
const canUndo = useHistoryStore((state) => state.canUndo());
const canRedo = useHistoryStore((state) => state.canRedo());

<Button onClick={undo} disabled={!canUndo}>Undo</Button>
<Button onClick={redo} disabled={!canRedo}>Redo</Button>
```

### Example 2: Undo/Redo Imperatively (No Subscriptions)

```typescript
// Anywhere in your code
useHistoryStore.getState().undo();
useHistoryStore.getState().redo();

// Check if undo/redo are available
if (useHistoryStore.getState().canUndo()) {
  useHistoryStore.getState().undo();
}
```

### Example 3: Managing Context

```typescript
// In animation-builder.tsx
const setOpenNodeNetwork = useHistoryStore((state) => state.setOpenNodeNetwork);
const setNodeEditorFocused = useHistoryStore((state) => state.setNodeEditorFocused);

// When node editor opens
setOpenNodeNetwork(nodeNetworkId);

// When user hovers over node editor
setNodeEditorFocused(true);

// When user hovers away
setNodeEditorFocused(false);
```

### Example 4: Node History Management

```typescript
// In node-network-renderer.tsx

// Initialize history for this network
useEffect(() => {
  useHistoryStore.getState().initializeNodeHistory(networkId);
}, [networkId]);

// Push to history when nodes change
const setNodes = useCallback((newNodes) => {
  setNodesInNetwork(networkId, newNodes);
  useHistoryStore.getState().pushNodeHistory(networkId, newNodes, edges);
}, [networkId, edges]);

// Start/end drag to bypass history
const startDrag = () => useHistoryStore.getState().startNodeDrag(networkId);
const endDrag = () => useHistoryStore.getState().endNodeDrag(networkId);
```

### Example 5: Reset History on Project Load

```typescript
// In project-persistence.ts
useHistoryStore.getState().resetLayerHistory();
```

## How It Works

### Layer History Tracking

The `HistoryManager` component (in `src/components/editor/history-manager.tsx`) tracks changes to:
- Layers (add/remove/reorder)
- Layer values (parameter changes)
- Network enabled states (animation enable/disable)

It automatically pushes changes to history with:
- **Debouncing** for value changes (300ms)
- **No debouncing** for structural changes (add/remove/reorder)

### Node History Tracking

Each node network has its own history stack. When nodes or edges change:
1. Changes are pushed to the network-specific history
2. Drag operations bypass history temporarily
3. Each network maintains independent undo/redo stacks

### Context Switching

The store automatically switches context based on:
1. **Node editor opens** → switches to `node-editor` context
2. **User hovers over node editor** → marks as focused
3. **User hovers away** → switches back to `layer-editor` context
4. **Node editor closes** → always `layer-editor` context

When you call `undo()` or `redo()`, the store routes to the correct history system based on context.

## Visual Indicator

The `HistoryContextIndicator` component shows which history is active:
- 🟣 **Node History** (purple, Network icon) - when node editor is focused
- 🔵 **Layer History** (blue, Layers icon) - when layer editor is active
- Only visible when node editor is open
- Tooltip explains how to switch contexts

## What Gets Tracked

### Layer History:
- ✅ Adding/removing layers
- ✅ Reordering layers
- ✅ Changing parameter values
- ✅ Enabling/disabling animations
- ✅ Changing layer settings (expanded, debug)
- ✅ Layer deletion and restoration

### Node History (per network):
- ✅ Adding/removing nodes
- ✅ Moving nodes
- ✅ Connecting/disconnecting edges
- ✅ Changing node parameters
- ❌ Node drag operations (bypassed)

## Benefits of the New System

1. **No Unnecessary Subscriptions**
   - Call `useHistoryStore.getState().undo()` without subscribing
   - Only subscribe to the state you need
   - Better performance

2. **Single Source of Truth**
   - All history logic in one file
   - Easier to understand and maintain
   - No conflicts between multiple stores

3. **Imperative API**
   - Call actions directly without hooks
   - No need to wrap in components
   - Simpler code

4. **Cleaner Architecture**
   - No hooks for business logic
   - Stores are self-contained
   - Clear separation of concerns

5. **Easier Testing**
   - All logic in one place
   - Can test the store directly
   - No need to mock hooks or contexts

## Migration Guide

If you need to update code that used the old system:

### Old Way:
```typescript
// ❌ Using hooks
const { undo, redo, canUndo, canRedo } = useUnifiedHistory();
const { undo: nodeUndo } = useNodeNetworkHistory(networkId);
const setOpenNodeNetwork = useHistoryContextStore(state => state.setOpenNodeNetwork);
```

### New Way:
```typescript
// ✅ Using the unified store
const undo = useHistoryStore((state) => state.undo);
const redo = useHistoryStore((state) => state.redo);
const canUndo = useHistoryStore((state) => state.canUndo());
const canRedo = useHistoryStore((state) => state.canRedo());

// Or imperatively (no subscriptions)
useHistoryStore.getState().undo();
useHistoryStore.getState().redo();

// Context management
const setOpenNodeNetwork = useHistoryStore((state) => state.setOpenNodeNetwork);
```

## Testing

### Manual Test Cases:

1. **Test Layer History**
   ```
   1. Add a layer
   2. Change a parameter value
   3. Press Ctrl+Z → Should undo value change
   4. Press Ctrl+Z → Should undo layer add
   ```

2. **Test Node History**
   ```
   1. Add a layer
   2. Enable animation on a parameter (opens node editor)
   3. Hover over node editor
   4. Add a Sine Wave node
   5. Press Ctrl+Z → Should undo node add
   ```

3. **Test Context Switching**
   ```
   1. Open node editor
   2. Add a node
   3. Hover away from node editor
   4. Press Ctrl+Z → Should undo layer changes, NOT node changes
   ```

4. **Test Animation Enable/Disable**
   ```
   1. Add a layer
   2. Enable animation on a parameter
   3. Press Ctrl+Z → Should disable animation
   4. Press Ctrl+Shift+Z → Should re-enable animation
   ```

## Future Enhancements

1. **History Panel UI**
   - Show list of undo/redo steps
   - Click to jump to any state
   - Visual timeline

2. **Persistent History**
   - Save undo stacks with project
   - Resume after reload

3. **Configurable Limits**
   - Currently 50 steps
   - Make configurable per-context

4. **History Compression**
   - Combine similar consecutive changes
   - Optimize memory usage

## Code Structure

```
src/
├── lib/
│   └── stores/
│       └── history-store.ts          # Single unified history store
├── components/
│   └── editor/
│       ├── history-manager.tsx       # Tracks layer changes
│       └── history-context-indicator.tsx  # Visual indicator
└── app/
    └── page.tsx                      # Mounts HistoryManager
```

## Related Documentation

- `docs/SYSTEM_ARCHITECTURE.md` - Overall app architecture
- `docs/KEYBOARD_SHORTCUTS.md` - Complete shortcut reference
- `docs/interactive-node-flow.md` - Node editor flow

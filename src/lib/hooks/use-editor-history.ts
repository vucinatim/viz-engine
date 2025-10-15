import {
  EditorHistoryState,
  SerializableLayer,
  useEditorHistoryStore,
} from '@/lib/stores/editor-history-store';
import useLayerStore, { LayerData } from '@/lib/stores/layer-store';
import useLayerValuesStore from '@/lib/stores/layer-values-store';
import { useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';

const MAX_HISTORY_SIZE = 50; // Limit history to prevent memory issues

// Serialize layers to a JSON-safe format
function serializeLayers(layers: LayerData[]): SerializableLayer[] {
  return layers.map((layer) => ({
    id: layer.id,
    compName: layer.comp.name,
    layerSettings: JSON.parse(JSON.stringify(layer.layerSettings)),
    isExpanded: layer.isExpanded,
    isDebugEnabled: layer.isDebugEnabled,
  }));
}

// Restore layers from serialized format
function restoreLayers(
  serializedLayers: SerializableLayer[],
  currentLayers: LayerData[],
): LayerData[] {
  // Create a map of current layers by ID for quick lookup
  const currentLayersMap = new Map(
    currentLayers.map((layer) => [layer.id, layer]),
  );

  // Restore ONLY the layers that were in the history state, in that order
  // This handles add/remove/reorder operations correctly
  const restoredLayers: LayerData[] = [];

  for (const serialized of serializedLayers) {
    const currentLayer = currentLayersMap.get(serialized.id);
    if (currentLayer) {
      // Layer exists in current state - restore its settings
      restoredLayers.push({
        ...currentLayer,
        layerSettings: serialized.layerSettings,
        isExpanded: serialized.isExpanded,
        isDebugEnabled: serialized.isDebugEnabled,
      });
    } else {
      // Layer was deleted between when history was saved and now
      // Skip it - it won't be in the restored state
      // This means "undoing to before a layer existed" works correctly
    }
  }

  return restoredLayers;
}

export function useEditorHistory() {
  // Get current state from stores
  const layers = useLayerStore((state) => state.layers);
  const layerValues = useLayerValuesStore((state) => state.values);

  // Get history store
  const {
    history,
    canUndo,
    canRedo,
    isBypassingHistory,
    setHistory,
    resetHistory,
    setBypassHistory,
  } = useEditorHistoryStore();

  // Flag to bypass history recording (for undo/redo operations and programmatic changes)
  const bypassHistoryRef = useRef(false);

  // Debounce timer for value changes (sliders)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize history with current state if empty
  useEffect(() => {
    if (
      history.present.layers.length === 0 &&
      history.past.length === 0 &&
      layers.length > 0
    ) {
      // Initialize present state
      const initialState: EditorHistoryState = {
        layers: serializeLayers(layers),
        layerValues: JSON.parse(JSON.stringify(layerValues)),
      };
      setHistory({
        past: [],
        present: initialState,
        future: [],
      });
    }
  }, [history, layers, layerValues, setHistory]);

  // Push current state to history
  const pushToHistory = useCallback(
    (newState: EditorHistoryState, skipDebounce = false) => {
      // Skip if bypassing history (either via ref or store)
      if (bypassHistoryRef.current || isBypassingHistory) {
        return;
      }

      // Clear any pending debounce
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }

      const executePush = () => {
        // Check if this would be identical to the last saved state
        if (JSON.stringify(newState) === JSON.stringify(history.present)) {
          return;
        }

        // Add current state to past
        const newPast = [...history.past, history.present];

        // Limit history size by removing oldest entries
        if (newPast.length > MAX_HISTORY_SIZE) {
          newPast.shift();
        }

        // Update history
        setHistory({
          past: newPast,
          present: newState,
          future: [], // Clear future (new action destroys redo stack)
        });
      };

      // For value changes, debounce to avoid recording every slider movement
      if (!skipDebounce) {
        debounceTimerRef.current = setTimeout(executePush, 300);
      } else {
        executePush();
      }
    },
    [history, setHistory, isBypassingHistory],
  );

  // Track changes to layers and values
  useEffect(() => {
    if (bypassHistoryRef.current) return;

    const newState: EditorHistoryState = {
      layers: serializeLayers(layers),
      layerValues: JSON.parse(JSON.stringify(layerValues)),
    };

    // Don't debounce structural changes (add/remove/reorder layers)
    const isStructuralChange =
      layers.length !== history.present.layers.length ||
      layers.some(
        (layer, index) => layer.id !== history.present.layers[index]?.id,
      );

    pushToHistory(newState, isStructuralChange);
  }, [layers, layerValues, pushToHistory, history.present]);

  // Helper to flush any pending debounced history push
  const flushPendingHistory = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;

      // Get the latest state directly from stores
      const currentState: EditorHistoryState = {
        layers: serializeLayers(useLayerStore.getState().layers),
        layerValues: JSON.parse(
          JSON.stringify(useLayerValuesStore.getState().values),
        ),
      };

      // Get the latest history state
      const latestHistory = useEditorHistoryStore.getState().history;

      // Check if this would be identical to the last saved state
      if (
        JSON.stringify(currentState) !== JSON.stringify(latestHistory.present)
      ) {
        // Add current state to past
        const newPast = [...latestHistory.past, latestHistory.present];

        // Limit history size
        if (newPast.length > MAX_HISTORY_SIZE) {
          newPast.shift();
        }

        // Update history
        setHistory({
          past: newPast,
          present: currentState,
          future: [], // Clear future (new action destroys redo stack)
        });
      }
    }
  }, [setHistory]);

  // Undo function
  const undo = useCallback(() => {
    // First, flush any pending debounced changes
    flushPendingHistory();

    // After flushing, we need to use the updated history
    const currentHistory = useEditorHistoryStore.getState().history;

    if (currentHistory.past.length === 0) {
      return;
    }

    // Set bypass flags FIRST to prevent the tracking effect from firing
    bypassHistoryRef.current = true;
    setBypassHistory(true);

    // Get previous state
    const previous = currentHistory.past[currentHistory.past.length - 1];
    const newPast = currentHistory.past.slice(0, -1);

    // Move current state to future
    const newFuture = [currentHistory.present, ...currentHistory.future];

    // Update history
    setHistory({
      past: newPast,
      present: previous,
      future: newFuture,
    });

    // Apply state to stores
    applyHistoryState(previous);

    // Show toast notification
    toast.success('Undo', {
      description: `${newPast.length} step${newPast.length !== 1 ? 's' : ''} back available`,
      duration: 1500,
    });

    // Clear bypass flags after React has finished processing effects
    setTimeout(() => {
      bypassHistoryRef.current = false;
      setBypassHistory(false);
    }, 0);
  }, [flushPendingHistory, setHistory, setBypassHistory]);

  // Redo function
  const redo = useCallback(() => {
    // First, flush any pending debounced changes
    flushPendingHistory();

    // After flushing, we need to use the updated history
    const currentHistory = useEditorHistoryStore.getState().history;

    if (currentHistory.future.length === 0) {
      return;
    }

    // Set bypass flags FIRST to prevent the tracking effect from firing
    bypassHistoryRef.current = true;
    setBypassHistory(true);

    // Get next state
    const next = currentHistory.future[0];
    const newFuture = currentHistory.future.slice(1);

    // Move current state to past
    const newPast = [...currentHistory.past, currentHistory.present];

    // Update history
    setHistory({
      past: newPast,
      present: next,
      future: newFuture,
    });

    // Apply state to stores
    applyHistoryState(next);

    // Show toast notification
    toast.success('Redo', {
      description: `${newFuture.length} step${newFuture.length !== 1 ? 's' : ''} forward available`,
      duration: 1500,
    });

    // Clear bypass flags after React has finished processing effects
    setTimeout(() => {
      bypassHistoryRef.current = false;
      setBypassHistory(false);
    }, 0);
  }, [flushPendingHistory, setHistory, setBypassHistory]);

  // Helper to apply a history state to the stores
  const applyHistoryState = (state: EditorHistoryState) => {
    // Get current layers to preserve runtime properties
    const currentLayers = useLayerStore.getState().layers;

    // Restore layers with history state merged into current runtime state
    const restoredLayers = restoreLayers(state.layers, currentLayers);

    // Deep clone layer values to avoid reference issues
    const valuesClone = JSON.parse(JSON.stringify(state.layerValues));

    // Apply to stores
    useLayerStore.setState({ layers: restoredLayers });
    useLayerValuesStore.setState({ values: valuesClone });
  };

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return {
    undo,
    redo,
    canUndo,
    canRedo,
    resetHistory,
    // Expose bypass controls for external use (e.g., during slider drag)
    bypassHistoryRef,
    setBypassHistory,
  };
}

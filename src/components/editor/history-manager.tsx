'use client';

import { useHistoryStore } from '@/lib/stores/history-store';
import useLayerStore from '@/lib/stores/layer-store';
import useLayerValuesStore from '@/lib/stores/layer-values-store';
import { useEffect, useRef } from 'react';
import useNodeNetworkStore from '../node-network/node-network-store';

/**
 * HistoryManager Component
 *
 * This component handles automatic tracking of layer editor changes
 * and pushes them to the history store. It should be mounted once
 * at the top level of the application.
 */
export default function HistoryManager() {
  const layers = useLayerStore((state) => state.layers);
  const layerValues = useLayerValuesStore((state) => state.values);
  const networks = useNodeNetworkStore((state) => state.networks);

  const initializeLayerHistory = useHistoryStore(
    (state) => state.initializeLayerHistory,
  );
  const pushLayerHistory = useHistoryStore((state) => state.pushLayerHistory);
  const isBypassingHistory = useHistoryStore(
    (state) => state.isBypassingHistory,
  );

  const historyPresentRef = useRef<any>(null);

  // Initialize history with current state if empty
  useEffect(() => {
    initializeLayerHistory();
  }, [initializeLayerHistory]);

  // Track changes to layers, values, and network enabled states
  useEffect(() => {
    if (isBypassingHistory) return;

    // Get current history present to compare
    const currentPresent = useHistoryStore.getState().layerHistory.present;

    // Skip if we haven't initialized yet
    if (currentPresent.layers.length === 0 && layers.length === 0) {
      return;
    }

    // Detect structural changes (add/remove/reorder layers or enable/disable networks)
    const isStructuralChange =
      layers.length !== currentPresent.layers.length ||
      layers.some(
        (layer, index) => layer.id !== currentPresent.layers[index]?.id,
      ) ||
      (() => {
        // Check if network enabled states changed
        const currentEnabledStates: Record<string, boolean> = {};
        Object.entries(networks).forEach(([parameterId, network]) => {
          if (network.isEnabled) {
            currentEnabledStates[parameterId] = true;
          }
        });
        return (
          JSON.stringify(currentEnabledStates) !==
          JSON.stringify(currentPresent.networkEnabledStates)
        );
      })();

    pushLayerHistory(!isStructuralChange);
  }, [layers, layerValues, networks, pushLayerHistory, isBypassingHistory]);

  // This component doesn't render anything
  return null;
}

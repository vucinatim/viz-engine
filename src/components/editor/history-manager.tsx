'use client';

import { useHistoryStore } from '@/lib/stores/history-store';
import { useVizSessionSelector } from '@/lib/viz-session';
import { useEffect } from 'react';

/**
 * HistoryManager Component
 *
 * This component handles automatic tracking of layer editor changes
 * and pushes them to the history store. It should be mounted once
 * at the top level of the application.
 */
export default function HistoryManager() {
  const workingProject = useVizSessionSelector((state) => state.project.workingProject);

  const initializeLayerHistory = useHistoryStore(
    (state) => state.initializeLayerHistory,
  );
  const pushLayerHistory = useHistoryStore((state) => state.pushLayerHistory);
  const isBypassingHistory = useHistoryStore(
    (state) => state.isBypassingHistory,
  );

  // Initialize history with current state if empty
  useEffect(() => {
    initializeLayerHistory();
  }, [initializeLayerHistory]);

  // Track changes to the complete canonical working project.
  useEffect(() => {
    if (isBypassingHistory) return;

    // Get current history present to compare
    const currentPresent = useHistoryStore.getState().layerHistory.present;

    // Skip if we haven't initialized yet
    if (
      currentPresent.project.layers.length === 0 &&
      workingProject.layers.length === 0
    ) {
      return;
    }

    const currentGraphStructure = (currentPresent.project.graphs ?? []).map(
      (graph) => [graph.id, graph.enabled ?? true],
    );
    const nextGraphStructure = (workingProject.graphs ?? []).map((graph) => [
      graph.id,
      graph.enabled ?? true,
    ]);

    // Structural edits should enter history immediately. Parameter and node
    // detail edits may still use the existing debounce behavior.
    const isStructuralChange =
      JSON.stringify(workingProject.layerOrder) !==
        JSON.stringify(currentPresent.project.layerOrder) ||
      JSON.stringify(nextGraphStructure) !==
        JSON.stringify(currentGraphStructure);

    pushLayerHistory(!isStructuralChange);
  }, [
    workingProject,
    pushLayerHistory,
    isBypassingHistory,
  ]);

  // This component doesn't render anything
  return null;
}

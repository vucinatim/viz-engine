import { useCallback, useEffect } from 'react';

interface UseKeyboardShortcutsOptions {
  enabled?: boolean;
  undo?: () => void;
  redo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
}

export const useKeyboardShortcuts = ({
  enabled = true,
  undo,
  redo,
  canUndo = false,
  canRedo = false,
}: UseKeyboardShortcutsOptions) => {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modifierKey = isMac ? event.metaKey : event.ctrlKey;

      if (modifierKey && event.key === 'z' && !event.shiftKey) {
        event.preventDefault();
        event.stopPropagation();
        console.log('Undo keyboard shortcut triggered');
        undo?.();
      } else if (
        modifierKey &&
        (event.key === 'y' || (event.key === 'z' && event.shiftKey))
      ) {
        event.preventDefault();
        event.stopPropagation();
        console.log('Redo keyboard shortcut triggered');
        redo?.();
      }
    },
    [enabled, undo, redo],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [handleKeyDown]);

  return {
    canUndo,
    canRedo,
  };
};

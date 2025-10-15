import { useCallback, useEffect, useRef } from 'react';

// Shortcut definition interface
interface ShortcutDefinition {
  key: string;
  ctrl?: boolean;
  cmd?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  callback: () => void;
  enabled?: boolean;
}

interface UseKeyboardShortcutsOptions {
  enabled?: boolean;
  shortcuts: ShortcutDefinition[];
}

export const useKeyboardShortcuts = ({
  enabled = true,
  shortcuts,
}: UseKeyboardShortcutsOptions) => {
  // Use ref to prevent multiple registrations
  const isRegisteredRef = useRef(false);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) {
        return;
      }

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;

      // Check each shortcut
      for (const shortcut of shortcuts) {
        if (!shortcut.enabled) {
          continue;
        }

        // Check if the key matches
        if (event.key.toLowerCase() !== shortcut.key.toLowerCase()) {
          continue;
        }

        // For cross-platform support, treat ctrl/cmd as the same
        const modifierMatch =
          (shortcut.ctrl && (isMac ? event.metaKey : event.ctrlKey)) ||
          (shortcut.cmd && event.metaKey) ||
          (shortcut.meta && event.metaKey) ||
          (!shortcut.ctrl && !shortcut.cmd && !shortcut.meta);

        const shiftMatch =
          shortcut.shift === true ? event.shiftKey : !event.shiftKey;
        const altMatch = shortcut.alt === true ? event.altKey : !event.altKey;

        if (modifierMatch && shiftMatch && altMatch) {
          event.preventDefault();
          event.stopPropagation();
          shortcut.callback();
          break; // Only trigger the first matching shortcut
        }
      }
    },
    [enabled, shortcuts],
  );

  useEffect(() => {
    if (isRegisteredRef.current) {
      return;
    }

    isRegisteredRef.current = true;

    window.addEventListener('keydown', handleKeyDown, true);

    return () => {
      isRegisteredRef.current = false;
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [handleKeyDown]);
};

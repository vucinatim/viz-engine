/**
 * Cross-platform keyboard shortcut utilities
 * Handles differences between Mac (Cmd) and Windows/Linux (Ctrl)
 */

// Detect platform
export const isMac = () =>
  typeof navigator !== 'undefined' &&
  navigator.platform.toUpperCase().indexOf('MAC') >= 0;

// Shortcut modifier keys
export type ShortcutModifier = 'mod' | 'shift' | 'alt' | 'ctrl';

export interface ShortcutConfig {
  key: string;
  modifiers?: ShortcutModifier[];
}

/**
 * Format a shortcut for display in the UI
 * Automatically uses Cmd on Mac and Ctrl on Windows/Linux
 */
export const formatShortcut = (config: ShortcutConfig): string => {
  const { key, modifiers = [] } = config;
  const platform = isMac();

  const symbols: Record<string, { mac: string; win: string }> = {
    mod: { mac: '⌘', win: 'Ctrl' },
    shift: { mac: '⇧', win: 'Shift' },
    alt: { mac: '⌥', win: 'Alt' },
    ctrl: { mac: '⌃', win: 'Ctrl' },
  };

  const parts: string[] = [];

  // Add modifiers in standard order
  const order: ShortcutModifier[] = ['ctrl', 'alt', 'shift', 'mod'];
  for (const modifier of order) {
    if (modifiers.includes(modifier)) {
      const symbol = symbols[modifier];
      parts.push(platform ? symbol.mac : symbol.win);
    }
  }

  // Add the key (uppercase)
  parts.push(key.toUpperCase());

  // Join with + on Windows, no separator on Mac
  return platform ? parts.join('') : parts.join('+');
};

/**
 * Common shortcuts with cross-platform support
 * Use these constants for consistency across the app
 */
export const SHORTCUTS = {
  undo: { key: 'z', modifiers: ['mod'] as ShortcutModifier[] },
  redo: { key: 'z', modifiers: ['mod', 'shift'] as ShortcutModifier[] },
  redoAlt: { key: 'y', modifiers: ['mod'] as ShortcutModifier[] },
  save: { key: 's', modifiers: ['mod'] as ShortcutModifier[] },
  saveAs: { key: 's', modifiers: ['mod', 'shift'] as ShortcutModifier[] },
  open: { key: 'o', modifiers: ['mod'] as ShortcutModifier[] },
  fullscreen: { key: 'f', modifiers: ['ctrl'] as ShortcutModifier[] },
  new: { key: 'n', modifiers: ['mod'] as ShortcutModifier[] },
  copy: { key: 'c', modifiers: ['mod'] as ShortcutModifier[] },
  cut: { key: 'x', modifiers: ['mod'] as ShortcutModifier[] },
  paste: { key: 'v', modifiers: ['mod'] as ShortcutModifier[] },
  selectAll: { key: 'a', modifiers: ['mod'] as ShortcutModifier[] },
  delete: { key: 'backspace', modifiers: [] as ShortcutModifier[] },
  escape: { key: 'escape', modifiers: [] as ShortcutModifier[] },
} as const;

/**
 * Convert ShortcutConfig to the format expected by useKeyboardShortcuts hook
 */
export const toShortcutDefinition = (
  config: ShortcutConfig,
  callback: () => void,
  enabled: boolean = true,
) => {
  const { key, modifiers = [] } = config;

  return {
    key,
    ctrl: modifiers.includes('mod') || modifiers.includes('ctrl'),
    shift: modifiers.includes('shift'),
    alt: modifiers.includes('alt'),
    callback,
    enabled,
  };
};

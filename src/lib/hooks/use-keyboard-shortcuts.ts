import { useEffect, useRef } from 'react';

export interface ShortcutDefinition {
  key: string;
  mod?: boolean;
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

const textEntrySelector = [
  'input',
  'textarea',
  'select',
  '[contenteditable=""]',
  '[contenteditable="true"]',
  '[role="combobox"]',
  '[role="searchbox"]',
  '[role="spinbutton"]',
  '[role="textbox"]',
].join(',');

const interactiveSelector = [
  'a[href]',
  'button',
  '[role="button"]',
  '[role="checkbox"]',
  '[role="menuitem"]',
  '[role="option"]',
  '[role="radio"]',
  '[role="slider"]',
  '[role="switch"]',
  '[role="tab"]',
  textEntrySelector,
].join(',');

const closestMatchingElement = (
  target: EventTarget | null,
  selector: string,
) => (target instanceof Element ? target.closest(selector) : null);

export const isTextEntryShortcutTarget = (target: EventTarget | null) =>
  closestMatchingElement(target, textEntrySelector) !== null;

const isInteractiveShortcutTarget = (target: EventTarget | null) =>
  closestMatchingElement(target, interactiveSelector) !== null;

const hasPrimaryModifier = (shortcut: ShortcutDefinition) =>
  shortcut.mod || shortcut.ctrl || shortcut.cmd || shortcut.meta;

const matchesShortcut = (
  event: KeyboardEvent,
  shortcut: ShortcutDefinition,
): boolean => {
  if (event.key.toLowerCase() !== shortcut.key.toLowerCase()) {
    return false;
  }

  const isMac = navigator.platform.toUpperCase().includes('MAC');
  const expectsPlatformModifier = shortcut.mod === true;
  const expectsMeta = shortcut.cmd === true || shortcut.meta === true;
  const expectedMeta = expectsMeta || (expectsPlatformModifier && isMac);
  const expectedCtrl =
    shortcut.ctrl === true || (expectsPlatformModifier && !isMac);

  return (
    event.metaKey === expectedMeta &&
    event.ctrlKey === expectedCtrl &&
    event.shiftKey === (shortcut.shift === true) &&
    event.altKey === (shortcut.alt === true)
  );
};

export const useKeyboardShortcuts = ({
  enabled = true,
  shortcuts,
}: UseKeyboardShortcutsOptions) => {
  const optionsRef = useRef({ enabled, shortcuts });
  optionsRef.current = { enabled, shortcuts };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const options = optionsRef.current;
      if (!options.enabled || event.defaultPrevented) {
        return;
      }

      for (const shortcut of options.shortcuts) {
        if (shortcut.enabled === false || !matchesShortcut(event, shortcut)) {
          continue;
        }

        if (
          isTextEntryShortcutTarget(event.target) ||
          (!hasPrimaryModifier(shortcut) &&
            isInteractiveShortcutTarget(event.target))
        ) {
          return;
        }

        event.preventDefault();
        event.stopPropagation();
        shortcut.callback();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, []);
};

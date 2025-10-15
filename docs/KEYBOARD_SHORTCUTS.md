# Cross-Platform Keyboard Shortcuts

This system automatically handles keyboard shortcuts for both Mac and Windows/Linux users.

## Features

- **Platform Detection**: Automatically detects Mac vs Windows/Linux
- **Unified API**: Define shortcuts once, work everywhere
- **Smart Display**: Shows `⌘` on Mac, `Ctrl` on Windows
- **Common Shortcuts**: Pre-defined constants for consistency

## Usage

### 1. Import the utilities

```typescript
import {
  SHORTCUTS,
  formatShortcut,
  toShortcutDefinition,
} from '@/lib/utils/keyboard-shortcuts';
```

### 2. Display shortcuts in UI

```typescript
<MenubarShortcut>{formatShortcut(SHORTCUTS.undo)}</MenubarShortcut>
// Mac:     ⌘Z
// Windows: Ctrl+Z
```

### 3. Register shortcuts with the hook

```typescript
useKeyboardShortcuts({
  shortcuts: [
    toShortcutDefinition(SHORTCUTS.undo, handleUndo, canUndo),
    toShortcutDefinition(SHORTCUTS.redo, handleRedo, canRedo),
  ],
});
```

## Available Shortcuts

All shortcuts defined in `SHORTCUTS` constant:

| Shortcut | Mac | Windows | Description |
|----------|-----|---------|-------------|
| `undo` | ⌘Z | Ctrl+Z | Undo action |
| `redo` | ⇧⌘Z | Shift+Ctrl+Z | Redo action |
| `redoAlt` | ⌘Y | Ctrl+Y | Alternative redo |
| `save` | ⌘S | Ctrl+S | Save |
| `saveAs` | ⇧⌘S | Shift+Ctrl+S | Save as |
| `open` | ⌘O | Ctrl+O | Open file |
| `fullscreen` | ⌃F | Ctrl+F | Toggle fullscreen |
| `copy` | ⌘C | Ctrl+C | Copy |
| `cut` | ⌘X | Ctrl+X | Cut |
| `paste` | ⌘V | Ctrl+V | Paste |

## Custom Shortcuts

### Define a custom shortcut

```typescript
const myShortcut = {
  key: 'p',
  modifiers: ['mod', 'shift'] as ShortcutModifier[],
};
```

### Use it in UI

```typescript
<MenubarShortcut>{formatShortcut(myShortcut)}</MenubarShortcut>
// Mac:     ⇧⌘P
// Windows: Shift+Ctrl+P
```

### Register it

```typescript
toShortcutDefinition(myShortcut, handlePreview, true)
```

## Modifiers

Available modifiers:

- `'mod'` - Uses Cmd on Mac, Ctrl on Windows/Linux (most common)
- `'shift'` - Shift key
- `'alt'` - Alt/Option key
- `'ctrl'` - Control key (literal, not platform-aware)

## Why 'mod' instead of 'ctrl'?

The `'mod'` modifier is special - it automatically maps to:
- **Mac**: Command (⌘)
- **Windows/Linux**: Ctrl

This is the standard convention for most app shortcuts (Cmd+C on Mac = Ctrl+C on Windows).

Use `'ctrl'` when you specifically want the Control key, even on Mac (less common).


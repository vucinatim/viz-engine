# Viz Engine - Project Structure

This document provides a complete overview of the project's file structure.

## File Tree

```
├── .DS_Store
├── .cursor/
  ├── rules/
    ├── animation-system.mdc
    ├── development-style.mdc
    ├── live-animation-values.mdc
    ├── project-overview.mdc
├── .eslintignore
├── .eslintrc.json
├── .gitignore
├── .prettierrc
├── .vscode/
  ├── settings.json
├── README.md
├── components.json
├── docs/
  ├── PROJECT_STRUCTURE.md
  ├── README.md
  ├── SYSTEM_ARCHITECTURE.md
  ├── interactive-node-flow.md
  ├── node-output-cache-flow.md
  ├── prompt.txt
  ├── scripts/
    ├── create-tree.ts
    ├── dump-files.ts
    ├── generate-docs.ts
├── next-env.d.ts
├── next.config.mjs
├── package.json
├── playground/
  ├── .DS_Store
  ├── README.md
  ├── index.html
  ├── package.json
  ├── pnpm-lock.yaml
  ├── src/
    ├── .DS_Store
    ├── controls.ts
    ├── main.ts
    ├── models/
      ├── female-dancer.fbx
      ├── female-dj.fbx
      ├── male-cheer.fbx
      ├── male-dancer.fbx
    ├── scene/
      ├── beams.ts
      ├── blinders.ts
      ├── crowd.ts
      ├── dj.ts
      ├── helpers.ts
      ├── lasers.ts
      ├── moving-lights.ts
      ├── shader-wall.ts
      ├── speakers.ts
      ├── stage-lights.ts
      ├── stage.ts
      ├── strobes.ts
      ├── wash-lights.ts
    ├── ui.ts
  ├── style.css
  ├── vite-imports.d.ts
  ├── vite.config.ts
├── pnpm-lock.yaml
├── postcss.config.mjs
├── public/
  ├── logo.png
  ├── music/
    ├── Blaine Stranger - NEV3R.mp3
    ├── C-major.mp3
    ├── Dimension - Altar.mp3
    ├── Friction & Poppy Baskcomb - The Answer.mp3
    ├── Kara - Stuck On Replay.mp3
    ├── Ray Volpe - Laserbeam (Blanke's ÆON_REMIX).mp3
    ├── Sub Focus & Metrik - Trip.mp3
    ├── Watch Me.mp3
    ├── Wilkinson - Balance.mp3
    ├── heartbeat.mp3
  ├── next.svg
  ├── vercel.svg
├── src/
  ├── app/
    ├── audio-files.server.ts
    ├── favicon.ico
    ├── globals.css
    ├── layout.tsx
    ├── page.tsx
  ├── components/
    ├── audio/
      ├── audio-file-loader.tsx
      ├── audio-panel.tsx
      ├── capture-audio.tsx
      ├── live-waveform.tsx
      ├── volume-fader.tsx
    ├── comps/
      ├── curve-spectrum.ts
      ├── debug-animation.ts
      ├── feature-extraction-bars.ts
      ├── heartbeat-monitor.ts
      ├── index.ts
      ├── instanced-supercube.ts
      ├── morph-shapes.ts
      ├── moving-objects.ts
      ├── simple-cube.ts
    ├── config/
      ├── config.tsx
      ├── create-component.ts
      ├── create-node.ts
      ├── dynamic-form.tsx
      ├── math-operations.ts
      ├── node-types.ts
      ├── types.ts
    ├── editor/
      ├── ambient-background.tsx
      ├── animation-builder.tsx
      ├── editor-header.tsx
      ├── editor-layer-search.tsx
      ├── editor-layout.tsx
      ├── editor-toolbar.tsx
      ├── layer-config-card.tsx
      ├── layer-mirror-canvas.tsx
      ├── layer-preview.tsx
      ├── layer-renderer.tsx
      ├── layer-settings.tsx
      ├── layers-config-panel.tsx
      ├── node-editor-toolbar.tsx
      ├── project-dropzone.tsx
      ├── remotion-player.tsx
      ├── renderer.tsx
    ├── node-network/
      ├── animation-nodes.ts
      ├── auto-layout.ts
      ├── bodies/
        ├── adaptive-normalize-quantile-body.tsx
        ├── envelope-follower-body.tsx
        ├── frequency-band-body.tsx
        ├── harmonic-presence-body.tsx
        ├── hysteresis-gate-body.tsx
        ├── normalize-body.tsx
        ├── spectral-flux-body.tsx
        ├── tonal-presence-body.tsx
        ├── value-mapper-body.tsx
      ├── connection-validator.tsx
      ├── live-value.tsx
      ├── node-network-renderer.tsx
      ├── node-network-store.ts
      ├── node-renderer.tsx
      ├── nodes-search.tsx
      ├── presets.ts
    ├── ui/
      ├── button.tsx
      ├── checkbox.tsx
      ├── collapsible-group.tsx
      ├── collapsible.tsx
      ├── color-picker.tsx
      ├── command.tsx
      ├── context-menu.tsx
      ├── dialog.tsx
      ├── dropdown-menu.tsx
      ├── file-input.tsx
      ├── form.tsx
      ├── input.tsx
      ├── label.tsx
      ├── menubar.tsx
      ├── number-scrub-input.tsx
      ├── popover.tsx
      ├── resizable.tsx
      ├── search-select.tsx
      ├── select.tsx
      ├── separator.tsx
      ├── simple-tooltip.tsx
      ├── slider.tsx
      ├── sonner.tsx
      ├── switch.tsx
      ├── ticker-text.tsx
      ├── toggle.tsx
      ├── tooltip.tsx
      ├── vector3-input.tsx
  ├── lib/
    ├── color-utils.ts
    ├── comp-utils/
      ├── audio-utils.ts
      ├── config-utils.ts
      ├── gradient.ts
      ├── mirror-to-canvases.ts
    ├── css/
      ├── xyflow.css
    ├── hooks/
      ├── use-audio-frame-data.ts
      ├── use-canvas-gradient.ts
      ├── use-debug.ts
      ├── use-dimensions.tsx
      ├── use-keyboard-shortcuts.ts
      ├── use-keypress.ts
      ├── use-node-graph-clipboard.ts
      ├── use-node-network-history.ts
      ├── use-on-resize.ts
      ├── use-set-body-props.ts
      ├── use-wavesurfer-setup.ts
    ├── id-utils.ts
    ├── idb-file-store.ts
    ├── idb-json-storage.ts
    ├── project-persistence.ts
    ├── schema-utils.ts
    ├── stores/
      ├── animation-live-values-store.ts
      ├── audio-store.ts
      ├── body-props-store.ts
      ├── comp-store.ts
      ├── editor-store.ts
      ├── layer-store.ts
      ├── layer-values-store.ts
      ├── node-graph-clipboard-store.ts
      ├── node-live-values-store.ts
      ├── node-output-cache-store.ts
    ├── theme/
      ├── audio-theme.ts
    ├── types/
      ├── comp-types.ts
      ├── field-metadata.ts
    ├── utils.ts
  ├── remotion/
    ├── Root.tsx
    ├── index.ts
├── tailwind.config.ts
├── tsconfig.json
├── tsconfig.tsbuildinfo
```

## Summary

- **Total Files**: 197
- **Main Application**: Next.js app in `src/`
- **Playground**: Standalone Three.js playground in `playground/`
- **Documentation**: Project docs in `docs/`
- **Configuration**: Various config files in root directory

## Key Directories

- `src/app/` - Next.js app pages and layout
- `src/components/` - React components organized by feature
- `src/lib/` - Utility functions, hooks, stores, and types
- `playground/src/` - Three.js playground with scene components
- `public/music/` - Audio files for testing
- `docs/` - Project documentation

## Component Organization

- `audio/` - Audio-related components (file loader, panel, capture, etc.)
- `comps/` - Visualization components (spectrum, cubes, shapes, etc.)
- `config/` - Configuration and form components
- `editor/` - Main editor interface components
- `node-network/` - Node-based animation system
- `ui/` - Reusable UI components (shadcn/ui based)

## Libraries and Utilities

- `hooks/` - Custom React hooks
- `stores/` - Zustand state management stores
- `types/` - TypeScript type definitions
- `comp-utils/` - Component utility functions
- `theme/` - Audio visualization themes

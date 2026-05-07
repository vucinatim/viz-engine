# VizEngine Docs

This folder is now the start of the V2 documentation spine for VizEngine.

Start here:

- [docs-index.md](./docs-index.md)
- [current-state.md](./current-state.md)
- [working-agreements.md](./working-agreements.md)
- [visions/viz-engine-v2-vision.md](./visions/viz-engine-v2-vision.md)
- [suggestions.md](./suggestions.md)

The old implementation notes in this folder are still useful reference material,
but they should not be treated as the source of truth for the V2 rewrite.

## Documentation Scripts

VizEngine already has local docs-generation helpers:

```bash
pnpm docs
pnpm docs:dump
pnpm docs:tree
```

These generate structural reference docs such as `PROJECT_STRUCTURE.md`. They
are useful for orientation, but architecture direction should live in the new
docs surfaces above.

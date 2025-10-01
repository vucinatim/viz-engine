# Viz Engine

A web-based, layer-based audio visualization engine built with Next.js, Three.js, and React. Create dynamic audio-reactive visualizations using a powerful node-based animation system.

## Features

- **Layer-based Visualization**: Stack multiple visual components to create complex scenes
- **Node-based Animation**: Animate any property using a powerful node editor
- **Audio Reactivity**: Real-time audio analysis and visualization
- **Live Preview**: See animation changes in real-time
- **Project Persistence**: Save and load your visualization projects

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Documentation

### Project Structure
To generate an up-to-date project structure documentation:

```bash
pnpm docs
```

This creates a comprehensive file tree and documentation in `docs/PROJECT_STRUCTURE.md`.

### Available Scripts

- `pnpm docs` - Generate complete project documentation
- `pnpm docs:dump` - Dump all project files to a list
- `pnpm docs:tree` - Create tree structure from file list

## Learn More

- [Project Structure](./docs/PROJECT_STRUCTURE.md) - Complete file tree and documentation
- [Documentation Generation](./docs/README.md) - How to use the documentation tools
- [Interactive Node Flow](./docs/interactive-node-flow.md) - Node system documentation
- [Node Output Cache Flow](./docs/node-output-cache-flow.md) - Caching system documentation

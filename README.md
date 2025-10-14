# VizEngine

**A Node-Based Web Editor for Customizable Audio-Driven Animations**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Live Demo](https://img.shields.io/badge/demo-live-brightgreen)](https://www.viz-engine.com)

> 🎓 **Academic Project**: This project is the result of a master's thesis in Computer Science. For a comprehensive technical deep-dive, see [the full thesis](docs/thesis-text.md).

**[🚀 Try it live at www.viz-engine.com](https://www.viz-engine.com)**

<p align="center">
  <img src="public/gifs/demo.gif" alt="VizEngine Demo" width="800">
  <br>
  <em>Create audio-reactive visualizations in your browser</em>
</p>

---

VizEngine is an open-source, browser-based visual programming environment for creating audio-reactive visualizations. Built entirely with modern web technologies, it combines a layer-based compositing system with a powerful node-based animation engine to make professional-grade audio visualization accessible to developers and artists alike.

---

## ✨ Key Features

### 🎨 **Hybrid Creative Paradigm**
- **Layer-Based Compositing**: Stack and blend 2D and 3D visual elements with CSS-powered blend modes
- **Node-Based Animation**: Visually program complex behaviors by connecting modular processing nodes
- **Dual Rendering Paths**: Seamlessly mix HTML Canvas 2D graphics with Three.js-powered 3D scenes

### 🎵 **Deep Audio Integration**
- **Real-Time Analysis**: Built-in FFT, RMS, spectral flux, and perceptual feature extraction
- **Live Input Support**: Capture audio from files, microphone, or other browser tabs
- **Musical Intelligence**: Pre-built nodes for kick/snare detection, harmonic analysis, and envelope following

### 🛠️ **Developer-First Design**
- **Declarative API**: Define new visual components and animation nodes with minimal boilerplate
- **Type-Safe & Extensible**: Full TypeScript support with schema-driven configuration
- **Hot Reload Ready**: Auto-discovery of new components during development

### 🎬 **Production Ready**
- **Video Export**: Frame-by-frame rendering to MP4/WebM (720p-4K) with client-side encoding
- **Project Persistence**: Automatic saving to IndexedDB with JSON import/export
- **60 FPS Performance**: Optimized rendering pipeline with memoized computation
- **Frame-Accurate Timing**: Stable 60 FPS clock powered by Remotion

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18+ and **pnpm** (recommended) or npm/yarn
- A modern browser (Chrome/Edge recommended for best Web Audio API support)

### Installation

```bash
# Clone the repository
git clone https://github.com/vucinatim/viz-engine.git
cd viz-engine

# Install dependencies
pnpm install

# Start the development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) and start creating!

---

## 📖 Core Concepts

### The Layer System
A **Layer** is an instance of a visual **Component**. Each layer has:
- **Config**: User-facing parameters (color, size, etc.)
- **State**: Internal data persisted across frames
- **Settings**: Opacity, blend mode, and visibility controls

Layers are rendered to individual `<canvas>` elements and composited by the browser for optimal performance.

### The Node Network
Every animatable parameter can be driven by a **node network**—a directed acyclic graph that computes values in real-time:
- **INPUT Node**: Provides global data (audio signal, time, etc.)
- **Processing Nodes**: Transform data (math, smoothing, audio analysis)
- **OUTPUT Node**: Delivers the final value to the layer parameter

### Architecture Overview

```
┌─────────────────┐
│  Audio Source   │
└────────┬────────┘
         │
    ┌────▼─────────────────┐
    │  Web Audio Pipeline  │  ← FFT, RMS, Time-Domain Analysis
    └────┬─────────────────┘
         │
    ┌────▼──────────────────┐
    │  Node Network Engine  │  ← Lazy evaluation, memoization
    └────┬──────────────────┘
         │
    ┌────▼───────────────────┐
    │  Visualization Engine  │  ← 2D Canvas / Three.js
    └────┬───────────────────┘
         │
    ┌────▼──────────────────┐
    │  Composition Layer    │  ← DOM-based compositing
    └───────────────────────┘
```

---

## 🧩 Extending VizEngine

VizEngine is designed for extensibility. Here's how to add your own visuals and processing nodes.

### Creating a Visual Component

Components are defined using the `createComponent` factory function. Here's a minimal example:

```typescript
// src/components/comps/my-visual.ts
import { createComponent, v } from '@/components/config';
import * as THREE from 'three';

export const MyRotatingCube = createComponent({
  name: 'My Rotating Cube',
  description: 'A simple audio-reactive 3D cube',
  
  // Declarative configuration schema
  config: v.config({
    color: v.color({ 
      label: 'Cube Color',
      defaultValue: '#FF6347' 
    }),
    rotationSpeed: v.number({ 
      label: 'Rotation Speed',
      defaultValue: 1,
      min: -5,
      max: 5
    })
  }),

  // One-time setup for 3D components
  init3D: ({ threeCtx }) => {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardMaterial();
    const cube = new THREE.Mesh(geometry, material);
    threeCtx.scene.userData.cube = cube;
    threeCtx.scene.add(cube);
  },

  // Per-frame rendering
  draw3D: ({ threeCtx, config, dt }) => {
    const cube = threeCtx.scene.userData.cube;
    if (cube) {
      cube.material.color.set(config.color);
      cube.rotation.y += config.rotationSpeed * dt;
    }
  }
});
```

**For 2D components**, implement a `draw` function instead:

```typescript
draw: ({ canvasCtx, config, audioData, width, height }) => {
  canvasCtx.fillStyle = config.color;
  canvasCtx.fillRect(0, 0, width, height);
}
```

### Creating an Animation Node

Nodes are processing units in the animation graph. Here's how to create one:

```typescript
// src/components/config/node-types.ts (or create a new file in /nodes)
import { createNode } from '@/components/config';

export const MyCustomNode = createNode({
  label: 'My Node',
  description: 'Multiplies input by 2',
  
  inputs: [
    { id: 'value', label: 'Input', type: 'number', defaultValue: 0 }
  ],
  
  outputs: [
    { id: 'result', label: 'Output', type: 'number' }
  ],

  computeSignal: ({ value }) => {
    return { result: value * 2 };
  }
});
```

**For stateful nodes** (e.g., smoothing over time):

```typescript
createState: () => ({ previousValue: 0 }),

computeSignal: ({ value, attack, release }, context, node) => {
  const state = node.data.state as { previousValue: number };
  const smoothed = /* ...your smoothing logic... */;
  state.previousValue = smoothed;
  return { result: smoothed };
}
```

---

## 📁 Project Structure

```
viz-engine/
├── src/
│   ├── app/                    # Next.js app router
│   ├── components/
│   │   ├── comps/              # Visual components (add yours here!)
│   │   ├── config/             # createComponent & createNode APIs
│   │   ├── editor/             # Main editor UI
│   │   ├── node-network/       # Node editor UI
│   │   ├── audio/              # Audio controls
│   │   └── ui/                 # Reusable UI primitives (shadcn/ui)
│   ├── lib/
│   │   ├── stores/             # Zustand state stores
│   │   ├── hooks/              # Custom React hooks
│   │   └── types/              # TypeScript definitions
│   └── remotion/               # Remotion player integration
├── public/
│   ├── music/                  # Sample audio files
│   └── projects/               # Example .vizengine.json projects
└── docs/                       # Technical documentation
```

---

## 🛠️ Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server |
| `pnpm build` | Build for production |
| `pnpm start` | Run production build |
| `pnpm lint` | Run ESLint |
| `pnpm docs` | Generate project documentation |

---

## 🤝 Contributing

We welcome contributions! Whether you're:
- 🎨 **Creating visual components** for the community library
- 🔧 **Building new audio analysis nodes**
- 🐛 **Fixing bugs** or improving performance
- 📚 **Writing documentation** or tutorials

### Contribution Workflow

1. **Fork** the repository
2. **Create a branch** for your feature (`git checkout -b feature/amazing-visual`)
3. **Add your component** to `src/components/comps/` (it will auto-register!)
4. **Test** your changes thoroughly
5. **Commit** with clear messages (`git commit -m 'Add: Amazing Particle System'`)
6. **Push** and open a **Pull Request**

### Development Guidelines

- **TypeScript**: Use strict typing for all new code
- **Components**: Follow the declarative `createComponent` pattern
- **Performance**: Test with multiple layers and complex node networks
- **Documentation**: Add JSDoc comments to exported functions

---

## 🏗️ Architecture & Technology Stack

### Core Technologies
- **Next.js 14** - Application framework
- **React 18** - UI library
- **TypeScript** - Type safety
- **Three.js** - 3D rendering (WebGL)
- **Web Audio API** - Real-time audio analysis

### Key Libraries
- **Zustand** - Lightweight state management
- **Remotion** - Frame-accurate timing & playback control
- **@xyflow/react** - Node editor canvas
- **Radix UI + shadcn/ui** - Accessible UI components
- **dnd-kit** - Drag & drop for layer reordering
- **WaveSurfer.js** - Audio waveform visualization

---

## 📚 Documentation

- **[System Architecture](docs/SYSTEM_ARCHITECTURE.md)** - Detailed architectural overview
- **[Stage Scene Component](docs/STAGE_SCENE_COMPONENT.md)** - Complex 3D example walkthrough
- **[Layer Blending Showcase](docs/LAYER_BLENDING_SHOWCASE.md)** - Multi-layer compositing guide
- **[Interactive Node Flow](docs/interactive-node-flow.md)** - Node system deep-dive
- **[Full Thesis](docs/thesis-text.md)** - Complete academic documentation

---

## 🎯 Roadmap

### Short Term
- [ ] Comprehensive test suite (unit + visual regression)
- [ ] Expand node library (BPM detection, more audio features)
- [ ] Keyframe-based animation system
- [ ] Undo/redo history

### Medium Term
- [ ] Video export functionality (render to MP4)
- [ ] Web Workers for node computation (off main thread)
- [ ] WebAssembly for performance-critical nodes
- [ ] Post-processing effects (bloom, DOF)
- [ ] Component marketplace/gallery

### Long Term
- [ ] Cloud-based project storage
- [ ] Real-time collaboration (multiplayer editing)
- [ ] AI-powered component generation
- [ ] DMX/Art-Net for physical lighting control

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

This project was created as part of a master's thesis at the University of Ljubljana, Faculty of Computer and Information Science, under the supervision of doc. dr. Aleš Smrdel.

**Inspired by:**
- TouchDesigner (Derivative)
- cables.gl
- Hydra (Olivia Jack)
- The creative coding community

---

## 🔗 Links

- **Live Demo**: [www.viz-engine.com](https://www.viz-engine.com)
- **Issue Tracker**: [GitHub Issues](https://github.com/vucinatim/viz-engine/issues)
- **Discussions**: [GitHub Discussions](https://github.com/vucinatim/viz-engine/discussions)

---

<p align="center">
  Made with ❤️ for the web audio-visual community
  <br>
  <sub>If VizEngine helps your project, consider giving it a ⭐</sub>
</p>

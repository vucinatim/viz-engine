# VizEngine

**A Web-Native Audio-Reactive Animation Engine, now entering a V2 rewrite**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Live Demo](https://img.shields.io/badge/demo-live-brightgreen)](https://www.viz-engine.com)
[![Thesis](https://img.shields.io/badge/Read_The_Thesis-PDF-orange)](docs/viz-engine-thesis.pdf)

**[🚀 Try the Editor Live at viz-engine.com](https://www.viz-engine.com)**

<p align="center">
  <img src="public/gifs/demo.gif" alt="VizEngine Demo" width="800">
  <br>
  <em>Create audio-reactive visuals in your browser. (Yes, it actually exports video.)</em>
</p>

>ℹ️ **Project Status:** VizEngine V1 proved the core concept. The repo is now
> entering a V2 full-replacement rewrite focused on a deterministic runtime,
> AI-native scene authoring, and clean Magnify Core integration.

---

**VizEngine** is a web-native tool designed to bridge the gap between simple
creative coding sketches and complex professional software like TouchDesigner.

V1 combines a **layer-based workflow** (like Photoshop) with a **node-based
animation engine**, allowing you to build complex, reactive scenes using
standard web technologies.

V2 is intended to turn VizEngine into:

- a deterministic visual runtime
- a browser-based editor for that runtime
- an AI-native scene system
- a clean rendering attachment for Magnify Core

Start here for the rewrite:

- [docs/docs-index.md](docs/docs-index.md)
- [docs/current-state.md](docs/current-state.md)
- [docs/working-agreements.md](docs/working-agreements.md)
- [docs/visions/viz-engine-v2-vision.md](docs/visions/viz-engine-v2-vision.md)
- [docs/plans/v2/v2-foundation-and-rewrite-plan.md](docs/plans/v2/v2-foundation-and-rewrite-plan.md)

## ✨ Features

### 🎨 Hybrid Creative Workflow
* **Layers:** Stack visual elements using a familiar interface. Layers are composited using the DOM and CSS hardware acceleration.
* **Nodes:** Animate *any* parameter (color, position, opacity) by connecting it to audio analyzers in a visual graph.
* **3D + 2D:** Seamlessly mix HTML5 Canvas shaders with Three.js 3D scenes in the same composition.

### 🎵 Professional Audio Architecture
* **Dual-Path Audio Engine:** The system separates "Playback" from "Analysis." You hear high-fidelity audio, while the visualization engine gets raw, zero-latency data for tighter sync.
* **Smart Triggers:** Includes pre-built detection nodes for **Kick/Snare isolation**, **Melody detection**, and **Harmonic Presence**.

### 🎬 Native Video Export (No Screen Recording)
* **Offline Rendering:** Unlike screen recorders which lag if the frame rate drops, VizEngine recalculates every frame deterministically offline.
* **High Quality:** It uses `ffmpeg.wasm` to encode smooth 60 FPS video (MP4/WebM) directly in your browser—no server required.

---

## 🚀 Quick Start

### Prerequisites
* **Node.js** 18+ and **pnpm** (recommended)

### Installation

```bash
# Clone the repository
git clone [https://github.com/vucinatim/viz-engine.git](https://github.com/vucinatim/viz-engine.git)
cd viz-engine

# Install dependencies
pnpm install

# Start the local editor
pnpm dev

```

Open [http://localhost:3000](https://www.google.com/search?q=http://localhost:3000) to start creating.

---

## 🆚 Why VizEngine?

| Feature | VizEngine | TouchDesigner | cables.gl |
| --- | --- | --- | --- |
| **Platform** | **Web-Native** (Browser) | Desktop App | Web-Based |
| **License** | **Open Source (MIT)** | Proprietary / Paid | Proprietary / Freemium |
| **Paradigm** | **Hybrid** (Layers + Nodes) | Node-Based Dataflow | Node-Based Visual |
| **Export** | **Client-Side Video (MP4)** | Real-time / Spout | Real-time |
| **Goal** | Shareable Audio-Visuals | Live Events | Interactive Web Art |

---

## 🏗️ Architecture & Performance

This engine was engineered to prove that the web is ready for serious motion graphics. During thesis stress-testing (rendering 8.3 million pixels with active node networks), it achieved:
* **M1 Pro:** 111.6 FPS Mean 
* **RTX 2060:** 84.4 FPS Mean 
* **Node Overhead:** Less than 0.2ms per frame 

It achieves this via **DOM-based compositing** (giving every layer its own lightweight canvas) and a **Strict Schema System** that ensures type safety and performance.

---

## 🧩 Developer Guide

VizEngine is designed to be hacked on. You can add your own custom visuals using a simple, typed API.
> Additions to the visuals and nodes are very welcome!

### 💡 AI Coding Tip

The API uses a strict schema, which makes it remarkably easy for LLMs to write code for.

**Try it yourself:**
Ask ChatGPT: *"Write a VizEngine component that draws a bouncing circle using the 2D context."*  
> Tip: Paste in some example code from `/src/comps` to give it context.

### Creating a Component

Use the `createComponent` factory. The UI controls are auto-generated from your config.

```typescript
// src/components/comps/my-visual.ts
import { createComponent, v } from '@/components/config';
import * as THREE from 'three';

export const RotatingCube = createComponent({
  name: 'Rotating Cube',

  // 1. Define parameters (UI is auto-generated!)
  config: v.config({
    color: v.color({ defaultValue: '#FF6347' }),
    speed: v.number({ defaultValue: 1, min: 0, max: 5 })
  }),

  // 2. Setup (Runs once)
  init3D: ({ threeCtx }) => {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardMaterial();
    threeCtx.scene.userData.cube = new THREE.Mesh(geometry, material);
    threeCtx.scene.add(threeCtx.scene.userData.cube);
  },

  // 3. Render Loop (60 FPS)
  draw3D: ({ threeCtx, config, dt }) => {
    const cube = threeCtx.scene.userData.cube;
    cube.material.color.set(config.color);
    cube.rotation.y += config.speed * dt;
  }
});

```

---

## 🎯 V2 Direction

The current direction is a full replacement rewrite.

Key rules:

- no legacy compatibility layer by default
- no dead code or dead folders preserved for comfort
- salvage proven ideas selectively
- rebuild runtime boundaries cleanly
- keep live, render, and bake as first-class modes
- keep Remotion as an adapter, not the source-of-truth architecture

## 🎯 Roadmap

### V1 Roadmap Notes

These roadmap notes reflect the old engine direction and should now be treated
as reference material, not the canonical V2 execution plan.

### Core & Ecosystem

* [ ] **`rhythm-core` Package**: Developing a standalone "Librosa for TypeScript" library for offline rhythmic analysis and feature extraction (active).
* [ ] **VizEngine Runtime**: A lightweight NPM package to render project JSONs inside any React application.
* [ ] **WebGPU Support**: Exploring next-gen rendering pipelines for massive particle systems.
* [ ] **Renderer Agnosticism**: Abstracting the engine to support renderers beyond Three.js (e.g., Babylon.js, p5.js).

### Editor & Workflow

* [ ] **AI Assistant**: LLM integration for generating components and natural language editor control.
* [ ] **Meta Nodes**: Ability to group and collapse complex node graphs.
* [ ] **Keyframe Editor**: Manual animation curves to blend with audio-reactive values.
* [ ] **Popout Preview**: Detachable preview window for multi-monitor setups.

### Audio & IO

* [ ] **MIDI Integration**: Input for parameter control and Output for sending processed signals to hardware.
* [ ] **Advanced Audio Sources**: Robust streaming from microphone and external audio inputs.



---

## 📄 License

This project is licensed under the **MIT License**.

**Academic Note:** *This project was originally developed as a Master's Thesis at the University of Ljubljana. For a detailed breakdown of the algorithms and architecture, please [read the thesis PDF](https://www.google.com/search?q=docs/viz-engine-thesis.pdf).*

# Layer Blending Showcase Documentation

## Overview

The **Layer Blending Showcase** is a complete example project demonstrating the power of **layer compositing with different blending modes**. It combines four distinct visual components—each on its own layer with unique blending settings—to create a cohesive, audio-reactive visual experience.

**Location**: `public/projects/layer-blending-showcase.vizengine.json`

## Key Concept: Layer Blending

Unlike a single component rendering to the screen, this example uses **multiple layers** that composite together using CSS blend modes. Each layer:
- Renders to its own canvas
- Has independent opacity and background settings
- Applies a **blending mode** that determines how it combines with layers below it
- Can be frozen (paused) or active (animated)

This creates visually rich compositions that would be impossible with a single component.

## The Four Layers

### Layer 1: Fullscreen Shader (Background Base)
**Component**: `Fullscreen Shader`  
**Blending Mode**: `normal` (default)  
**Background**: `rgb(10, 10, 10)` (near-black)  
**Opacity**: `1.0`  
**Frozen**: `true`  

This layer provides the **foundational animated pattern** that other layers blend with.

#### Configuration
```json
{
  "shader": "Radial Ripple Grid",
  "color": "rgb(71, 119, 134)",  // Teal-blue
  "speed": 0.1,
  "scale": 1.2,
  "intensity": 3,
  "offsetX": 0,
  "offsetY": 0
}
```

#### How It Works
The Radial Ripple Grid shader creates expanding circular ripples that travel outward from the center. The shader:
1. Generates a grid pattern (horizontal and vertical lines)
2. Creates multiple expanding ripples with staggered timing
3. Lights up the grid lines where ripples pass
4. Applies a soft vignette for visual focus

The teal-blue color provides a cool, technical aesthetic that serves as the base for warmer tones to blend with.

---

### Layer 2: Noise Shader (Multiply Texture)
**Component**: `Noise Shader`  
**Blending Mode**: `multiply` ⭐ **Key Feature**  
**Background**: `rgba(10, 10, 10, 1)` (opaque near-black)  
**Opacity**: `1.0`  
**Frozen**: `true`

This layer uses **multiply blending** to add **organic texture** over the background. Multiply blending darkens the image, creating shadows and depth.

#### Configuration (Preset: "Smoke")
```json
{
  "noise": {
    "type": "perlin",
    "scale": 0.6,
    "octaves": 2,
    "lacunarity": 3,
    "gain": 0.3
  },
  "animation": {
    "speed": 7,
    "flowX": 0,
    "flowY": 0,
    "rotationSpeed": 0
  },
  "distortion": {
    "enabled": true,
    "amount": 4,
    "scale": 1.5
  },
  "color": {
    "mode": "monochrome",
    "color1": "#ffffff",
    "saturation": 0
  },
  "output": {
    "brightness": 1.49,
    "contrast": 3,
    "invert": true,
    "posterize": 0
  }
}
```

#### How It Works
The Noise Shader generates procedural Perlin noise with:
- **Domain distortion** for organic, flowing shapes
- **High contrast** (3.0) to create sharp boundaries
- **Inverted colors** to produce white smoke on black
- **Fast animation** (speed 7) for active movement

When multiplied with Layer 1, the **white areas remain visible** while **black areas darken** the underlying ripple grid, creating a smoky, turbulent overlay effect.

---

### Layer 3: Neural Network (3D Focal Point)
**Component**: `Neural Network`  
**Blending Mode**: `normal`  
**Background**: `rgba(10, 10, 10, 0)` (transparent)  
**Opacity**: `1.0`  
**Frozen**: `true`

This layer adds **3D depth** and serves as the **visual focal point** with glowing neurons and traveling signal orbs.

#### Configuration
```json
{
  "neuronCount": 30,
  "seed": 42,
  "tubeRadius": 0.25,
  "neuronColor": "#00CED1",          // Cyan
  "somaEmission": "rgb(255, 138, 201)", // Hot pink
  "emissiveIntensity": 2,
  "metalness": 0,
  "roughness": 0.9,
  "fresnelPower": 3,
  "growth": 1,
  "dendriteReach": 20,
  "trigger": false,
  "signalSpeed": 30,
  "signalSize": 0.2,
  "activationDecay": 0.4,
  "postProcessing": {
    "bloom": false,
    "bloomStrength": 0.2,
    "bloomRadius": 0.8,
    "bloomThreshold": 0.3,
    "depthOfField": false,
    "dofFocus": 10,
    "dofAperture": 0.0005
  }
}
```

#### How It Works
The Neural Network component creates:
1. **30 procedurally-generated neurons** positioned in 3D space
2. **Organic dendrite connections** between nearby neurons (using seeded random generation)
3. **Custom shaders** for realistic Fresnel rim lighting
4. **Traveling signal orbs** when triggered (hot pink glowing spheres)
5. **Camera positioned inside** the network for immersive "flying through the brain" effect
6. **Slow rotation** for gentle movement

The transparent background allows the neurons to float over the textured layers below, creating a sense of depth.

#### Audio Reactivity
The neural network has **3 audio-reactive node networks**:

1. **`postProcessing.dofFocus`** → Slow sine wave animation
   - Shifts focus depth smoothly over time
   
2. **`trigger`** → Kick detection chain
   - Fires neural signals on kick drum hits
   
3. **`seed`** → Snare-based counter with rate limiting
   - Regenerates the neuron structure on snare hits (max once per 4 seconds)

---

### Layer 4: Strobe Light (Impact Flash)
**Component**: `Strobe Light`  
**Blending Mode**: `soft-light` ⭐ **Key Feature**  
**Background**: `rgba(10, 10, 10, 1)` (opaque near-black)  
**Opacity**: `1.0`  
**Frozen**: `true`

This layer provides **intense fullscreen flashes** that interact with all layers below using soft-light blending.

#### Configuration
```json
{
  "mode": "Intensity",
  "color": "#ffffff",
  "intensity": 10.5,
  "strength": 1,
  "dutyCycle": 0.3,
  "flashRate": 0.3
}
```

#### How It Works
The Strobe Light component renders a fullscreen quad with:
- **Intensity mode**: Automatic flashing based on intensity parameter
- **Flash frequency**: `intensity = 10.5` means ~10.5 flashes per second when active
- **Duty cycle**: `0.3` means flash is ON for 30% of each cycle (short, punchy flashes)
- **Additive blending** in shader for bright flash effect

The **soft-light blending mode** makes the strobe:
- **Brighten bright areas** more than dark areas
- **Preserve color** of underlying layers
- Create a **subtle, cinematic flash** rather than a harsh white-out

#### Audio Reactivity
The strobe has **2 audio-reactive node networks**:

1. **`strength`** → Kick + Bass combined intensity
   - Kick band (80-150Hz) → Adaptive normalize
   - Bass band (20-163Hz) → Adaptive normalize
   - Takes max of both signals
   - Envelope follower for smooth decay
   - Scaled to 2.5x

2. **`intensity`** → Kick + Bass dual-path intensity
   - Similar to strength network
   - Controls flash frequency (higher = faster flashing)
   - Scaled to 15x for high-speed strobing

---

## Blending Modes Explained

### Normal (Layers 1 & 3)
Standard alpha compositing. The layer is drawn on top, respecting opacity.
- Layer 1 (Radial Ripple Grid): Base pattern
- Layer 3 (Neural Network): 3D elements on top

### Multiply (Layer 2)
Multiplies the color values of the current layer with layers below.
- **White (1.0)** has no effect (1.0 × underlying = underlying)
- **Black (0.0)** darkens to pure black (0.0 × underlying = 0)
- **Gray (0.5)** darkens by 50%

**Visual Effect**: The white smoke from the Noise Shader acts as a **reveal/mask**, while black areas darken the ripple grid, creating organic shadows and depth.

### Soft-Light (Layer 4)
A gentler version of overlay blending.
- **50% gray** has no effect
- **Lighter than 50%** brightens the underlying layer (dodging)
- **Darker than 50%** darkens the underlying layer (burning)

**Visual Effect**: The white strobe flash **brightens** the entire composition in a **subtle, cinematic way** without blowing out colors or details. It preserves the teal and pink hues while adding intensity.

---

## Complete Audio-Reactive Signal Flow

This example demonstrates **complex multi-layer audio reactivity** where different musical elements control different aspects of the visualization.

### Neural Network Layer - Trigger Network

**Parameter**: `layer-Neural Network-1760370435624:trigger`

**Signal Chain**:
```
Kick Band (80-150Hz) 
  → Band Info (average)
  → Envelope Follower (6ms attack, 120ms release)
  → Adaptive Normalize (window: 4s, qLow: 0.5, qHigh: 0.98, freeze: 140)
  → Hysteresis Gate (low: 0.33, high: 0.45)
  → Output (0 or 1)
```

**Purpose**: Fires neural signals (glowing orbs traveling along dendrites) on kick drum hits.

**How It Works**:
1. Isolates kick frequency range (80-150Hz)
2. Extracts average energy in that band
3. Smooths with envelope (fast attack for transient, medium release for tail)
4. Adaptively normalizes to handle varying track loudness
5. Gates to binary on/off with hysteresis to prevent flickering
6. Output 1 triggers all neurons to fire, output 0 is inactive

**Musical Effect**: Every kick drum visually "fires" the neural network, creating a strong connection between the low-end rhythm and the 3D visual.

---

### Neural Network Layer - Seed Network

**Parameter**: `layer-Neural Network-1760370435624:seed`

**Signal Chain**:
```
Snare Band (50-150Hz)
  → Band Info (average)
  → Envelope Follower (4ms attack, 140ms release)
  → Adaptive Normalize (window: 4s, qLow: 0.5, qHigh: 0.95, freeze: 90)
  → Hysteresis Gate (low: 0.06, high: 0.14)
  → Threshold Counter (max: 1000)
  → Rate Limiter (min interval: 4000ms)
  → Output (number)
```

**Purpose**: Changes the neuron structure on snare hits, but **no more than once every 4 seconds**.

**How It Works**:
1. Detects snare hits using mid-low frequency range (50-150Hz)
2. Uses **very low gate thresholds** (0.06-0.14) to catch subtle snares
3. Increments a counter on each detected snare hit
4. Rate limiter prevents structure changes faster than every 4 seconds
5. Output value changes the seed parameter, which fully regenerates the neuron graph

**Musical Effect**: The neuron structure evolves with the song's rhythm, but changes are **dramatic and infrequent**, creating visual variety without chaos.

---

### Neural Network Layer - DOF Focus Network

**Parameter**: `layer-Neural Network-1760370435624:postProcessing:dofFocus`

**Signal Chain**:
```
Input Time
  → Sine (frequency: 0.2, phase: 0, amplitude: 1)
  → Math Add (a: 1, b: 0) [normalize to 0-2]
  → Math Multiply (a: result, b: 19.5) [scale to 0-39]
  → Math Add (a: 1, b: result) [offset]
  → Output (1-40)
```

**Purpose**: Slowly shifts the depth of field focus distance back and forth.

**How It Works**:
1. Uses time-based sine wave (frequency 0.2 = ~5-second cycle)
2. Sine output is -1 to +1
3. Adds 1 to normalize to 0-2 range
4. Multiplies by 19.5 to scale to 0-39
5. Adds 1 to offset to final range of 1-40

**Musical Effect**: Creates a **breathing, meditative effect** where different depths of the neural network come in and out of focus. Not directly audio-reactive—provides a **constant, calming motion** that contrasts with the reactive trigger/seed parameters.

---

### Strobe Light Layer - Strength Network

**Parameter**: `layer-Strobe Light-1760375514040:strength`

**Signal Chain**:
```
Kick Band (80-150Hz) → Band Info → Adaptive Normalize (qHigh: 0.98) ──┐
                                                                        ├→ Math.max 
Bass Band (20-163Hz) → Band Info → Adaptive Normalize (qHigh: 0.9) ───┘
  → Envelope Follower (5ms attack, 500ms release)
  → Math Multiply (×2.5)
  → Output (0-2.5)
```

**Purpose**: Controls the **brightness/opacity** of each strobe flash.

**How It Works**:
1. Processes **two parallel paths**: kick (80-150Hz) and bass (20-163Hz)
2. Each path gets adaptive normalization (kick is more selective with qHigh 0.98, bass is looser with 0.9)
3. Takes **maximum** of the two signals (responds to whichever is stronger)
4. Smooths with envelope follower (**very slow 500ms release** for sustained brightness)
5. Scales by 2.5 for amplified effect

**Musical Effect**: Strobe brightness **follows the combined power of kick and bass**, creating bright flashes on heavy hits and sustained glow during bass-heavy sections.

---

### Strobe Light Layer - Intensity Network

**Parameter**: `layer-Strobe Light-1760375514040:intensity`

**Signal Chain**:
```
Kick Band (80-150Hz) → Band Info → Adaptive Normalize (qHigh: 0.98) ──┐
                                                                        ├→ Math.max
Bass Band (20-163Hz) → Band Info → Adaptive Normalize (qHigh: 0.9) ───┘
  → Envelope Follower (5ms attack, 150ms release)
  → Math Multiply (×15)
  → Output (0-15)
```

**Purpose**: Controls the **flash frequency** (how fast the strobe flashes per second).

**How It Works**:
1. **Identical to strength network** through the max operation
2. Uses **faster release** (150ms vs 500ms) for more responsive frequency changes
3. Scales by **15x** instead of 2.5x (intensity parameter allows higher values)

**Musical Effect**: The strobe **flashes faster** during intense kick/bass sections. During quieter parts, flashing slows down or stops completely.

**Combined Effect**: Both networks work together:
- High intensity + high strength = **fast, bright flashing** (intense sections)
- High intensity + low strength = **fast, dim flashing** (rhythmic but subtle)
- Low intensity + high strength = **slow, bright flashing** (sparse impacts)
- Low intensity + low strength = **no flashing** (quiet sections)

---

## Rendering Flow

### Layer Compositing Order (Bottom to Top)

```
┌─────────────────────────────────────┐
│  Layer 4: Strobe Light              │ ← soft-light blend
│  (White flashes, brightens scene)   │
├─────────────────────────────────────┤
│  Layer 3: Neural Network            │ ← normal blend
│  (3D neurons, transparent bg)       │
├─────────────────────────────────────┤
│  Layer 2: Noise Shader              │ ← multiply blend
│  (White smoke, darkens with black)  │
├─────────────────────────────────────┤
│  Layer 1: Fullscreen Shader         │ ← normal blend (base)
│  (Teal ripple grid)                 │
└─────────────────────────────────────┘
```

### Compositing Logic

1. **Layer 1** (Radial Ripple Grid) renders first
   - Creates teal animated ripple pattern
   - Provides base luminance and color

2. **Layer 2** (Noise Shader) multiplies on top
   - White smoke areas: `white × ripple = ripple` (no change)
   - Black smoke areas: `black × ripple = black` (darkens)
   - Creates organic texture and depth

3. **Layer 3** (Neural Network) renders normally on top
   - 3D neurons appear to float above the textured background
   - Transparent background allows layers below to show through
   - Adds cyan and pink colors to the teal/white palette

4. **Layer 4** (Strobe Light) soft-light blends with all below
   - Bright flashes lighten the entire composition
   - Preserves underlying colors and details
   - Creates cinematic impact without harsh white-out

---

## Color Palette

The example uses a **complementary color scheme** with cool cyans and warm pinks:

| Element | Color | Hex/RGB | Purpose |
|---------|-------|---------|---------|
| Ripple Grid | Teal-blue | `rgb(71, 119, 134)` | Base pattern, cool technical aesthetic |
| Noise Smoke | Monochrome | White/Black | Texture and depth (no color) |
| Neuron Dendrites | Cyan | `#00CED1` | Cool, electric feel |
| Neuron Soma Glow | Hot Pink | `rgb(255, 138, 201)` | Warm contrast, focal point |
| Signal Orbs | Hot Pink | `rgb(255, 138, 201)` | Draws eye during firing |
| Strobe Flash | White | `#ffffff` | Pure intensity, color-neutral |

**Color Theory**:
- **Cyan + Pink**: Complementary colors (opposite sides of color wheel)
- **Teal base**: Provides calm, stable foundation
- **Pink accents**: Create visual interest and warmth
- **White strobe**: Neutral, preserves color balance during flashes
- **Monochrome smoke**: Adds depth without muddying the palette

---

## Performance Considerations

### Layer Freezing
All layers are set to `freeze: true`, which means:
- Layers are **pre-rendered once** (or updated only when config changes)
- **No continuous re-rendering** unless animating parameters via node networks
- Excellent performance for complex multi-layer compositions

### Canvas Rendering
Each layer renders to its own `<canvas>` element:
- Layer canvases are **stacked using CSS** with `position: absolute`
- Blending modes applied via CSS `mix-blend-mode` property
- Browser GPU handles compositing efficiently

### Resolution Multiplier
The project uses `resolutionMultiplier: 2`, meaning:
- Each canvas is **2x native resolution**
- Crisp visuals on high-DPI displays (Retina, 4K)
- Requires more GPU memory and fill rate
- Trade-off: quality vs performance

### Complexity Budget

| Layer | Complexity | Rendering Cost |
|-------|-----------|----------------|
| Fullscreen Shader | Low | Fullscreen quad, simple grid shader |
| Noise Shader | Medium | Fullscreen quad, procedural noise with FBM |
| Neural Network | High | 30 neurons × tubes + spheres, custom shaders |
| Strobe Light | Very Low | Fullscreen quad, single color |

**Total**: Medium-High complexity  
**Target**: 60 FPS on modern GPU  
**Bottleneck**: Neural Network geometry and signal orbs

---

## Node Network Signal Processing Patterns

This example showcases several **advanced signal processing techniques**:

### 1. Dual-Path Frequency Analysis
Used in both strobe networks (strength and intensity).

**Pattern**:
```
Freq Band A → Process → ┐
                        ├→ Math.max → Output
Freq Band B → Process → ┘
```

**Benefit**: Responds to **multiple musical elements** simultaneously. Takes the stronger signal, ensuring the visual reacts to whichever is most prominent.

**Example**: Strobe responds to both kick (80-150Hz) and bass (20-163Hz), catching both sharp transients and sustained low-end.

---

### 2. Envelope + Adaptive Normalize Chain
Used in all audio-reactive networks.

**Pattern**:
```
Signal → Envelope Follower → Adaptive Normalize → Gate/Output
```

**Benefit**: 
- **Envelope**: Smooths out rapid fluctuations (attack/release)
- **Adaptive Normalize**: Automatically adjusts for different tracks' loudness
- **Gate**: Clean on/off transitions without flickering

**Example**: Neural trigger network can work with quiet acoustic tracks or loud EDM without manual adjustment.

---

### 3. Rate Limiting for Discrete Events
Used in neural seed network.

**Pattern**:
```
Event Detector → Counter → Rate Limiter (min interval) → Output
```

**Benefit**: Prevents **visual overload** from rapid, repetitive events. Ensures dramatic events (like neuron regeneration) happen at a **controlled pace**.

**Example**: Seed network could trigger on every snare hit (potentially 4+ per second), but rate limiter caps it to **once every 4 seconds maximum**.

---

### 4. Time-Based Oscillation (Non-Reactive)
Used in DOF focus network.

**Pattern**:
```
Time → Sine Wave → Scale/Offset → Output
```

**Benefit**: Creates **predictable, meditative motion** that provides visual interest without being reactive. Balances the chaotic nature of audio-reactive parameters.

**Example**: DOF focus slowly cycles independent of music, creating a breathing effect that doesn't compete with reactive elements.

---

## How to Use This Example

### Loading the Project
1. Open the viz-engine app
2. Click **"File" → "Load Project"** (or use the dropzone)
3. Navigate to `public/projects/layer-blending-showcase.vizengine.json`
4. Project loads with all 4 layers configured

### Exploring Layers
1. **Layer Panel** (left side) shows all 4 layers
2. Click a layer to **select it** and view its settings
3. **Layer Settings** tab shows:
   - Visibility toggle
   - Background color
   - Opacity slider
   - **Blending mode selector** ⭐
   - Freeze toggle

### Experimenting with Blending Modes

Try changing Layer 2 (Noise Shader) blending mode:
- **Normal**: Smoke appears on top (blocks ripple grid)
- **Multiply**: Current setting (darkens, creates texture)
- **Screen**: Lightens (inverted effect)
- **Overlay**: Strong contrast (combines multiply and screen)
- **Hard-light**: More aggressive version of soft-light

Try changing Layer 4 (Strobe) blending mode:
- **Soft-light**: Current setting (subtle, cinematic)
- **Normal**: Opaque white flash (harsh)
- **Add**: Bright additive flash (intense)
- **Overlay**: High-contrast flash

### Understanding Node Networks
1. Select a layer
2. Find a parameter with a **network icon** (e.g., Neural Network → `trigger`)
3. Click the **network icon** to open the node editor
4. See the complete signal processing chain
5. Experiment with node parameters to see how they affect the output

### Creating Your Own Blend Stack
Use this project as a template:
1. **Start with a base layer** (normal blend, opaque background)
2. **Add textural layers** (multiply/overlay for depth)
3. **Add focal point layers** (normal blend, transparent background)
4. **Add effect layers** (soft-light/add for flashes, glows)

**Pro Tip**: Keep the **layer count low** (3-5 layers). More layers = more GPU overhead and visual confusion.

---

## Technical Implementation Details

### Component Sources

| Component | File | Lines of Code |
|-----------|------|---------------|
| Fullscreen Shader | `src/components/comps/fullscreen-shader.ts` | 368 |
| Noise Shader | `src/components/comps/noise-shader.ts` | 1219 |
| Neural Network | `src/components/comps/neural-network.ts` | 1334 |
| Strobe Light | `src/components/comps/strobe-light.ts` | 257 |

### Shader Technologies

#### Fullscreen Shader
- **Vertex Shader**: Simple fullscreen quad
- **Fragment Shader**: Custom ripple grid with:
  - Hash-based pseudo-random ripple timing
  - Multiple concurrent ripples (max 3)
  - Exponential falloff for soft edges
  - Grid-based pattern lighting

#### Noise Shader
- **Vertex Shader**: Simple fullscreen quad
- **Fragment Shader**: Comprehensive noise library with:
  - Simplex noise (smooth, continuous)
  - Perlin noise (classic gradient noise)
  - FBM (Fractal Brownian Motion, up to 8 octaves)
  - Voronoi noise (cellular pattern)
  - Cellular noise (animated Worley noise)
  - Domain distortion for organic shapes
  - RGB ↔ HSV color space conversion

#### Neural Network
- **Vertex Shader**: Custom per-neuron shading with:
  - Normal transformation
  - View position calculation
  - Local position pass-through
  
- **Fragment Shader**: Physically-based look with:
  - Fresnel rim lighting (configurable power)
  - Diffuse + ambient lighting
  - Metalness and roughness
  - Distance-based color variation

#### Strobe Light
- **Vertex Shader**: Simple fullscreen quad
- **Fragment Shader**: Minimal flash shader with:
  - Color uniform
  - Strength uniform
  - Alpha output for transparency

---

## Project File Structure

The `.vizengine.json` file contains:

```json
{
  "version": "1.0.0",
  "layerStore": {
    "layers": [ /* 4 layer definitions */ ]
  },
  "layerValuesStore": {
    "values": { /* Configuration for each layer */ }
  },
  "nodeNetworkStore": {
    "networks": { /* 7 node networks for audio reactivity */ }
  },
  "editorStore": {
    "playerFPS": 60,
    "ambientMode": false,
    "resolutionMultiplier": 2
  }
}
```

### Layer Definitions
Each layer in `layerStore.layers` includes:
- `id`: Unique layer identifier
- `comp.name`: Component name (e.g., "Fullscreen Shader")
- `layerSettings`:
  - `visible`: Boolean visibility toggle
  - `background`: CSS color (rgba supported)
  - `opacity`: 0-1 opacity value
  - `blendingMode`: CSS blend mode string
  - `freeze`: Boolean freeze toggle

### Layer Values
Each layer's config is stored in `layerValuesStore.values` under its layer ID.

**Example** (Fullscreen Shader):
```json
"layer-Fullscreen Shader-1760370419586": {
  "shader": "Radial Ripple Grid",
  "color": "rgb(71, 119, 134)",
  "speed": 0.1,
  "scale": 1.2,
  "intensity": 3,
  "offsetX": 0,
  "offsetY": 0
}
```

### Node Networks
Each network in `nodeNetworkStore.networks` includes:
- `name`: Network identifier (format: `layerId:parameterPath`)
- `isEnabled`: Boolean enable toggle
- `nodes`: Array of node definitions (id, type, position, data)
- `edges`: Array of connections between nodes

**Example** (Neural trigger network):
```json
"layer-Neural Network-1760370435624:trigger": {
  "name": "layer-Neural Network-1760370435624:trigger",
  "isEnabled": true,
  "nodes": [ /* 7 nodes: Input → Band → Info → Envelope → Normalize → Gate → Output */ ],
  "edges": [ /* 6 connections between nodes */ ]
}
```

---

## Advanced Techniques Demonstrated

### 1. **Layer Isolation**
Each component renders in complete isolation:
- Own Three.js scene
- Own camera
- Own renderer context
- No cross-layer interference

**Benefit**: Components can be developed independently and **composed flexibly** without worrying about conflicts.

---

### 2. **Declarative Blending**
Blending modes are **declarative settings**, not code:
- Change blend mode in UI → instant visual update
- No shader code changes needed
- Easy experimentation

**Benefit**: Designers can **explore blending combinations** without programming knowledge.

---

### 3. **Frozen Layer Optimization**
Layers marked as `freeze: true` are cached:
- Rendered once on initialization
- Updated only when config changes
- Node networks can still animate frozen layers

**Benefit**: **Heavy 3D scenes** (like Neural Network) have minimal performance impact when frozen but still respond to audio.

---

### 4. **Transparent Backgrounds**
Layer 3 (Neural Network) uses `background: "rgba(10, 10, 10, 0)"`:
- **Alpha = 0** makes background fully transparent
- 3D elements render normally
- Layers below show through empty space

**Benefit**: Creates **depth and floating effects** impossible with opaque backgrounds.

---

### 5. **Multi-Network Parameters**
Strobe Light has **two separate networks** controlling `strength` and `intensity`:
- Networks can have different signal chains
- Both process the same audio input differently
- Parameters interact to create complex behavior

**Benefit**: **Rich, multi-dimensional** audio reactivity from a simple component.

---

### 6. **Preset-Based Configuration**
Noise Shader uses the "Smoke" preset:
- 13 included presets (Plasma Wave, Lava Lamp, Aurora, Fire, etc.)
- Preset = complete config state snapshot
- Easy A/B comparison

**Benefit**: **Rapid iteration** and creative exploration. Users can try different looks instantly.

---

## Comparison to Stage Scene Component

| Aspect | Stage Scene | Layer Blending Showcase |
|--------|-------------|-------------------------|
| **Structure** | Single component | 4 components on separate layers |
| **Complexity** | High (many 3D elements) | Medium (distributed across layers) |
| **Blending** | None (single render) | 3 different blend modes |
| **Background** | Fog + lighting | Layer compositing |
| **Audio Reactivity** | 13 default networks | 7 networks across layers |
| **Camera** | 3 modes (manual, WASD, cinematic) | Per-layer (Layer 3 has positioned camera) |
| **Post-Processing** | Bloom only | Bloom + DOF (Layer 3) |
| **Use Case** | Complete 3D concert scene | Demonstrating layer blending techniques |
| **Performance** | Heavy (many lights, crowd) | Medium (distributed GPU load) |

**Key Difference**: Stage Scene is a **single, complete experience**. Layer Blending Showcase is a **composition of independent components** that work together through blending.

---

## When to Use Layer Blending

### Good Use Cases ✅

1. **Combining 2D and 3D**
   - 2D shader backgrounds with 3D focal points
   - Example: This showcase (2D ripples + 3D neurons)

2. **Textural Overlays**
   - Add grain, noise, or film effects over any visual
   - Example: Multiply blend smoke/noise for organic texture

3. **Impact Effects**
   - Fullscreen flashes, glows, or vignettes
   - Example: Soft-light strobe for cinematic flash

4. **Performance Optimization**
   - Freeze heavy layers, animate only lightweight overlays
   - Example: Freeze Neural Network, animate Noise Shader

5. **Modular Composition**
   - Build library of reusable layer components
   - Mix and match for different projects

### Poor Use Cases ❌

1. **Single, Integrated Scenes**
   - If everything should move together, use a single component
   - Example: Stage Scene (all elements share camera/lighting)

2. **Performance-Critical Applications**
   - Layer compositing has overhead (multiple canvases, blend modes)
   - Single component is faster if blending isn't needed

3. **Simple Visualizations**
   - Overkill for basic audio visualizers
   - Single component is simpler to understand

---

## Learning Outcomes

After studying this example, you should understand:

1. ✅ How **CSS blend modes** create complex visuals from simple layers
2. ✅ How to use **multiply blending** for texture and shadows
3. ✅ How to use **soft-light blending** for subtle lighting effects
4. ✅ How **transparent backgrounds** create depth
5. ✅ How **frozen layers** optimize performance while staying reactive
6. ✅ How **multiple node networks** on one component create rich behavior
7. ✅ How **dual-path frequency analysis** responds to multiple musical elements
8. ✅ How **rate limiting** controls the pace of dramatic events
9. ✅ How to **balance reactive and non-reactive parameters** for visual coherence
10. ✅ How to structure a **multi-layer project file** for reusability

---

## Extending This Example

### Ideas for Experimentation

1. **Swap Layer 1**
   - Try "Voronoi Flow" shader instead of "Radial Ripple Grid"
   - Experiment with different colors (try warm oranges vs cool teals)

2. **Change Noise Preset**
   - Try "Plasma Wave" (colorful, trippy)
   - Try "Lava Lamp" (warm, organic)
   - Compare multiply vs screen blend mode

3. **Add a 5th Layer**
   - Add another Fullscreen Shader on top
   - Use overlay or color-dodge blend mode
   - Create a vignette or border effect

4. **Modify Neural Networks**
   - Change seed network to trigger on higher frequencies (hi-hats)
   - Add a network to control `neuronCount` based on overall energy
   - Connect `growth` to a slow sine wave for breathing neurons

5. **Custom Color Palettes**
   - **Warm Palette**: Orange ripples, red neurons, yellow strobe
   - **Neon Palette**: Magenta ripples, lime neurons, cyan strobe
   - **Monochrome**: All layers grayscale, rely on blending for depth

6. **Performance Testing**
   - Unfreeze all layers → measure FPS
   - Increase Neural Network neuronCount to 50 → observe impact
   - Add more signal orbs (lower `activationDecay`) → stress test

---

## Troubleshooting

### Strobe Is Too Intense
- **Lower `intensity`** parameter (flash frequency)
- **Lower `strength`** parameter (flash brightness)
- **Increase `dutyCycle`** (longer ON time = less stroboscopic)
- **Change blend mode** from soft-light to normal with low opacity

### Neural Network Appears Too Bright
- **Lower `emissiveIntensity`**
- **Disable bloom** post-processing
- **Increase `roughness`** to reduce reflections

### Noise Shader Blocks Everything
- **Check blend mode** - should be multiply, not normal
- **Check background alpha** - should be opaque (alpha = 1)
- **Verify layer order** - Noise should be Layer 2, not Layer 4

### Performance Is Low
- **Freeze more layers** - only animate what needs to move
- **Lower `resolutionMultiplier`** from 2 to 1
- **Reduce Neural Network `neuronCount`**
- **Disable depth of field** on Neural Network
- **Check browser GPU acceleration** is enabled

### Layers Aren't Blending
- **Verify background color has alpha > 0** for lower layers
- **Check blend mode is not 'normal'** for overlay layers
- **Verify layer visibility** is enabled
- **Check layer order** in layer panel (drag to reorder)

---

**Last Updated**: October 2025  
**Project Version**: 1.0.0  
**Example Complexity**: Medium-Advanced  
**Recommended Knowledge**: Basic understanding of layers, blending modes, and node networks  

---

**Related Documentation**:
- [Stage Scene Component](./STAGE_SCENE_COMPONENT.md) - Single-component 3D concert scene
- [Project Structure](./PROJECT_STRUCTURE.md) - Understanding viz-engine project organization
- [System Architecture](./SYSTEM_ARCHITECTURE.md) - How the layer rendering system works


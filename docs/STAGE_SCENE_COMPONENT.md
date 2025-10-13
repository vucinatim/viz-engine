# Stage Scene Component Documentation

## Overview

The **Stage Scene** is a complete 3D EDM stage visualization component built with Three.js. It creates an immersive concert environment with dynamic lighting, laser effects, animated crowds, and audio-reactive elements.

**Location**: `src/components/comps/stage-scene.ts`

## Key Features

- Full 3D concert stage with DJ booth and crowd
- Multiple lighting systems (moving lights, lasers, beams, strobes, blinders, wash lights)
- Fractal shader wall visualization
- Animated DJ and crowd characters (using FBX models)
- Three camera modes: Manual, WASD Fly Mode, and Cinematic
- Bloom post-processing effects
- Audio-reactive default networks

## Architecture

### Component Structure

The Stage Scene is created using the `createComponent` factory pattern and consists of three main sections:

1. **Config** - User-configurable parameters for all scene elements
2. **State** - Internal component state and update functions
3. **Lifecycle Methods**:
   - `init3D` - Scene initialization
   - `draw3D` - Per-frame update logic

### Direct Playground Imports

The Stage Scene **directly imports scene creation functions from the playground folder**:

**From**: `playground/src/scene/`

- `beams.ts` - Beam light effects
- `blinders.ts` - Blinder spotlight effects
- `crowd.ts` - Instanced crowd with animated FBX models
- `dj.ts` - Animated DJ character
- `helpers.ts` - Debug helpers
- `lasers.ts` - Laser beam and sheet effects
- `moving-lights.ts` - Moving head spotlights
- `overhead-blinder.ts` - Overhead flood light
- `shader-wall.ts` - Fractal shader visualization wall
- `speakers.ts` - Speaker stack geometry
- `stage-lights.ts` - Static stage edge lights
- `stage.ts` - Stage, ground, and DJ booth geometry
- `strobes.ts` - Strobe light effects
- `wash-lights.ts` - Soft wash lighting

**Config Types**: `playground/src/scene-config.ts`

## Configuration Structure

The component exposes the following configuration groups:

### Camera Group
- **Position** (Vector3): Camera XYZ position
- **Rotation** (Vector3): Camera rotation in radians (Pitch, Yaw, Roll)
- **Enter WASD Mode** (Button): Activates fly controls with pointer lock
- **Move Speed** (Number): Movement speed in fly mode (1-100)
- **Look Sensitivity** (Number): Mouse sensitivity in fly mode (0.0001-0.01)
- **Cinematic Mode** (Toggle): Enable automated camera paths
- **Cinematic Path** (Select): Choose from predefined paths:
  - `Panoramic Sweep` (default)
  - `Stage Circle`
  - `Crowd Flyover`
  - `High Orbit`
- **Loop Duration** (Number): Duration of one camera loop (10-300s)
- **Look At Target** (Vector3): Where camera should look
- **Camera Smoothness** (Number): Lerp speed (0.01-1)

### Shader Wall Group
- **Enabled** (Toggle)
- **Scale** (Number): Fractal zoom/size (0.5-4.0)
- **Rotation Speed** (Number): Spin speed (0-3)
- **Color Speed** (Number): Color cycling speed (0-3)
- **Travel Speed** (Number): Tunnel movement speed (0-3)
- **Brightness** (Number): Overall intensity (0-5)

### Lighting Group
- **Hemisphere Intensity** (Number): 0-5
- **Ambient Intensity** (Number): 0-5

### Post Processing Group
- **Bloom Enabled** (Toggle)
- **Bloom Strength** (Number): 0-3
- **Bloom Radius** (Number): 0-1
- **Bloom Threshold** (Number): 0-1

### Lasers Group
- **Enabled** (Toggle)
- **Mode** (Select): `auto` | `0` | `1` | `2` | `3` | `4`
  - Mode 0: Wave
  - Mode 1: Wobble
  - Mode 2: Sheet
  - Mode 3: Hybrid Flash
  - Mode 4: Hybrid Sweep
- **Color Mode** (Select): `multi` | `single`
- **Color** (Color): Used when in single mode
- **Speed** (Number): Rotation speed (0-3)
- **Max Active Lasers** (Number): 1-12

### Moving Lights Group
- **Enabled** (Toggle)
- **Mode** (Select): `auto` | `0` | `1` | `2` | `3` | `4`
  - Mode 0: Sweeping
  - Mode 1: Circular
  - Mode 2: Wave
  - Mode 3: Center Focus
  - Mode 4: Random Chase
- **Color Mode** (Select): `multi` | `single`
- **Color** (Color): Used when in single mode
- **Intensity** (Number): 0-20
- **Speed** (Number): Movement speed (0-3)

### Beams Group
- **Enabled** (Toggle)
- **Mode** (Select): `auto` | `0` | `1` | `2` | `3` | `4` | `5` | `6`
  - Mode 0: Mirrored Wave
  - Mode 1: Strobe
  - Mode 2: Center Cross
  - Mode 3: Outward Fan
  - Mode 4: Crowd Sweep
  - Mode 5: Crowd Lift
  - Mode 6: Pulsing Wings
- **Color Mode** (Select): `multi` | `single`
- **Color** (Color): Used when in single mode
- **Intensity** (Number): 0-3

### Stage Lights Group
- **Enabled** (Toggle)
- **Color** (Color): Stage edge light color

### Stage Wash Group
- **Enabled** (Toggle)
- **Intensity** (Number): 0-50

### Strobes Group
- **Enabled** (Toggle)
- **Intensity** (Number): Brightness (0-1000)
- **Flash Rate** (Number): How often strobes flash (0-1)

### Blinders Group
- **Enabled** (Toggle)
- **Mode** (Select): `controlled` | `random`
- **Intensity** (Number): 0-1 (triggers above 0.3 in controlled mode)

### Overhead Blinder Group
- **Enabled** (Toggle)
- **Intensity** (Number): 0-200

### Accent Lights Group
- **Enabled** (Toggle)
- **Light 1 Color** (Color)
- **Light 2 Color** (Color)
- **DJ Spotlight** (Number): Intensity 0-5

### Characters Group
- **Show DJ** (Toggle): Show/hide DJ character
- **Crowd Count** (Number): Number of crowd members (0-1000)

### Debug Group
- **Show Helpers** (Toggle): Show debug helpers

## State Management

The component maintains the following state:

### Scene Elements
- `djBooth`: DJ booth mesh
- `stageGeometry`: Stage box geometry
- `shaderWall`: Shader wall mesh
- `helpersGroup`: Debug helpers group
- `beamGroup`: Beam effects group
- `djModel`: DJ character group
- `crowdMesh`: Instanced crowd mesh

### Lights
- `hemisphereLight`: Hemisphere light
- `ambientLight`: Ambient light
- `light1`, `light2`: Animated accent lights
- `djSpotLight`: DJ spotlight

### Update Functions
Each scene element has an update function stored in state:
- `updateStageLights`
- `updateWashLights`
- `updateMovingLights`
- `updateLasers`
- `updateBeams`
- `updateStrobes`
- `updateBlinders`
- `updateShaderWall`
- `updateShaderWallResolution`
- `updateOverheadBlinder`
- `updateDj`
- `updateCrowd`

### Cleanup Functions
- `removeDj`: Remove DJ from scene
- `removeCrowd`: Remove crowd from scene

### Post-Processing
- `bloomPass`: UnrealBloomPass instance

### Camera Control State
- `wasdModeActive`: Boolean flag for fly mode
- `keysPressed`: Object tracking pressed keys
- Event listeners: `onKeyDown`, `onKeyUp`, `onMouseMove`, `onPointerLockChange`

### Cinematic Camera State
- `cinematicPath`: CatmullRomCurve3 path
- `cinematicPosition`: Current path position
- `cinematicLookAt`: Look-at target
- `prevCinematicPathName`: Track path changes

### Timing
- `elapsedTime`: Accumulated time for animations

## Initialization (init3D)

The `init3D` method sets up the entire scene:

### 1. Camera Setup
```typescript
camera.position.set(config.camera.position.x, y, z);
camera.rotation.order = 'YXZ'; // FPS-style controls
```

### 2. Cinematic Path Initialization
Creates a `CatmullRomCurve3` from predefined waypoints based on selected path.

### 3. Scene Fog
```typescript
scene.fog = new THREE.FogExp2(0x000000, 0.008);
```

### 4. Global Lighting
- Hemisphere light (sky: 0x8888ff, ground: 0xff8844)
- Ambient light (white)

### 5. Scene Elements (in order)
1. **Stage** - `createStage(scene)` - Returns djBooth and stageGeometry
2. **Shader Wall** - `createShaderWall(scene, speakerBoxGeometry, renderer)`
3. **Speaker Stacks** - `createSpeakerStacks(scene, ...)`
4. **Stage Lights** - `createStageLights(scene, stageGeometry, djBooth, config)`
5. **Wash Lights** - `createWashLights(scene, config)`
6. **Moving Lights** - `createMovingLights(scene, config)` - 8 spotlights
7. **Lasers** - `createLasers(scene, config)` - 12 lasers (beams + sheets)
8. **Beams** - `createBeams(scene, config)` - 6 beam lights
9. **Strobes** - `createStrobes(scene, config)` - 10 strobe units
10. **Blinders** - `createBlinders(scene, config)` - 2 blinders (left/right)
11. **Overhead Blinder** - `createOverheadBlinder(scene, config)` - RectAreaLight
12. **Debug Helpers** - `createDebugHelpers(scene)`
13. **DJ** - `createDj(scene)` - Async FBX model loading
14. **Crowd** - `createCrowd(scene, showHelpers, count)` - Instanced mesh

### 6. Accent Lights Setup
- Two animated point lights (magenta/cyan)
- DJ spotlight from above

### 7. Post-Processing
Adds `UnrealBloomPass` to composer if available.

## Render Loop (draw3D)

The `draw3D` method runs every frame:

### 1. Time Management
```typescript
state.elapsedTime += dt;
```

### 2. WASD Camera Mode
When activated:
- Sets up keyboard and mouse event listeners
- Requests pointer lock
- Handles WASD + Space/Shift movement
- Mouse controls pitch/yaw
- ESC to exit

When deactivated:
- Removes all event listeners
- Exits pointer lock
- Syncs camera position/rotation back to config

### 3. Cinematic Camera Mode
If enabled and valid path exists:
- Calculates progress along curve based on elapsed time and duration
- Gets position from `cinematicPath.getPointAt(progress)`
- Lerps camera position smoothly
- Points camera at look-at target

### 4. Manual Camera Mode
If neither WASD nor cinematic is active:
- Directly sets camera position/rotation from config

### 5. Dynamic Resolution Updates
Checks if renderer size changed and updates shader wall resolution.

### 6. Dynamic DJ/Crowd Updates
- Monitors `config.characters.showDj` changes
- Monitors `config.characters.crowdCount` changes
- Recreates DJ/crowd as needed

### 7. Lighting Updates
Updates hemisphere and ambient light intensities from config.

### 8. Scene Element Updates
Calls update functions for each element with current config:
- Beams
- Stage Lights
- Wash Lights
- Shader Wall (passes time and config)
- Lasers (passes time and config)
- Moving Lights (passes time and config)
- Strobes
- Blinders
- Overhead Blinder (passes time and config)

### 9. Accent Lights Animation
Animates position based on sine/cosine of elapsed time.

### 10. Debug Helpers
Sets visibility based on config.

### 11. Character Animations
- Updates DJ mixer animation
- Updates crowd skeleton animations

### 12. Post-Processing
Updates bloom parameters from config.

### 13. Final Render
```typescript
renderer.render(scene, camera);
```

## Default Networks (Audio Reactivity)

The component includes default node network connections for audio reactivity:

```typescript
defaultNetworks: {
  'blinders.intensity': 'hihat-adaptive',
  'beams.mode': 'beam-mode-melody-cycle',
  'beams.intensity': 'kick-bass-smooth-intensity',
  'strobes.flashRate': 'strobe-buildup-detector',
  'lasers.enabled': 'laser-high-energy-gate',
  'lasers.mode': 'laser-mode-section-cycle',
  'movingLights.mode': 'moving-lights-kick-cycle',
  'shaderWall.scale': 'shader-wall-bass-pulse',
  'shaderWall.rotationSpeed': 'shader-wall-rotation-kick-vocal',
  'shaderWall.travelSpeed': 'shader-wall-travel-snare-cycle',
  'stageLights.color': 'stage-lights-snare-color-cycle',
  'shaderWall.brightness': 'shader-wall-kick-flash',
  'overheadBlinder.intensity': 'overhead-blinder-big-impact',
}
```

These connect component parameters to preset node networks for automatic audio-reactive behavior.

## Detailed Component Breakdown

### Stage (`stage.ts`)

**Purpose**: Creates the base stage structure

**Elements Created**:
- Ground plane (400x400, dark gray)
- Stage platform (125x3x25 box, dark gray)
- DJ booth (8x3x6 box, positioned at y=4.5, z=-2)

**Returns**: `{ ground, stage, djBooth, stageGeometry }`

---

### Shader Wall (`shader-wall.ts`)

**Purpose**: Creates a raymarched fractal visualization wall

**Technology**: Custom GLSL shader with Mandelbox SDF

**Elements Created**:
- Main wall panel (20x10 grid size)
- Two angled side panels
- All share same shader material

**Shader Features**:
- Mandelbox fractal raymarching
- Domain repetition for infinite tunnel effect
- Animatable scale, rotation, color speed, travel speed, brightness
- Uses world position for continuous visualization across panels

**Uniforms**:
- `u_time`: Elapsed time
- `u_resolution`: Renderer resolution
- `u_scale`: Fractal zoom
- `u_rotationSpeed`: Rotation animation speed
- `u_colorSpeed`: Color cycling speed
- `u_travelSpeed`: Forward movement speed
- `u_brightness`: Overall brightness multiplier

**Update Function**: Updates uniforms based on config

**Resolution Update**: Handles renderer size changes

---

### Speakers (`speakers.ts`)

**Purpose**: Creates curved speaker stacks on both sides of the wall

**Elements Created**:
- 7 speaker boxes per stack
- 2 stacks (left and right)
- First 3 boxes are straight, remaining 4 curve backward

**Positioning**: Based on main wall width + gap

**Material**: Dark gray with roughness

---

### Beams (`beams.ts`)

**Purpose**: Creates volumetric beam effects from stage

**Elements Created**:
- 6 cylindrical beam meshes
- Custom shader material with Y-axis and view-dependent falloff

**Shader Features**:
- Additive blending
- Transparency with depth write off
- Flicker effect
- Configurable color and intensity

**Modes (7 total)**:
- Mode 0: Mirrored Wave
- Mode 1: Strobe (fast random)
- Mode 2: Center Cross
- Mode 3: Outward Fan
- Mode 4: Crowd Sweep
- Mode 5: Crowd Lift (side pairs + middle)
- Mode 6: Pulsing Wings with crossing

**Update Logic**: Smoothly interpolates to target rotations (0.1 lerp factor)

**Auto Mode**: Cycles through modes every 8 seconds

---

### Lasers (`lasers.ts`)

**Purpose**: Creates laser beam and sheet effects

**Elements Created**:
- 12 beam lasers (thin cylinders)
- 12 sheet lasers (V-shaped triangle meshes)
- 2 static sheet lasers (left/right)

**Shader Materials**:
- Beam shader: Y-axis falloff with power curve
- Sheet shader: Edge glow detection, animated spread

**Modes (5 total)**:
- Mode 0: Wave (beams only)
- Mode 1: Wobble (beams only)
- Mode 2: Sheet (sheets only, alternating active)
- Mode 3: Hybrid Flash (static sheets + flashing beams)
- Mode 4: Hybrid Sweep (static sheets + sweeping beams)

**Features**:
- Configurable max concurrent lasers
- Single/multi color modes
- Animated spread for sheets
- Rotation and movement animations

**Auto Mode**: Cycles through modes every 8 seconds

---

### Moving Lights (`moving-lights.ts`)

**Purpose**: Creates moving head spotlights

**Elements Created**:
- 8 spotlights with target objects
- Positioned across truss at y=35, z=-15

**Spotlight Properties**:
- Distance: 150
- Angle: π/12
- Penumbra: 0.3
- Decay: 0

**Modes (5 total)**:
- Mode 0: Sweeping (left-right synchronized)
- Mode 1: Circular (lights move in circular pattern)
- Mode 2: Wave (wave pattern across lights)
- Mode 3: Center Focus (converge/spread)
- Mode 4: Random Chase (independent movement)

**Update Logic**: Target position animated based on mode and time

**Auto Mode**: Cycles through modes every 8 seconds

---

### Strobes (`strobes.ts`)

**Purpose**: Creates strobe light effects

**Elements Created**:
- 10 strobe units
- Each unit has body mesh + light part
- Positioned across stage at y=3.5, z=0

**Strobe Unit**:
- Body: 2x1x1.5 box (dark)
- Light part: 1.7x0.8x0.3 box with emissive material

**Update Logic**:
- Random selection based on flash rate
- Emissive intensity set to config intensity when active
- All others set to 0

**Flash Rate**: 0 = never flash, 1 = constant flashing

---

### Blinders (`blinders.ts`)

**Purpose**: Creates powerful blinder spotlights

**Elements Created**:
- 2 spotlights (left/right)
- Positioned at x=±45, y=25, z=20
- Aimed toward front stage

**Spotlight Properties**:
- Color: Warm white (0xfff0dd)
- Max intensity: 15000
- Distance: 600
- Angle: π/4 (45°)
- Penumbra: 0.3
- Decay: 2

**Modes**:
- **Random**: Random flash effect with setTimeout
- **Controlled**: On/off based on intensity threshold (0.3)

---

### Overhead Blinder (`overhead-blinder.ts`)

**Purpose**: Creates overhead flood light for drops/impacts

**Elements Created**:
- 1 RectAreaLight (80x40)
- Positioned at y=60, z=-5
- Aimed downward at stage

**Properties**:
- Color: White
- Configurable intensity (0-200)

**Use Case**: Big impacts, drops, climactic moments

---

### Stage Lights (`stage-lights.ts`)

**Purpose**: Creates static edge lights around stage

**Elements Created**:
- 3 edge bars (front, left, right) with emissive material
- 2 DJ uplights (spotlights aimed at DJ booth)

**Edge Bars**:
- Color: Configurable
- Emissive intensity: 4
- Positioned at stage edges

**DJ Uplights**:
- Color: Purple (0x7d40ff)
- Intensity: 3
- Positioned at x=±15, y=4, z=8

---

### Wash Lights (`wash-lights.ts`)

**Purpose**: Creates soft wash lighting for stage

**Elements Created**:
- 2 RectAreaLights (50x20)
- Positioned at x=±30, y=25, z=10
- Aimed at stage center

**Properties**:
- Color: Blue (0x5566ff)
- Configurable intensity (0-50)

---

### DJ (`dj.ts`)

**Purpose**: Loads and animates DJ character

**Model**: `female-dj.fbx` (cached)

**Properties**:
- Scale: 0.032
- Position: (0, 3.4, -7) - on stage behind booth
- Shadow casting/receiving enabled

**Animation**:
- Uses first animation clip from FBX
- AnimationMixer updates in draw loop

**Lifecycle**:
- Async loading from model cache
- Update function for mixer
- Remove function for cleanup

---

### Crowd (`crowd.ts`)

**Purpose**: Creates instanced crowd with skeletal animation

**Models Used** (randomly selected):
- `female-dancer.fbx`
- `male-dancer.fbx`
- `male-cheer.fbx`

**Technology**: GPU-accelerated instanced skinned mesh

**Features**:
- Uses bone texture for GPU skinning
- Each instance has independent animation
- Random model selection per instance
- Random animation start time
- Adaptive positioning based on crowd count

**Crowd Positioning**:
- Front of stage: z=14
- Depth: 30-80 (scales with count)
- Spread factor: 0.8-1.5 (scales with count)
- Minimum separation: 1.8 units
- Faces toward stage with random offset

**Bone Texture**:
- Width: MAX_BONES * 4 pixels
- Height: CROWD_COUNT rows
- Format: RGBA Float

**Custom Shader**:
- Vertex shader: Reads bone matrices from texture, applies skinning
- Fragment shader: Samples texture atlas

**Update Logic**: Updates all mixers and bone texture per frame

**Cleanup**: Removes mesh and clears mixer array

---

### Debug Helpers (`helpers.ts`)

**Purpose**: Creates debug visualization helpers

**Elements Created**:
- Point light helpers for all point lights in scene

**Visibility**: Controlled by debug config

## Cinematic Camera Paths

### Panoramic Sweep (Default)
Wide sweeping shots covering entire venue from various angles and heights.

**Waypoints**: 8 points
- High overview (0, 65, 45)
- Far left (−80, 40, 100)
- Back center (0, 30, 130)
- Far right (80, 40, 100)
- Low close (20, 15, 25)
- Mid audience (0, 18, 60)
- Mid left (−20, 20, 80)
- Returns to start

### Stage Circle
Circular orbit around the stage at consistent height.

**Waypoints**: 9 points (8 + return)
- Radius: ~35 units
- Height: 10 units
- Forms complete circle around stage center

### Crowd Flyover
Flies low over the crowd, gradually ascending.

**Waypoints**: 7 points
- Starts low at stage (0, 5, 20)
- Rises to (0, 15, 80)
- Descends back down
- S-curve pattern

### High Orbit
High altitude wide orbit around entire scene.

**Waypoints**: 8 points (7 + return)
- Height: 80 units
- Radius: 60-80 units
- Wide perspective of full venue

## Performance Considerations

### Crowd Instancing
- Uses GPU instancing for up to 1000 animated characters
- Bone matrices stored in texture for GPU skinning
- Each instance can have different model and animation

### Model Caching
- FBX models loaded once and cached
- Cloned using `SkeletonUtils.clone()` to preserve skeleton

### Shader Optimizations
- Shader wall uses reduced fractal iterations (4 instead of 5)
- Beams use simple falloff shaders
- Additive blending for lights (no overdraw penalty)

### Dynamic Updates
- Only recreates DJ/crowd when config changes
- Update functions check visibility before processing
- Smooth interpolation for target rotations

## Common Usage Patterns

### Creating the Component
```typescript
import StageScene from '@/components/comps/stage-scene';

// Component is auto-registered and available in the editor
```

### Connecting to Audio
The component works best with audio-reactive node networks connected to:
- Kick drum → shader wall scale/brightness, moving lights mode
- Hi-hat → blinder intensity
- Snare → shader wall travel speed, stage lights color
- Bass → beam intensity, shader wall scale
- Vocals → shader wall rotation
- Build-ups → strobe flash rate
- Drops → overhead blinder intensity

### Camera Modes
1. **Manual**: Direct position/rotation control via config
2. **WASD Fly Mode**: Interactive exploration (click button, use WASD + mouse)
3. **Cinematic**: Automated path animation for production

### Best Practices
- Enable bloom for best visual effect
- Use cinematic mode for rendered output
- Adjust crowd count based on performance needs
- Connect default networks for instant audio reactivity
- Use overhead blinder sparingly for maximum impact

## Technical Notes

### Coordinate System
- Y-up coordinate system
- Stage center at origin (0, 0, 0)
- Stage top surface at y=3
- Lights positioned at y=25-60

### Render Order
The component uses standard Three.js render order with additive blending for lights.

### State Persistence
- Camera position/rotation sync to config when exiting WASD mode
- Elapsed time persists across frames
- Previous config values tracked for dynamic updates

### Memory Management
- Cleanup functions provided for DJ and crowd
- Event listeners properly removed on WASD mode exit
- Geometries and materials reused where possible

## Node Network Presets

The Stage Scene component includes 13 default node network connections that provide automatic audio-reactive behavior. Each preset is a carefully crafted signal processing chain designed for a specific musical feature or lighting effect.

### Preset Mappings

| Parameter | Preset ID | Purpose |
|-----------|-----------|---------|
| `blinders.intensity` | `hihat-adaptive` | Trigger blinders on hi-hat hits |
| `beams.mode` | `beam-mode-melody-cycle` | Cycle beam patterns with bassline melody |
| `beams.intensity` | `kick-bass-smooth-intensity` | Beam brightness follows kick + bass |
| `strobes.flashRate` | `strobe-buildup-detector` | Increase strobe rate during buildups |
| `lasers.enabled` | `laser-high-energy-gate` | Enable lasers only during high energy |
| `lasers.mode` | `laser-mode-section-cycle` | Switch laser modes on sub-bass hits |
| `movingLights.mode` | `moving-lights-kick-cycle` | Change moving light patterns on kicks |
| `shaderWall.scale` | `shader-wall-bass-pulse` | Pulse shader wall scale with bass |
| `shaderWall.rotationSpeed` | `shader-wall-rotation-kick-vocal` | Cycle rotation speeds on kicks |
| `shaderWall.travelSpeed` | `shader-wall-travel-snare-cycle` | Cycle travel speeds on snares |
| `stageLights.color` | `stage-lights-snare-color-cycle` | Cycle stage light colors on snares |
| `shaderWall.brightness` | `shader-wall-kick-flash` | Brightness adapts to overall energy |
| `overheadBlinder.intensity` | `overhead-blinder-big-impact` | Flash on biggest bass drops |

### Detailed Preset Analysis

#### 🎩 Hi-Hat Detection (`hihat-adaptive`)
**Connected to**: `blinders.intensity`

**Signal Chain**:
```
Frequency Band (6-14kHz) → Band Info → Adaptive Normalize → Hysteresis Gate → Output (0-1)
```

**How it Works**:
- Isolates high-frequency range where hi-hats live (6-14kHz)
- Uses adaptive normalization with shorter window (3000ms) for fast response
- Higher quantile thresholds (0.6 low, 0.92 high) to catch transient hits
- Tight hysteresis gate (0.45-0.55) prevents false triggers
- Outputs 0 or 1 - perfect for triggering blinder flashes

**Musical Purpose**: Creates crisp, rhythmic blinder flashes that follow the hi-hat pattern, adding visual accents to the beat's high-end.

---

#### 🔄 Beam Mode Cycling (`beam-mode-melody-cycle`)
**Connected to**: `beams.mode`

**Signal Chain**:
```
Frequency Band (80-400Hz bassline) → Band Info → Envelope Follower → Adaptive Normalize → Hysteresis Gate → Threshold Counter (0-6) → Rate Limiter (500ms) → Value Mapper → Output (string "0"-"6")
```

**How it Works**:
- Monitors bassline melody range (80-400Hz)
- Detects changes in bass melody with adaptive normalization
- High gate thresholds (0.8-0.9) ensure only significant changes trigger
- Counts through 7 beam modes (0-6)
- Rate limiter prevents rapid switching (minimum 500ms between changes)
- Maps counter values to mode strings

**Musical Purpose**: Beam patterns evolve with the bassline, creating visual variety that follows the melodic structure of the track.

---

#### 💥 Kick + Bass Smooth Intensity (`kick-bass-smooth-intensity`)
**Connected to**: `beams.intensity`

**Signal Chain**:
```
Kick Band (80-150Hz) → Band Info → Adaptive Normalize (Quantile) ──┐
                                                                      ├→ Math.max → Envelope Follower → Scale (×2.5) → Output (0-2.5)
Bass Band (20-163Hz) → Band Info → Adaptive Normalize (Quantile) ──┘
```

**How it Works**:
- Processes both kick (80-150Hz) and bass (20-163Hz) separately
- Takes maximum of both signals to capture strongest low-end energy
- Smooth envelope follower (5ms attack, 150ms release) for decay
- Scales to 0-2.5 range, perfect for beam intensity parameter

**Musical Purpose**: Beam brightness responds to the combined power of kick and bass, creating smooth pulsing intensity that feels connected to the low-end energy.

---

#### ⚡ Strobe Buildup Detector (`strobe-buildup-detector`)
**Connected to**: `strobes.flashRate`

**Signal Chain**:
```
Frequency Analysis → Spectral Flux → Envelope Follower → Normalize (30-50 → 0.01-0.9) → Output
```

**How it Works**:
- Spectral Flux detects rate of energy change across frequency spectrum
- Smooth envelope (50ms attack, 800ms release) for transitions
- Normalizes to 0.01-0.9 range (flash rate)
- Higher flux = faster flashing during buildups/drops
- Lower flux = slower flashing during steady sections

**Musical Purpose**: Strobes flash faster during buildups and drops, slower during verses - following the song's intensity dynamics.

---

#### ⚡ High Energy Gate (`laser-high-energy-gate`)
**Connected to**: `lasers.enabled`

**Signal Chain**:
```
Full Spectrum (20-20kHz) → Band Info → Adaptive Normalize → Hysteresis Gate → Output (boolean)
```

**How it Works**:
- Analyzes entire frequency spectrum for overall energy
- Adaptive normalization (2000ms window) handles varying levels
- Hysteresis gate (off at 0.2, on at 0.65) prevents flickering
- Outputs true during high-energy sections, false during quiet parts

**Musical Purpose**: Lasers only activate during choruses, drops, and high-energy moments - saving them for maximum impact.

---

#### 🎨 Laser Mode Section Cycle (`laser-mode-section-cycle`)
**Connected to**: `lasers.mode`

**Signal Chain**:
```
Sub-Bass Band (0-120Hz) → Band Info → Section Change Detector → Threshold Counter (0-4) → Value Mapper → Output (string "0"-"4")
```

**How it Works**:
- Monitors deepest bass fundamentals (0-120Hz)
- Section Change Detector identifies when kick pattern changes
- Static threshold (30) with cooldown (100ms) and hold (150ms)
- Counts 0-4, maps to laser mode strings
- Falls back to "auto" by default

**Musical Purpose**: Laser patterns change with song sections (verse, chorus, bridge), creating visual variety that matches musical structure.

---

#### 🎤 Moving Lights Kick Cycle (`moving-lights-kick-cycle`)
**Connected to**: `movingLights.mode`

**Signal Chain**:
```
Kick Band (20-150Hz) → Band Info → Spike Detector → Threshold Counter (0-4) → Value Mapper → Output (string "0"-"4")
```

**How it Works**:
- Monitors kick frequency range (20-150Hz)
- Spike detector (threshold 50, attack 10ms, release 150ms) catches each kick
- Counter increments on each kick, wraps at 5
- Maps to moving light mode strings "0"-"4"

**Musical Purpose**: Moving light movement patterns change with every kick, creating dynamic variation synchronized to the rhythm's foundation.

---

#### 🌀 Shader Wall Bass Pulse (`shader-wall-bass-pulse`)
**Connected to**: `shaderWall.scale`

**Signal Chain**:
```
Slow Sine (1 cycle/min, amplitude 2) → Add 3 (offset to range 1-5) ──┐
                                                                       ├→ Add → Output (1-5.3)
Bass Band (20-200Hz) → Adaptive Normalize → Envelope → Scale (×0.3) ─┘
```

**How it Works**:
- **Base layer**: Slow sine wave (1 cycle per minute) oscillates 1-5
- **Bass layer**: Bass energy (20-200Hz) processed and scaled to 0-0.3
- Combines for breathing effect (slow wave) with audio-reactive detail (bass shake)
- Fast attack (10ms), medium release (300ms) for bass responsiveness

**Musical Purpose**: The shader wall "breathes" slowly while adding small reactive pulses to bass hits - organic movement with audio detail.

---

#### 🌀 Shader Wall Rotation Kick Cycle (`shader-wall-rotation-kick-vocal`)
**Connected to**: `shaderWall.rotationSpeed`

**Signal Chain**:
```
Kick Band (80-150Hz) → Band Info → Envelope → Adaptive Normalize → Hysteresis Gate → Threshold Counter (0-6) → Scale (×0.5) → Output (0-3)
```

**How it Works**:
- Full kick detection chain with adaptive normalization
- Counts 0-6 on each kick hit
- Multiplies by 0.5 to get discrete steps: 0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0
- Clean transitions between rotation speeds

**Musical Purpose**: Shader wall rotation speed cycles through 7 distinct values with each kick, creating evolving visual dynamics.

---

#### 🌀 Shader Wall Travel Snare Cycle (`shader-wall-travel-snare-cycle`)
**Connected to**: `shaderWall.travelSpeed`

**Signal Chain**:
```
Snare Band (180-4000Hz) → Band Info → Envelope → Adaptive Normalize → Hysteresis Gate → Threshold Counter (0-6) → Scale (×0.5) → Output (0-3)
```

**How it Works**:
- Identical to rotation cycle but triggered by snares
- Snare detection using mid-high frequencies (180-4000Hz)
- Faster envelope (4ms attack, 140ms release) for transient hits
- Produces same discrete steps: 0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0

**Musical Purpose**: Forward tunnel motion speed cycles independently from rotation, creating complex evolving movement synchronized to snare hits.

---

#### 💡 Stage Lights Snare Color Cycle (`stage-lights-snare-color-cycle`)
**Connected to**: `stageLights.color`

**Signal Chain**:
```
Snare Band (180-4000Hz) → Band Info → Envelope → Adaptive Normalize → Hysteresis Gate → Threshold Counter (0-4) → Value Mapper → Output (color)
```

**How it Works**:
- Same snare detection as travel speed
- Counts 0-4, maps to color palette:
  - 0: Red (#ff0000)
  - 1: Green (#00ff00)
  - 2: Blue (#0000ff)
  - 3: Yellow (#ffff00)
  - 4: Magenta (#ff00ff)
- Defaults to white (#ffffff)

**Musical Purpose**: Stage edge lights cycle through vibrant colors on each snare hit, creating rhythmic color accents.

---

#### 🌀 Shader Wall Energy Brightness (`shader-wall-kick-flash`)
**Connected to**: `shaderWall.brightness`

**Signal Chain**:
```
Full Spectrum (20-20kHz) → Band Info → Adaptive Normalize → Envelope → Scale (×2) → Add 1 → Output (1-3)
```

**How it Works**:
- Analyzes entire frequency spectrum for overall energy
- Medium adaptation window (2500ms) for responsive energy tracking
- Envelope (50ms attack, 200ms release) smooths transitions
- Normalized energy (0-1) scaled to 0-2, offset by 1 = final range 1-3
- Brightness responds to song energy level

**Musical Purpose**: Shader wall gets brighter during high-energy sections, dimmer during quiet parts - visual intensity matches musical intensity.

---

#### 💥 Overhead Blinder Big Impact (`overhead-blinder-big-impact`)
**Connected to**: `overheadBlinder.intensity`

**Signal Chain**:
```
Bass Band (20-200Hz) → Band Info → Adaptive Normalize (qHigh 0.98!) → Envelope (1ms attack, 400ms decay) → Hysteresis Gate (0.87-0.96!) → Scale (×10) → Output (0 or 10)
```

**How it Works**:
- Focuses on bass frequencies (20-200Hz)
- **Very aggressive** normalization - only top 2% of energy triggers (qHigh 0.98)
- Extremely high gate thresholds (0.8725-0.9625) ensure rare triggers
- Instant flash (1ms attack), medium decay (400ms)
- Outputs 0 (off) or 10 (subtle flash intensity)

**Musical Purpose**: Reserved for the absolute biggest moments - massive drops, climactic build releases. Triggers rarely but with maximum impact.

---

### Preset Design Patterns

#### Common Node Types Used

1. **Frequency Band** - Isolates specific frequency ranges
   - Kick: 80-150Hz or 20-150Hz
   - Snare: 180-4000Hz
   - Bass: 20-163Hz or 20-200Hz
   - Hi-Hat: 6000-14000Hz
   - Full Spectrum: 20-20000Hz

2. **Band Info** - Extracts statistics (average, max, sum) from frequency bands

3. **Adaptive Normalize (Quantile)** - Auto-adjusts for varying song dynamics
   - Tracks quantile ranges over time windows (1000-4000ms)
   - Freezes normalization when signal too quiet
   - Enables consistent triggering across different tracks

4. **Envelope Follower** - Smooths signals with attack/release
   - Fast attack (1-10ms) for transients
   - Slower release (100-800ms) for smooth decay

5. **Hysteresis Gate** - Prevents flickering with two thresholds
   - Low threshold: turn off
   - High threshold: turn on
   - State persists between thresholds

6. **Threshold Counter** - Counts triggers, cycles 0-N
   - Used for mode cycling
   - Wraps at maxValue

7. **Value Mapper** - Maps numbers to strings, colors, or other numbers
   - Enables discrete mode selection
   - Color palette mapping

8. **Rate Limiter** - Prevents rapid changes
   - Minimum interval between value changes
   - Smooths chaotic signals

#### Signal Processing Philosophy

The presets follow a consistent philosophy:

1. **Musical Frequency Isolation** - Each preset targets specific musical elements via frequency analysis
2. **Adaptive Normalization** - Handles different track loudness/mixing automatically
3. **Hysteresis** - Prevents flickering and false triggers
4. **Smooth Transitions** - Envelope followers create organic feel
5. **Discrete Modes** - Counters and mappers create predictable pattern cycling
6. **Rate Limiting** - Prevents visually chaotic rapid changes

This creates audio-reactive behavior that feels **musical** rather than just technically accurate - lights and effects respond to the *feel* of the music, not just raw signal levels.

---

**Last Updated**: October 2025
**Component Version**: 1.0
**Three.js Version**: Latest (with UnrealBloomPass, RectAreaLight support)


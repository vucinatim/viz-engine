# Simple Audio-Reactive Example Project

This example project demonstrates how to create a multi-layer audio-reactive visualization using node networks to control parameters.

## Project Overview

The final result consists of three layers that respond to music:
- A **noise background** layer
- A **rotating cube** that changes color and size based on audio
- A **fullscreen shader effect** with animated colors

## Building the Project

### Step 1: Set Up the Layers

Create three visualization layers in this order:
1. **Noise Shader** - will serve as the background
2. **Simple Cube** - the main visual element
3. **Fullscreen Shader** (select "Radial Ripple Grid") - overlay effect

### Step 2: Configure Layer Blending

Adjust how the layers blend together:
- Noise Shader: Keep as "normal" blend mode, freeze this layer
- Simple Cube: Change to "multiply" blend mode, freeze this layer
- Fullscreen Shader: Change to "screen" blend mode, freeze this layer

*Tip: Freezing layers prevents them from animating on their own, so they only respond to your node networks.*

### Step 3: Make the Cube Color Audio-Reactive

For the **Simple Cube** layer, create a node network for the **color** parameter:

1. Get audio data from the full frequency spectrum
2. Extract the average value from this data
3. Normalize the value (try input range 120-140, output 0-1)
4. Smooth it with an envelope follower (attack: 10ms, release: 500ms)
5. Multiply by 360 to convert to hue degrees
6. Create an HSL color (saturation: 100%, lightness: 50%)
7. Connect to the output

*The color will now cycle through the hue spectrum based on audio intensity.*

### Step 4: Make the Cube Size Audio-Reactive

For the **Simple Cube** layer, create a node network for the **size** parameter:

1. Create a frequency band filter (try 80-150 Hz for bass)
2. Get the band info average
3. Apply an envelope follower (attack: 6ms, release: 120ms)
4. Use adaptive normalization for auto-leveling (4 second window, quantile range 0.5-0.98, freeze below 140)
5. Add a hysteresis gate to clean up the signal (low: 0.33, high: 0.45)
6. Add 2 to the result (so the cube doesn't disappear)
7. Connect to the output

*The cube will now pulse with the bass frequencies.*

### Step 5: Make the Shader Effect Audio-Reactive

For the **Fullscreen Shader** layer, create a node network for the **color** parameter:

This is similar to the cube's color network, but with a slower response:
1. Get audio data from the full frequency spectrum
2. Extract the average value
3. Normalize (same range: 120-140)
4. Smooth with envelope follower (attack: 10ms, release: **1000ms** - slower!)
5. Multiply by 360
6. Create HSL color (saturation: 100%, lightness: 50%)
7. Connect to output

*The shader color will change more gradually than the cube.*

### Step 6: Adjust Visual Parameters

Fine-tune the static parameters on each layer:

**Noise Shader:**
- Noise type: Simplex
- Scale: 7.2, Octaves: 2
- Animation speed: 2.8
- Enable distortion (amount: 3.5)
- Color mode: Monochrome
- Brightness: 1.99, Contrast: 3
- Enable invert

**Simple Cube:**
- Rotation speeds: X: 0.5, Y: 0.56

**Fullscreen Shader:**
- Scale: 0.5
- Intensity: 0.8
- Scan intensity: 0.7
- Wave intensity: 0.6

## Tips for Success

- Node networks can be enabled/disabled to test individual components
- Use the freeze option on layers to prevent unwanted animations
- Start with one node network at a time
- Connect nodes by dragging from output handles to input handles
- Parameter values can be adjusted in real-time to see effects

## Expected Behavior

When playing music:
- The cube should pulse in size with bass frequencies
- Colors should shift across the spectrum based on audio intensity
- The shader overlay should create a glowing, animated texture
- All three layers should blend together creating a cohesive visual

---

*This project demonstrates: layer blending, node networks, audio analysis, envelope following, normalization, and color generation.*


# Video Export System

## Overview

The video export system provides frame-by-frame, offline video rendering capabilities for the viz-engine. It allows users to export their audio-reactive visualizations as high-quality video files without being limited by real-time performance constraints.

## Architecture

The export system implements **Option 3: Headless, Frame-by-Frame Rendering** - a pragmatic approach that preserves the stateful architecture while enabling deterministic, high-quality video output.

### Key Components

1. **Export Store** (`export-store.ts`)
   - Manages export state, progress, and settings
   - Tracks current phase (preparing, rendering, encoding, complete)
   - Stores export configuration (resolution, FPS, quality, format)

2. **Offline Audio Extractor** (`offline-audio-extractor.ts`)
   - Pre-processes audio files to extract frequency and time-domain data for every frame
   - Performs FFT analysis on audio chunks corresponding to each frame
   - Ensures frame-perfect audio synchronization during export

3. **Frame Capture** (`frame-capture.ts`)
   - Uses `html2canvas` to capture the composited result of multiple canvases
   - Handles CSS blend modes that are applied at the DOM level
   - Captures at configurable resolution (720p, 1080p, 1440p, 4K)

4. **Frame Storage** (`frame-storage.ts`)
   - Stores captured frames in IndexedDB to handle large exports
   - Prevents memory overflow when rendering long videos
   - Provides frame retrieval and cleanup utilities

5. **Video Encoder** (`video-encoder.ts`)
   - Uses `ffmpeg.wasm` to encode frames into video
   - Runs entirely in the browser (no server required)
   - Supports MP4 (H.264) and WebM (VP9) formats
   - Combines video frames with original audio

6. **Export Orchestrator** (`export-orchestrator.ts`)
   - Main controller that coordinates the entire export pipeline
   - Implements the manual render loop with programmatic time stepping
   - Manages the export phases from preparation to completion

## How It Works

### Export Pipeline

```
1. Preparation Phase
   ├── Load and decode audio file
   ├── Extract offline audio data for all frames
   ├── Initialize FFmpeg.wasm
   └── Calculate total frame count

2. Rendering Phase
   ├── For each frame (0 to totalFrames):
   │   ├── Seek Remotion player to exact frame
   │   ├── Wait for render to complete (double RAF)
   │   ├── Capture composited result with html2canvas
   │   ├── Store frame in IndexedDB
   │   └── Update progress
   └── Yield to browser every 5 frames

3. Encoding Phase
   ├── Retrieve all frames from IndexedDB
   ├── Write frames to FFmpeg virtual filesystem
   ├── Write audio file to FFmpeg
   ├── Run FFmpeg encoding command
   └── Read output video file

4. Completion Phase
   ├── Create video blob
   ├── Download video file
   ├── Clean up IndexedDB
   └── Reset export state
```

### Time Management

Unlike real-time rendering (driven by `requestAnimationFrame` at ~60 FPS), the export process uses **programmatic time stepping**:

- **Real-time**: `currentTime = performance.now()`
- **Export**: `currentTime = frameIndex / fps`

This ensures:
- Perfect 60 FPS output regardless of scene complexity
- Deterministic frame generation
- Ability to render at resolutions higher than the display

### Audio Synchronization

The system pre-processes the entire audio file to extract analysis data for every frame:

1. Decode audio into raw samples
2. Divide into chunks (one per frame at target FPS)
3. Perform FFT on each chunk
4. Store frequency and time-domain data
5. During export, use pre-calculated audio data instead of live analysis

This guarantees **frame-perfect audio sync** even when rendering slower than real-time.

### Multi-Canvas Compositing

The viz-engine uses multiple canvases with CSS blend modes for layer compositing. During export:

1. Each layer renders to its own canvas (as in real-time)
2. CSS properties (opacity, blend mode, background) are applied
3. `html2canvas` captures the final composited DOM result
4. This preserves the exact visual output including all blending

## Usage

### Basic Export

1. Click the **Export** button in the editor header
2. Configure settings:
   - **Resolution**: 720p, 1080p, 1440p, or 4K
   - **Duration**: Length of video (up to audio duration)
   - **Frame Rate**: 30, 60, or 120 FPS
   - **Quality**: High, Medium, or Low
   - **Format**: MP4 or WebM
3. Click **Start Export**
4. Wait for the export to complete
5. Video downloads automatically

### Export Settings

#### Resolution Presets
- **720p** (1280×720) - Standard definition, smaller file size
- **1080p** (1920×1080) - Full HD, balanced quality/size
- **1440p** (2560×1440) - Quad HD, high quality
- **4K** (3840×2160) - Ultra HD, maximum quality

#### Frame Rate
- **30 FPS** - Smooth, smaller file size
- **60 FPS** - Very smooth, standard for web
- **120 FPS** - Ultra-smooth, large file size

#### Quality Presets
- **High**: Best quality (CRF 18 for MP4, 2 Mbps for WebM)
- **Medium**: Balanced (CRF 23 for MP4, 1 Mbps for WebM)
- **Low**: Smaller files (CRF 28 for MP4, 500 kbps for WebM)

#### Format
- **MP4 (H.264)**: Better compatibility, smaller files
- **WebM (VP9)**: Open format, good quality

## Performance Characteristics

### Export Speed

Export is **slower than real-time** due to:
1. **GPU Readback** (10-100ms per frame): Transferring pixels from GPU to CPU
2. **html2canvas Processing** (20-100ms per frame): Re-rendering DOM with styles
3. **Frame Encoding** (5-20ms per frame): Converting to PNG blob

**Typical speeds**:
- Simple scenes: 2-3× slower than real-time
- Complex scenes (Stage Scene): 5-10× slower than real-time
- 4K export: 10-20× slower than real-time

### Memory Usage

- **Frame storage**: ~1-5 MB per frame (PNG blobs)
- **IndexedDB**: Automatically handles large exports
- **Browser quota**: Typically 50%+ of available disk space

## Technical Details

### Why Not Remotion's Built-in Export?

Remotion is designed for **deterministic, stateless rendering** where `frame = f(time)`. The viz-engine uses:
- **Stateful systems**: Physics simulations, particle systems
- **Real-time audio analysis**: Web Audio API AnalyserNode
- **Interactive state**: Zustand stores, user inputs

These are incompatible with Remotion's SSR-based rendering.

### The Solution: Frame-by-Frame Capture

Instead of rewriting the architecture, we:
1. Keep the stateful, interactive system intact
2. Drive the render loop manually during export
3. Capture the final composited output
4. Encode client-side with ffmpeg.wasm

This preserves the creative workflow while enabling professional exports.

## Limitations

1. **Export Speed**: Cannot render faster than the capture/encode pipeline allows
2. **Browser Storage**: Very long videos may hit storage limits
3. **Audio Sync**: Requires the full audio file to be loaded (no streaming)
4. **FFmpeg Size**: Initial load downloads ~30 MB of WASM files
5. **Browser Tab**: Must keep tab active during export

## Future Enhancements

- **Background export**: Use Web Workers for rendering
- **Pause/resume**: Save export state and continue later
- **Render queue**: Queue multiple exports
- **Cloud encoding**: Offload encoding to a server
- **Real-time preview**: Show export preview while rendering
- **Custom audio**: Support separate audio tracks

## Dependencies

- `html2canvas`: DOM to canvas conversion
- `@ffmpeg/ffmpeg`: Browser-based video encoding
- `@ffmpeg/util`: FFmpeg utilities
- IndexedDB: Frame storage (built-in)

## Files

### Core System
- `src/lib/stores/export-store.ts` - State management
- `src/lib/utils/offline-audio-extractor.ts` - Audio preprocessing
- `src/lib/utils/frame-capture.ts` - Frame capture utilities
- `src/lib/utils/frame-storage.ts` - IndexedDB storage
- `src/lib/utils/video-encoder.ts` - FFmpeg encoding
- `src/lib/utils/export-orchestrator.ts` - Main controller

### UI Components
- `src/components/editor/export-button.tsx` - Export trigger button
- `src/components/editor/export-dialog.tsx` - Settings and progress UI

## Credits

This export system implements the architecture proposed in the conversation with the AI assistant, combining:
- Client-side rendering with deterministic time stepping
- Offline audio analysis for perfect synchronization
- Browser-based video encoding for zero-server deployment


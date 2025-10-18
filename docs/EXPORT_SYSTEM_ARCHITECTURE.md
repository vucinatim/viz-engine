# Export System Architecture

> **Comprehensive architectural breakdown of the viz-engine video export system**

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture Overview](#architecture-overview)
3. [Core Components](#core-components)
4. [Data Flow](#data-flow)
5. [Integration Architecture](#integration-architecture)
6. [Technical Implementation](#technical-implementation)
7. [Performance & Optimization](#performance--optimization)
8. [Error Handling & Edge Cases](#error-handling--edge-cases)
9. [Dependencies](#dependencies)

---

## System Overview

### Purpose

The export system provides **frame-by-frame, offline video rendering** capabilities for the viz-engine, enabling users to export audio-reactive visualizations as high-quality video files without being constrained by real-time performance limitations.

### Design Philosophy

The export system implements **Option 3: Headless, Frame-by-Frame Rendering** - a pragmatic approach that:
- **Preserves** the existing stateful architecture (no rewrite required)
- **Enables** deterministic, high-quality video output
- **Runs** entirely in the browser (zero-server deployment)
- **Supports** resolutions higher than display resolution
- **Guarantees** frame-perfect audio synchronization

### Key Capabilities

- ✅ **Frame-perfect rendering** at 30/60/120 FPS
- ✅ **Multiple resolutions** (720p, 1080p, 1440p, 4K)
- ✅ **Audio synchronization** via offline FFT analysis
- ✅ **Multi-canvas compositing** with CSS blend modes
- ✅ **Client-side encoding** using FFmpeg.wasm
- ✅ **Large export handling** via IndexedDB storage
- ✅ **Multiple formats** (MP4/H.264, WebM/VP9)
- ✅ **Progress tracking** and cancellation support

---

## Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER INTERFACE                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ Export Button│  │ Export Dialog│  │   Export Console     │  │
│  │              │  │  (Settings)  │  │  (Logs & Progress)   │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────────────────┘  │
└─────────┼──────────────────┼──────────────────────────────────┘
          │                  │
          │                  │ Triggers export
          │                  ▼
┌─────────┼──────────────────────────────────────────────────────┐
│         │            ORCHESTRATION LAYER                        │
│         │    ┌───────────────────────────────────────────┐     │
│         └───►│       Export Orchestrator                 │     │
│              │  • Coordinates entire pipeline            │     │
│              │  • Manages export phases                  │     │
│              │  • Controls time stepping                 │     │
│              └───┬───────────────────────────────────────┘     │
└──────────────────┼──────────────────────────────────────────────┘
                   │
    ┌──────────────┼──────────────┐
    │              │              │
    ▼              ▼              ▼
┌────────┐   ┌────────────┐  ┌──────────────┐
│ Phase 1│   │  Phase 2   │  │   Phase 3    │
│PREPARE │   │  RENDER    │  │   ENCODE     │
└────────┘   └────────────┘  └──────────────┘
    │              │              │
    │              │              │
┌───┴─────────┐   ┌┴──────────┐  ┌┴────────────────┐
│             │   │           │  │                 │
│ Audio       │   │ Frame     │  │ Video           │
│ Processing  │   │ Capture   │  │ Encoding        │
│             │   │           │  │                 │
└─────────────┘   └───────────┘  └─────────────────┘
      │                 │                │
      │                 │                │
      ▼                 ▼                ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│Offline Audio │  │  Frame       │  │   FFmpeg     │
│  Extractor   │  │  Storage     │  │   Encoder    │
│              │  │ (IndexedDB)  │  │   (WASM)     │
└──────────────┘  └──────────────┘  └──────────────┘
      │                 │                │
      │                 │                │
      ▼                 ▼                ▼
┌──────────────────────────────────────────────────┐
│              SHARED STATE (Zustand)              │
│                Export Store                      │
│  • Settings  • Progress  • Logs  • Audio Data   │
└──────────────────────────────────────────────────┘
```

### Component Layers

The system is organized into **four distinct layers**:

1. **UI Layer** - User interaction and feedback
2. **Orchestration Layer** - Pipeline coordination and control
3. **Processing Layer** - Core export functionality
4. **State Layer** - Shared state management

---

## Core Components

### 1. Export Store (`export-store.ts`)

**Role:** Centralized state management for the entire export system

**Architecture Pattern:** Zustand store (reactive state management)

#### State Structure

```typescript
interface ExportStore {
  // Configuration
  settings: ExportSettings;
  
  // Runtime state
  isExporting: boolean;
  progress: ExportProgress;
  shouldCancel: boolean;
  
  // Data management
  capturedFrames: Blob[];
  currentOfflineAudioData: ExportAudioFrameData | null;
  
  // Logging & errors
  logs: ExportLog[];
  error: string | null;
  
  // Actions
  setIsExporting: (value: boolean) => void;
  setProgress: (update: Partial<ExportProgress>) => void;
  setSettings: (update: Partial<ExportSettings>) => void;
  setCurrentOfflineAudioData: (data: ExportAudioFrameData | null) => void;
  addLog: (log: ExportLog) => void;
  resetExport: () => void;
}
```

#### Key Features

- **Progress Calculation**: Automatically calculates percentage based on phase and frame count
- **Monotonic Progress**: Prevents progress bar from going backwards
- **Audio Data Injection**: Stores current frame's offline audio data for components to consume
- **Comprehensive Logging**: Tracks all export operations with timestamps and performance data

#### Integration Points

- **Read by:** UI components (ExportDialog, ExportButton, ExportConsole)
- **Written by:** Export Orchestrator, Video Encoder, Audio Extractor
- **Connected to:** Audio rendering system (via `useAudioFrameData` hook)

---

### 2. Export Orchestrator (`export-orchestrator.ts`)

**Role:** Main controller that coordinates the entire export pipeline

**Architecture Pattern:** Asynchronous workflow orchestration

#### Responsibilities

1. **Phase Management** - Coordinates the 4 export phases
2. **Error Handling** - Catches and reports all errors
3. **Cancellation** - Supports user cancellation at any point
4. **Resource Management** - Handles wake locks, visibility tracking
5. **Performance Tracking** - Logs timing for all major operations

#### Export Pipeline Phases

```typescript
async function exportVideo(
  rendererContainerElement: HTMLElement,
  settings?: Partial<ExportSettings>
): Promise<void>
```

**Phase 1: Preparation**
```
1. Validate audio is loaded
2. Calculate total frame count
3. Load and decode audio file
4. Extract offline audio data (FFT analysis)
5. Initialize FFmpeg.wasm
```

**Phase 2: Rendering**
```
1. Pause playback
2. Create batch frame writer (IndexedDB)
3. For each frame:
   a. Calculate exact time (frameIndex / fps)
   b. Inject offline audio data
   c. Call layerStore.renderAllLayers(time, deltaTime)
   d. Force WebGL to finish rendering
   e. Wait for double RAF
   f. Capture frame using fast capture
   g. Store in IndexedDB
   h. Update progress
4. Close batch writer
```

**Phase 3: Encoding**
```
1. Retrieve all frames from IndexedDB
2. Write frames to FFmpeg virtual filesystem
3. Write audio file to FFmpeg
4. Run FFmpeg encoding command
5. Read output video file
6. Clean up virtual filesystem
```

**Phase 4: Completion**
```
1. Create video blob
2. Download video file
3. Clean up IndexedDB
4. Reset export state
5. Restore playback state
```

#### Critical Fixes Implemented

The orchestrator includes several **critical fixes** for synchronization issues:

**Fix #1: Frame Seeking Math**
```typescript
// ❌ WRONG: Skips frames by adding time offset
const currentFrame = Math.floor((startTime + frameIndex / fps) * fps);

// ✅ CORRECT: Direct frame index
playerRef.seekTo(frameIndex);
```

**Fix #2: Offline Audio Data Injection**
```typescript
// Inject audio data for each frame BEFORE rendering
const audioFrameData = offlineAudioData.frames[frameIndex];
exportStore.setCurrentOfflineAudioData(audioFrameData);

// Components read from store instead of live analyzer
```

**Fix #3: Manual Layer Rendering**
```typescript
// Direct layer rendering with explicit time and deltaTime
layerStore.renderAllLayers(currentTime, deltaTime);
// This bypasses RAF loops and gives frame-perfect control
```

**Fix #4: WebGL Synchronization**
```typescript
// Force WebGL to complete all operations before capture
for (const canvas of canvases) {
  const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
  if (gl) gl.finish(); // Blocks until GPU completes
}
```

#### Resource Management

- **Wake Lock**: Prevents system sleep during export
- **Visibility Tracking**: Warns if user switches tabs
- **Cancellation Checking**: Polls for user cancellation
- **State Restoration**: Restores playback state after export

---

### 3. Offline Audio Extractor (`offline-audio-extractor.ts`)

**Role:** Pre-processes audio files to extract frame-accurate frequency and time-domain data

**Architecture Pattern:** Streaming FFT analysis with windowing

#### How It Works

```typescript
async function extractOfflineAudioData(
  audioBuffer: AudioBuffer,
  fps: number,
  fftSize: number,
  startTime: number,
  duration: number
): Promise<OfflineAudioData>
```

**Process:**

1. **Load Audio**
   - Decode audio file into raw samples
   - Mix to mono if stereo

2. **Calculate Frame Chunks**
   ```typescript
   const samplesPerFrame = sampleRate / fps;
   const startSampleOffset = Math.floor(startTime * sampleRate);
   ```

3. **For Each Frame:**
   - Extract audio chunk for that frame
   - Apply Hanning window (reduce spectral leakage)
   - Perform FFT using Cooley-Tukey algorithm
   - Convert to magnitude spectrum (like AnalyserNode)
   - Scale to 0-255 range

4. **Return Frame Data**
   ```typescript
   {
     frequencyData: Uint8Array,   // FFT magnitude spectrum
     timeDomainData: Uint8Array,  // Raw waveform data
     sampleRate: number,
     fftSize: number
   }
   ```

#### FFT Implementation

The system includes a **custom FFT implementation** (Cooley-Tukey algorithm):

- **Power-of-2 size validation**
- **Bit-reversal permutation**
- **Butterfly operations** for efficient computation
- **Hanning window** to reduce spectral leakage
- **Decibel conversion** matching Web Audio API

#### Why Custom FFT?

- Web Audio API's AnalyserNode only works with **live playback**
- During export, we need **deterministic, offline analysis**
- Custom implementation provides **frame-accurate data** without playback

#### Audio Synchronization Guarantee

```
Frame 0:  Audio from [0ms to 16.67ms]     → FFT analysis
Frame 1:  Audio from [16.67ms to 33.33ms] → FFT analysis
Frame 2:  Audio from [33.33ms to 50ms]    → FFT analysis
...
```

Each frame gets **exactly** the audio data it should be displaying, ensuring perfect synchronization.

---

### 4. Frame Capture (`fast-frame-capture.ts`)

**Role:** Captures the composited visual output of all layers

**Architecture Pattern:** Direct canvas compositing with manual blend mode implementation

#### Why Custom Capture?

Initial implementation used `html2canvas`, which:
- ❌ Re-renders entire DOM (20-100ms per frame)
- ❌ Slow for complex scenes
- ❌ Unpredictable performance

**Fast capture** is **10-50× faster** by:
- ✅ Direct canvas-to-canvas compositing
- ✅ Manual CSS blend mode implementation
- ✅ Hardware-accelerated operations

#### How It Works

```typescript
async function fastCaptureFrame(
  containerElement: HTMLElement,
  options: FastCaptureOptions
): Promise<Blob>
```

**Process:**

1. **Find All Layer Canvases**
   ```typescript
   const canvases = Array.from(
     containerElement.querySelectorAll('canvas')
   ) as HTMLCanvasElement[];
   ```

2. **Create Composite Canvas**
   ```typescript
   const composite = document.createElement('canvas');
   composite.width = width;
   composite.height = height;
   ```

3. **For Each Layer:**
   - Read CSS properties (opacity, blend mode, background)
   - Create temporary canvas
   - Draw background color
   - Draw layer content
   - Composite onto main canvas with blend mode
   ```typescript
   ctx.globalAlpha = opacity;
   ctx.globalCompositeOperation = blendMode;
   ctx.drawImage(tempCanvas, 0, 0);
   ```

4. **Encode to Blob**
   ```typescript
   composite.toBlob(callback, 'image/jpeg', quality);
   ```

#### Blend Mode Mapping

```typescript
// CSS blend modes → Canvas globalCompositeOperation
'normal'    → 'source-over'
'multiply'  → 'multiply'
'screen'    → 'screen'
'overlay'   → 'overlay'
// ... etc
```

#### Critical Fix: Multi-Layer Blending

```typescript
// WRONG: Apply blend mode to background (turns everything black)
ctx.globalCompositeOperation = 'multiply';
ctx.fillRect(0, 0, width, height); // Background
ctx.drawImage(canvas, 0, 0);       // Layer

// CORRECT: Composite background + canvas FIRST, then blend
const tempCanvas = document.createElement('canvas');
const tempCtx = tempCanvas.getContext('2d');
tempCtx.fillRect(0, 0, width, height);      // Background
tempCtx.drawImage(canvas, 0, 0);            // Layer
ctx.globalCompositeOperation = 'multiply';  
ctx.drawImage(tempCanvas, 0, 0);            // Blend combined result
```

#### Performance Optimizations

- **JPEG encoding** instead of PNG (5-10× faster)
- **Direct pixel access** (no DOM traversal)
- **Hardware acceleration** (Canvas 2D API)
- **Reduced quality** (0.85 instead of 0.95) - FFmpeg handles final quality

---

### 5. Frame Storage (`frame-storage.ts`)

**Role:** Manages persistent storage of captured frames using IndexedDB

**Architecture Pattern:** IndexedDB wrapper with batch operations

#### Why IndexedDB?

- **Large capacity**: Typically 50%+ of available disk space
- **Persistent**: Survives page refreshes
- **Async**: Non-blocking operations
- **Binary storage**: Efficient Blob storage

#### Database Schema

```typescript
Database: 'viz-engine-export'
Store: 'frames'
Key: frameIndex (number)
Indexes: timestamp

Record:
{
  frameIndex: number,
  blob: Blob,
  timestamp: number
}
```

#### Batch Frame Writer

**Problem:** Opening/closing DB for each frame is **extremely slow** (100-200ms overhead per frame)

**Solution:** `BatchFrameWriter` keeps connection open

```typescript
class BatchFrameWriter {
  private db: IDBDatabase | null;
  
  async open(): Promise<void>
  async writeFrame(frameIndex: number, blob: Blob): Promise<void>
  close(): void
}
```

**Performance Impact:**
- Without batching: **200ms per frame**
- With batching: **5-10ms per frame**
- **20-40× faster** for large exports

#### Operations

```typescript
// Store single frame
await storeFrame(frameIndex, blob);

// Batch operations
const writer = new BatchFrameWriter();
await writer.open();
for (let i = 0; i < frames.length; i++) {
  await writer.writeFrame(i, frames[i]);
}
writer.close();

// Retrieve frames
const frames = await getAllFrames();

// Cleanup
await clearAllFrames();

// Storage estimate
const { usageInMB, quotaInMB } = await getStorageEstimate();
```

---

### 6. Video Encoder (`video-encoder.ts`)

**Role:** Encodes captured frames into final video file using FFmpeg.wasm

**Architecture Pattern:** WASM-based video encoding with progress tracking

#### FFmpeg.wasm Architecture

```
┌──────────────────────────────────────┐
│       JavaScript Layer               │
│  (video-encoder.ts)                  │
└─────────────┬────────────────────────┘
              │
              │ FFmpeg API
              ▼
┌──────────────────────────────────────┐
│       FFmpeg.wasm                    │
│  • Core: ffmpeg-core.js              │
│  • WASM: ffmpeg-core.wasm (~30MB)   │
└─────────────┬────────────────────────┘
              │
              │ Virtual Filesystem
              ▼
┌──────────────────────────────────────┐
│  FFmpeg Virtual FS (Memory)          │
│  • frame000000.jpg                   │
│  • frame000001.jpg                   │
│  • ...                               │
│  • audio.mp3                         │
│  • output.mp4                        │
└──────────────────────────────────────┘
```

#### Encoding Process

```typescript
async function encodeVideo(
  frames: Blob[],
  audioUrl: string,
  options: EncodingOptions,
  onProgress?: (progress: number) => void
): Promise<Blob>
```

**Steps:**

1. **Initialize FFmpeg**
   ```typescript
   await ffmpeg.load({
     coreURL: 'https://unpkg.com/@ffmpeg/core@0.12.6/...',
     wasmURL: '...'
   });
   ```

2. **Write Frames to Virtual FS**
   ```typescript
   for (let i = 0; i < frames.length; i++) {
     const frameData = await fetchFile(frames[i]);
     await ffmpeg.writeFile(`frame${i.toString().padStart(6, '0')}.jpg`, frameData);
   }
   ```

3. **Write Audio File**
   ```typescript
   const audioData = await fetchFile(audioUrl);
   await ffmpeg.writeFile('audio.mp3', audioData);
   ```

4. **Build FFmpeg Command**
   ```bash
   ffmpeg \
     -framerate 60 \
     -pattern_type glob \
     -i 'frame*.jpg' \
     -ss <startTime> \          # Audio trim start
     -t <duration> \            # Audio trim duration
     -i audio.mp3 \
     -c:v libx264 \             # H.264 video codec
     -preset veryfast \         # Speed optimization
     -crf 18 \                  # Quality (lower = better)
     -c:a aac \                 # AAC audio codec
     -shortest \                # Stop when shortest stream ends
     -pix_fmt yuv420p \         # Compatibility
     -movflags +faststart \     # Web streaming
     output.mp4
   ```

5. **Execute Encoding**
   ```typescript
   await ffmpeg.exec(command);
   ```

6. **Read Output**
   ```typescript
   const data = await ffmpeg.readFile('output.mp4');
   const blob = new Blob([data], { type: 'video/mp4' });
   ```

7. **Cleanup Virtual FS**
   ```typescript
   for (let i = 0; i < frames.length; i++) {
     await ffmpeg.deleteFile(`frame${i}.jpg`);
   }
   await ffmpeg.deleteFile('audio.mp3');
   await ffmpeg.deleteFile('output.mp4');
   ```

#### Quality Presets

**Optimized for WASM** (native FFmpeg is 10-20× faster):

```typescript
// MP4 (H.264)
'high':   -preset veryfast -crf 18 -tune film
'medium': -preset faster   -crf 22 -tune film
'low':    -preset ultrafast -crf 26 -tune film

// WebM (VP9)
'high':   -b:v 2M -quality good -cpu-used 3
'medium': -b:v 1M -quality good -cpu-used 4
'low':    -b:v 500k -quality realtime -cpu-used 5
```

#### Progress Tracking

FFmpeg outputs log messages during encoding:
```
frame=  123 fps=5.6 q=30.0 size=1024kB time=00:00:02.05 bitrate=4096.0kbits/s
```

The encoder **parses these logs** to report progress:
```typescript
ffmpeg.on('log', ({ message }) => {
  const frameMatch = message.match(/frame=\s*(\d+)/);
  if (frameMatch) {
    const progress = (parseInt(frameMatch[1]) / totalFrames) * 100;
    onProgress(progress);
  }
});
```

#### Audio Trimming

**Problem:** If user exports seconds 5-10, we only want that audio segment

**Solution:** FFmpeg input seeking
```bash
-ss 5        # Seek to 5 seconds in audio file
-t 5         # Take 5 seconds of audio
-i audio.mp3
```

This ensures exported video has **exactly the right audio segment**.

#### Timeout & Cancellation

```typescript
// Timeout after 15 minutes
const encodingTimeout = new Promise((_, reject) => {
  setTimeout(() => reject(new Error('Timeout')), 15 * 60 * 1000);
});

// Cancellation polling
const cancellationPromise = new Promise((_, reject) => {
  const interval = setInterval(() => {
    if (shouldCancel) reject(new Error('Cancelled'));
  }, 100);
});

// Race
await Promise.race([
  ffmpeg.exec(command),
  encodingTimeout,
  cancellationPromise
]);
```

---

### 7. UI Components

#### Export Button (`export-button.tsx`)

**Role:** Entry point for export functionality

**Features:**
- Validates audio is loaded
- Finds Remotion player container
- Opens export dialog
- Shows export status (idle → exporting → complete)

#### Export Dialog (`export-dialog.tsx`)

**Role:** Export configuration and progress UI

**Settings:**
- **Resolution**: 720p, 1080p, 1440p, 4K
- **Frame Rate**: 30, 60, 120 FPS
- **Quality**: High, Medium, Low
- **Format**: MP4, WebM
- **Timeline Range**: Visual timeline editor for start/end time

**Progress Display:**
- Phase indicator (preparing, rendering, encoding, complete)
- Progress bar with percentage
- Frame counter
- Elapsed time
- Export console logs

#### Export Console (`export-console.tsx`)

**Role:** Detailed logging interface

**Features:**
- Real-time log display
- Log filtering (info, success, warning, error, perf)
- Performance metrics
- Auto-scroll
- Expandable log details

#### Video Timeline (`video-timeline.tsx`)

**Role:** Visual timeline editor for selecting export range

**Features:**
- Waveform visualization
- Draggable start/end markers
- Playhead scrubbing
- Time display
- Duration calculation

---

## Data Flow

### Export Initialization Flow

```
User clicks Export Button
    ↓
Validate audio is loaded
    ↓
Find Remotion player container
    ↓
Open Export Dialog
    ↓
User configures settings
    ↓
User clicks "Start Export"
    ↓
Call exportVideo(container, settings)
```

### Export Execution Flow

```
┌─────────────────────────────────────────────┐
│         PREPARATION PHASE                   │
├─────────────────────────────────────────────┤
│ 1. Set isExporting = true                   │
│ 2. Clear previous frames                    │
│ 3. Load audio file                          │
│    ↓                                         │
│ 4. extractOfflineAudioData()                │
│    • Decode audio buffer                    │
│    • For each frame:                        │
│      - Extract audio chunk                  │
│      - Apply Hanning window                 │
│      - Perform FFT                          │
│      - Convert to magnitude spectrum        │
│    • Return array of frame audio data       │
│    ↓                                         │
│ 5. initFFmpeg()                             │
│    • Download FFmpeg.wasm (~30MB)           │
│    • Initialize virtual filesystem          │
└─────────────────────────────────────────────┘
               ↓
┌─────────────────────────────────────────────┐
│         RENDERING PHASE                     │
├─────────────────────────────────────────────┤
│ For frameIndex = 0 to totalFrames:         │
│                                             │
│ 1. Check for cancellation                  │
│    ↓                                         │
│ 2. Calculate time                           │
│    currentTime = startTime + frameIndex/fps │
│    deltaTime = 1/fps                        │
│    ↓                                         │
│ 3. Inject offline audio data                │
│    exportStore.setCurrentOfflineAudioData(  │
│      offlineAudioData.frames[frameIndex]    │
│    )                                         │
│    ↓                                         │
│ 4. Render layers                            │
│    layerStore.renderAllLayers(              │
│      currentTime,                           │
│      deltaTime                              │
│    )                                         │
│    ↓                                         │
│ 5. Force WebGL to finish                    │
│    for each canvas:                         │
│      gl.finish()                            │
│    ↓                                         │
│ 6. Wait for rendering                       │
│    await RAF                                │
│    await RAF                                │
│    ↓                                         │
│ 7. Capture frame                            │
│    blob = await fastCaptureFrame(...)       │
│    ↓                                         │
│ 8. Store in IndexedDB                       │
│    await batchWriter.writeFrame(            │
│      frameIndex, blob                       │
│    )                                         │
│    ↓                                         │
│ 9. Update progress                          │
│    exportStore.setProgress({                │
│      currentFrame: frameIndex + 1           │
│    })                                        │
│    ↓                                         │
│ 10. Yield to browser (every 10 frames)     │
│     await setTimeout(0)                     │
└─────────────────────────────────────────────┘
               ↓
┌─────────────────────────────────────────────┐
│         ENCODING PHASE                      │
├─────────────────────────────────────────────┤
│ 1. Retrieve frames from IndexedDB           │
│    frames = await getAllFrames()            │
│    ↓                                         │
│ 2. Write frames to FFmpeg virtual FS        │
│    for each frame:                          │
│      ffmpeg.writeFile('frame000123.jpg')    │
│    ↓                                         │
│ 3. Write audio to FFmpeg virtual FS         │
│    ffmpeg.writeFile('audio.mp3')            │
│    ↓                                         │
│ 4. Execute FFmpeg encoding                  │
│    await ffmpeg.exec([                      │
│      '-framerate', '60',                    │
│      '-i', 'frame*.jpg',                    │
│      '-ss', '5',      // Audio trim         │
│      '-t', '10',                            │
│      '-i', 'audio.mp3',                     │
│      '-c:v', 'libx264',                     │
│      '-preset', 'veryfast',                 │
│      '-crf', '18',                          │
│      '-c:a', 'aac',                         │
│      'output.mp4'                           │
│    ])                                        │
│    ↓                                         │
│ 5. Read output file                         │
│    data = await ffmpeg.readFile('output.mp4')│
│    blob = new Blob([data], { type: ... })  │
│    ↓                                         │
│ 6. Clean up virtual FS                      │
│    ffmpeg.deleteFile(...)                   │
└─────────────────────────────────────────────┘
               ↓
┌─────────────────────────────────────────────┐
│         COMPLETION PHASE                    │
├─────────────────────────────────────────────┤
│ 1. Download video                           │
│    downloadVideo(blob, filename)            │
│    ↓                                         │
│ 2. Clean up IndexedDB                       │
│    await clearAllFrames()                   │
│    ↓                                         │
│ 3. Reset export state                       │
│    exportStore.setProgress({                │
│      phase: 'complete',                     │
│      percentage: 100                        │
│    })                                        │
│    ↓                                         │
│ 4. Restore playback state                   │
│    if (wasPlaying)                          │
│      editorStore.setIsPlaying(true)         │
└─────────────────────────────────────────────┘
```

### Audio Data Flow

**Real-Time Rendering:**
```
Audio Element (playing)
    ↓
AudioContext
    ↓
AnalyserNode (live FFT)
    ↓
useAudioFrameData hook
    ↓
VizComponents consume audio data
```

**Export Rendering:**
```
Audio File
    ↓
Offline Audio Extractor
    ↓
Pre-computed FFT for every frame
    ↓
Export Store (currentOfflineAudioData)
    ↓
useAudioFrameData hook (checks isExporting)
    ↓
VizComponents consume offline audio data
```

**Key Insight:** The `useAudioFrameData` hook **automatically switches** between live and offline modes:

```typescript
const getAudioFrameData = useCallback(() => {
  const exportStore = useExportStore.getState();
  
  // During export, use offline data
  if (exportStore.isExporting && exportStore.currentOfflineAudioData) {
    return exportStore.currentOfflineAudioData;
  }
  
  // Normal playback, use live analyzer
  return getLiveAudioData(analyzerNode);
}, [analyzerNode]);
```

This ensures **components don't need to know about export** - they just read audio data the same way.

---

## Integration Architecture

### Integration with Viz-Engine Core

The export system integrates with three main systems:

#### 1. Layer System

**Integration Point:** `layerStore.renderAllLayers(time, deltaTime)`

**Normal Playback:**
```typescript
// RAF loop drives rendering
useFrame(() => {
  const time = clock.getElapsedTime();
  const deltaTime = clock.getDelta();
  renderAllLayers(time, deltaTime);
});
```

**During Export:**
```typescript
// Export orchestrator drives rendering
for (let frameIndex = 0; frameIndex < totalFrames; frameIndex++) {
  const time = startTime + frameIndex / fps;
  const deltaTime = 1 / fps;
  layerStore.renderAllLayers(time, deltaTime);
  // ... capture frame
}
```

**Key:** Layers use **passed time/deltaTime** instead of internal clocks, enabling deterministic rendering.

#### 2. Audio System

**Integration Point:** `useAudioFrameData` hook

**Hook Implementation:**
```typescript
export function useAudioFrameData() {
  const exportStore = useExportStore.getState();
  const audioStore = useAudioStore.getState();
  
  return useCallback(() => {
    // Check if exporting
    if (exportStore.isExporting && exportStore.currentOfflineAudioData) {
      return exportStore.currentOfflineAudioData;
    }
    
    // Normal playback
    const analyzerNode = audioStore.analyzerNode;
    if (!analyzerNode) return null;
    
    const frequencyData = new Uint8Array(analyzerNode.frequencyBinCount);
    const timeDomainData = new Uint8Array(analyzerNode.fftSize);
    
    analyzerNode.getByteFrequencyData(frequencyData);
    analyzerNode.getByteTimeDomainData(timeDomainData);
    
    return {
      frequencyData,
      timeDomainData,
      sampleRate: audioStore.audioContext.sampleRate,
      fftSize: analyzerNode.fftSize
    };
  }, [exportStore, audioStore]);
}
```

**Usage in Components:**
```typescript
function ParticleSystem() {
  const getAudioData = useAudioFrameData();
  
  useFrame(() => {
    const audioData = getAudioData();
    if (!audioData) return;
    
    // Use audioData.frequencyData
    // Works identically during export and playback!
  });
}
```

#### 3. Remotion System

**Integration Point:** Remotion Player

**Purpose:**
- Provides timing context
- Handles playback controls
- Synchronizes UI

**During Export:**
- Player is **paused**
- Frame seeking (`playerRef.seekTo(frameIndex)`) keeps UI in sync
- Actual rendering driven by manual `renderAllLayers()` calls

---

## Technical Implementation

### Time Management

**The Core Challenge:** How to render deterministically when the system was designed for real-time?

**Solution:** Explicit time passing

```typescript
// ❌ NON-DETERMINISTIC (real-time)
let internalTime = 0;
useFrame(() => {
  internalTime += deltaTime; // Accumulates error over time
  render(internalTime);
});

// ✅ DETERMINISTIC (export)
useFrame((state, deltaTime) => {
  const currentTime = state.clock.getElapsedTime();
  render(currentTime, deltaTime); // Use passed time, not internal
});
```

**Export Implementation:**
```typescript
const frameTime = startTime + frameIndex / fps;
const deltaTime = 1 / fps;
layerStore.renderAllLayers(frameTime, deltaTime);
```

### Frame Synchronization

**Challenge:** Ensure GPU completes rendering before capture

**Solution: Multi-stage synchronization**

```typescript
// Stage 1: Render all layers with explicit time
layerStore.renderAllLayers(currentTime, deltaTime);

// Stage 2: Force WebGL to finish all GPU operations
for (const canvas of canvases) {
  const gl = canvas.getContext('webgl2');
  if (gl) gl.finish(); // Blocks until GPU completes
}

// Stage 3: Wait for browser to flush rendering pipeline
await new Promise(resolve => requestAnimationFrame(resolve));
await new Promise(resolve => requestAnimationFrame(resolve));

// Stage 4: Capture frame (GPU → CPU transfer)
const blob = await fastCaptureFrame(container, options);
```

**Why Double RAF?**
- First RAF: Schedule capture
- Second RAF: Ensure paint has completed
- Without this: Risk capturing incomplete frames

### Memory Management

**Challenge:** Rendering thousands of frames consumes massive memory

**Solutions:**

1. **IndexedDB for frame storage**
   - Moves frames from RAM to disk
   - Prevents memory exhaustion
   - Batch operations for speed

2. **Streaming frame processing**
   - Capture → Store → Release
   - Never hold all frames in memory simultaneously

3. **Blob cleanup**
   ```typescript
   // After storing frame
   URL.revokeObjectURL(blobUrl);
   blob = null; // Allow GC
   ```

4. **FFmpeg virtual filesystem**
   - Frames written to virtual FS
   - Encoding reads directly from FS
   - Delete after encoding completes

### Browser Integration

**Wake Lock API:**
```typescript
if ('wakeLock' in navigator) {
  wakeLock = await navigator.wakeLock.request('screen');
  // Prevents system sleep during long exports
}
```

**Page Visibility API:**
```typescript
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    log('warning', 'Tab hidden - export may pause');
  }
});
```

**Why Important:**
- Browsers throttle background tabs
- Can cause export to pause or fail
- Wake lock prevents system sleep
- Visibility tracking warns user

### Cancellation Architecture

**Challenge:** Cancel export gracefully at any point

**Implementation:**

```typescript
// Cancellation flag
shouldCancel: boolean

// Check at safe points
if (useExportStore.getState().shouldCancel) {
  throw new Error('Export cancelled by user');
}

// Safe points:
// - Before each frame render
// - During FFmpeg encoding (polling)
// - Before IndexedDB operations

// Cleanup on cancellation:
try {
  await exportVideo(...);
} catch (error) {
  if (error.message === 'Export cancelled by user') {
    // Clean up resources
    await clearAllFrames();
    if (wakeLock) await wakeLock.release();
    // Restore state
    if (wasPlaying) editorStore.setIsPlaying(true);
  }
}
```

---

## Performance & Optimization

### Rendering Performance

**Typical Speeds:**

| Scene Complexity | Resolution | Rendering Speed | Time for 1min @60fps |
|-----------------|-----------|-----------------|---------------------|
| Simple (1-2 layers) | 1080p | 2-3× slower | 2-3 minutes |
| Medium (3-5 layers) | 1080p | 5-7× slower | 5-7 minutes |
| Complex (6+ layers, 3D) | 1080p | 8-12× slower | 8-12 minutes |
| Any | 4K | 15-25× slower | 15-25 minutes |

**Bottlenecks:**

1. **GPU → CPU Transfer** (10-50ms per frame)
   - Canvas pixel readback
   - Cannot be parallelized

2. **Frame Capture** (5-20ms per frame)
   - Canvas compositing
   - Blob encoding

3. **IndexedDB Write** (5-10ms per frame with batching)
   - Disk I/O
   - Minimized with batch writer

4. **WebGL Rendering** (variable)
   - Scene complexity dependent
   - Shaders, particle systems, post-processing

**Optimizations:**

1. **Fast Frame Capture**
   - Direct canvas compositing
   - JPEG encoding (5-10× faster than PNG)
   - Reduced quality (FFmpeg handles final)

2. **Batch Frame Writer**
   - Keep IndexedDB connection open
   - 20-40× faster than individual operations

3. **Minimal Browser Yielding**
   - Yield every 10 frames (not every frame)
   - Balances responsiveness and speed

4. **WebGL Optimization**
   - `gl.finish()` ensures completion
   - No redundant state changes

### Encoding Performance

**FFmpeg.wasm Performance:**

| Format | Quality | Speed | 1min @60fps (1080p) |
|--------|---------|-------|---------------------|
| MP4 | High (veryfast, CRF 18) | ~3 fps | ~20 minutes |
| MP4 | Medium (faster, CRF 22) | ~5 fps | ~12 minutes |
| MP4 | Low (ultrafast, CRF 26) | ~8 fps | ~7 minutes |
| WebM | High | ~2 fps | ~30 minutes |
| WebM | Medium | ~3 fps | ~20 minutes |

**Note:** WASM is **10-20× slower** than native FFmpeg

**Optimizations:**

1. **Preset Selection**
   - `veryfast` instead of `slow` (3-4× faster)
   - Still produces excellent quality

2. **JPEG Input Frames**
   - Faster to decode than PNG
   - Smaller virtual filesystem

3. **Progress Tracking**
   - Parse FFmpeg logs for frame count
   - Prevents blocking on progress queries

### Storage Performance

**IndexedDB Characteristics:**

- **Write speed:** 5-10ms per frame (batched)
- **Read speed:** ~1ms per frame (batched)
- **Capacity:** 50%+ of disk space (typically 100+ GB)
- **Quota:** Automatically managed by browser

**Frame Size Estimates:**

| Resolution | JPEG Quality | Bytes per Frame | 60fps for 1min |
|-----------|-------------|----------------|---------------|
| 720p | 0.85 | ~50 KB | ~180 MB |
| 1080p | 0.85 | ~100 KB | ~360 MB |
| 1440p | 0.85 | ~200 KB | ~720 MB |
| 4K | 0.85 | ~400 KB | ~1.4 GB |

---

## Error Handling & Edge Cases

### Error Categories

#### 1. User Errors

**No audio loaded:**
```typescript
if (!audioUrl) {
  toast.error('Please load an audio file first');
  return;
}
```

**Invalid settings:**
```typescript
if (duration <= 0) {
  throw new Error('Duration must be positive');
}
```

#### 2. Resource Errors

**Storage quota exceeded:**
```typescript
try {
  await frameWriter.writeFrame(frameIndex, blob);
} catch (error) {
  if (error.name === 'QuotaExceededError') {
    throw new Error('Storage quota exceeded. Try shorter duration or lower resolution.');
  }
}
```

**FFmpeg load failure:**
```typescript
try {
  await ffmpeg.load({ ... });
} catch (error) {
  throw new Error('Failed to load FFmpeg. Check internet connection.');
}
```

#### 3. System Errors

**WebGL context loss:**
```typescript
canvas.addEventListener('webglcontextlost', (event) => {
  event.preventDefault();
  log('error', 'WebGL context lost during export');
  cancelExport();
});
```

**Tab backgrounded:**
```typescript
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    log('warning', 'Tab is hidden - export may pause or slow down!');
  }
});
```

### Edge Case Handling

#### Short Audio Files

```typescript
const totalFrames = Math.ceil(duration * fps);
if (totalFrames < 10) {
  log('warning', 'Export duration is very short');
}
```

#### Long Exports

```typescript
// Timeout after 15 minutes of encoding
const timeout = setTimeout(() => {
  throw new Error('Export timeout - video may be too long');
}, 15 * 60 * 1000);
```

#### Mismatched Audio/Video Duration

```typescript
// Use -shortest flag in FFmpeg
'-shortest' // Stop when shortest stream ends
```

#### No Layers

```typescript
if (layerStore.layers.length === 0) {
  throw new Error('No layers to export. Add a visualization layer first.');
}
```

#### Missing Render Functions

```typescript
if (layerStore.layerRenderFunctions.size === 0) {
  log('warning', 'No render functions registered - layers may not render');
}
```

### Recovery Mechanisms

#### Automatic Cleanup

```typescript
try {
  await exportVideo(...);
} catch (error) {
  // Always clean up, even on error
  await clearAllFrames();
  if (wakeLock) await wakeLock.release();
  if (wasPlaying) editorStore.setIsPlaying(true);
}
```

#### State Reset

```typescript
resetExport: () => set({
  isExporting: false,
  progress: defaultProgress,
  capturedFrames: [],
  error: null,
  shouldCancel: false,
  logs: [],
  currentOfflineAudioData: null
})
```

#### Partial Export Recovery

```typescript
// Future enhancement: Resume from last completed frame
const lastCompletedFrame = await getFrameCount();
if (lastCompletedFrame > 0) {
  // Resume from lastCompletedFrame + 1
}
```

---

## Dependencies

### Core Dependencies

```json
{
  "html2canvas": "^1.4.1",
  "@ffmpeg/ffmpeg": "^0.12.15",
  "@ffmpeg/util": "^0.12.2"
}
```

#### html2canvas (Legacy - No Longer Used)

**Purpose:** DOM-to-canvas rendering (replaced by fast-frame-capture)

**Why Replaced:** Too slow (20-100ms per frame)

**Current Status:** Import exists but unused

#### @ffmpeg/ffmpeg

**Purpose:** Browser-based video encoding

**Architecture:** WebAssembly port of FFmpeg

**Size:** ~30 MB (loaded once, cached)

**Features:**
- H.264 (libx264) encoding
- VP9 (libvpx) encoding
- AAC audio encoding
- Full FFmpeg filter support

**Alternatives Considered:**
- Server-side encoding (requires backend)
- MediaRecorder API (no offline rendering)
- Canvas recording (limited format support)

#### @ffmpeg/util

**Purpose:** Utilities for FFmpeg.wasm

**Features:**
- `fetchFile()` - Blob/URL to Uint8Array
- `toBlobURL()` - Create blob URLs for WASM
- Progress event handling

### Internal Dependencies

```typescript
// State Management
import useExportStore from '@/lib/stores/export-store';
import useAudioStore from '@/lib/stores/audio-store';
import useEditorStore from '@/lib/stores/editor-store';
import useLayerStore from '@/lib/stores/layer-store';

// Utilities
import { extractOfflineAudioData } from '@/lib/utils/offline-audio-extractor';
import { fastCaptureFrame } from '@/lib/utils/fast-frame-capture';
import { BatchFrameWriter, getAllFrames, clearAllFrames } from '@/lib/utils/frame-storage';
import { initFFmpeg, encodeVideo, downloadVideo } from '@/lib/utils/video-encoder';

// UI Components
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Select } from '@/components/ui/select';
```

### Browser APIs

```typescript
// Storage
IndexedDB

// Media
AudioContext
OfflineAudioContext

// Graphics
Canvas 2D API
WebGL / WebGL2

// Utilities
Blob
URL.createObjectURL
requestAnimationFrame

// Advanced
Wake Lock API (optional)
Page Visibility API
```

---

## Future Enhancements

### Planned Improvements

1. **Background Export**
   - Use OffscreenCanvas
   - Render in Web Worker
   - Allow tab switching

2. **Pause/Resume**
   - Save export state
   - Resume from last frame
   - Handle browser refreshes

3. **Export Queue**
   - Queue multiple exports
   - Batch process overnight
   - Priority scheduling

4. **Cloud Encoding**
   - Optional server-side FFmpeg
   - 10-20× faster encoding
   - Larger video support

5. **Real-Time Preview**
   - Show frames as they render
   - Quality preview
   - Spot-check capability

6. **Custom Audio**
   - Separate audio track
   - Multiple audio sources
   - Audio mixing

7. **Advanced Encoding**
   - Hardware acceleration (where available)
   - HDR support
   - Higher bitrates

### Architectural Considerations

**For Background Export:**
- Move rendering to Web Worker
- Use OffscreenCanvas
- Message passing for state
- Challenge: Three.js not worker-compatible

**For Cloud Encoding:**
- API for frame upload
- Server-side FFmpeg
- Streaming download
- Challenge: Cost and infrastructure

---

## Conclusion

The export system successfully provides **professional-grade video export** while:

✅ **Preserving** the stateful, interactive architecture  
✅ **Ensuring** deterministic, frame-perfect rendering  
✅ **Running** entirely in the browser  
✅ **Supporting** high resolutions and multiple formats  
✅ **Maintaining** perfect audio synchronization  

The architecture balances **pragmatism** (work with existing system) with **quality** (frame-perfect output) to deliver a robust, production-ready export solution.

---

**Document Version:** 1.0  
**Last Updated:** 2025-01-18  
**Maintained By:** Viz-Engine Development Team


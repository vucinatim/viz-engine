# Audio Trimming Fix - Export Selected Audio Segment

## Problem Summary

When exporting a video with a custom start time and duration, the exported video always played audio from the beginning of the track, ignoring the selected time range.

**Example:**
- User selects: Start at 30s, export 10s duration
- Expected: Video plays audio from 30s-40s
- **Actual (before fix)**: Video plays audio from 0s-10s ❌

## Root Cause

The video encoder was receiving the full audio file without any trimming information:

1. ✅ Visual frames were correctly rendered from the selected time range
2. ❌ Audio file was passed to FFmpeg without start time or duration
3. ❌ FFmpeg encoded the entire audio from the beginning

**Location:** `video-encoder.ts` lines 174-178

```typescript
// OLD CODE - No trimming!
const audioData = await fetchFile(audioUrl);
await ffmpeg.writeFile('audio.mp3', audioData);
audioInput = '-i audio.mp3';  // Uses full audio file
```

## The Fix

### 1. Updated `encodeVideo` Function Signature

**File:** `src/lib/utils/video-encoder.ts`

Added optional audio trimming parameters:

```typescript
export async function encodeVideo(
  frames: Blob[],
  audioUrl: string | null,
  options: {
    fps: number;
    width: number;
    height: number;
    format: 'mp4' | 'webm';
    quality: 'high' | 'medium' | 'low';
    audioStartTime?: number;  // NEW: Start time in seconds
    audioDuration?: number;   // NEW: Duration in seconds
  },
  onProgress?: (progress: number) => void,
): Promise<Blob>
```

### 2. Added FFmpeg Audio Trimming Flags

Used FFmpeg's `-ss` (seek start) and `-t` (duration) flags to trim the audio:

```typescript
const command = [
  '-framerate', String(fps),
  '-pattern_type', 'glob',
  '-i', 'frame*.jpg',
  
  // Audio trimming - CRITICAL ORDER!
  // -ss and -t MUST come BEFORE -i for input seeking (faster & more accurate)
  ...(hasAudio && audioStartTime !== undefined 
    ? ['-ss', String(audioStartTime)]   // Seek to start time
    : []),
  ...(hasAudio && audioDuration !== undefined 
    ? ['-t', String(audioDuration)]     // Only read this duration
    : []),
  ...(hasAudio ? ['-i', 'audio.mp3'] : []),
  
  // ... rest of encoding parameters
];
```

**Why This Order Matters:**

- ✅ `-ss` **BEFORE** `-i` = **Input seeking** (fast, accurate, frame-accurate)
- ❌ `-ss` **AFTER** `-i` = **Output seeking** (slow, decodes then discards frames)

### 3. Updated Export Orchestrator

**File:** `src/lib/utils/export-orchestrator.ts`

Now passes the start time and duration to the encoder:

```typescript
const videoBlob = await encodeVideo(
  frames,
  audioUrl,
  {
    fps: finalSettings.fps,
    width: finalSettings.width,
    height: finalSettings.height,
    format: finalSettings.format,
    quality: finalSettings.quality,
    audioStartTime: finalSettings.startTime,  // NEW
    audioDuration: finalSettings.duration,    // NEW
  },
  onProgress
);
```

## Files Modified

1. **`src/lib/utils/video-encoder.ts`**
   - Added `audioStartTime` and `audioDuration` parameters
   - Added FFmpeg `-ss` and `-t` flags for audio trimming
   - Added logging for audio trimming info
   - Changed `audioInput` variable to `hasAudio` boolean

2. **`src/lib/utils/export-orchestrator.ts`**
   - Pass `startTime` and `duration` to `encodeVideo()`

## How It Works

### Before Fix:
```
Audio File (180s total)
├─ [0s───────────────────────────180s]
│
Export: Start=30s, Duration=10s
├─ Frames: [30s─40s] ✅ Correct
├─ Audio:  [0s─10s]  ❌ Wrong!
```

### After Fix:
```
Audio File (180s total)
├─ [0s───────────────────────────180s]
│
Export: Start=30s, Duration=10s
├─ Frames: [30s─40s] ✅ Correct
├─ Audio:  [30s─40s] ✅ Correct!
```

## FFmpeg Command Example

**Before (wrong):**
```bash
ffmpeg -framerate 60 -i frame*.jpg -i audio.mp3 -c:v libx264 output.mp4
# Uses entire audio file from start
```

**After (correct):**
```bash
ffmpeg -framerate 60 -i frame*.jpg -ss 30 -t 10 -i audio.mp3 -c:v libx264 output.mp4
# Starts at 30s, takes 10s of audio
```

## Testing

To verify the fix:

1. Load a long audio file (e.g., 3+ minutes)
2. Set export settings:
   - Start Time: 30s
   - Duration: 10s
3. Export video
4. Verify:
   - ✅ Video is exactly 10 seconds long
   - ✅ Audio starts at the 30s mark of the original track
   - ✅ Audio ends at the 40s mark of the original track
   - ✅ Visual and audio are synced

## Technical Notes

### Why Input Seeking?

FFmpeg supports two types of seeking:

1. **Input Seeking** (`-ss` before `-i`):
   - Fast: Seeks at the demuxer level
   - Accurate: Frame-accurate for most formats
   - Recommended for trimming

2. **Output Seeking** (`-ss` after `-i`):
   - Slow: Decodes all frames, then discards
   - Less accurate: Can have sync issues
   - Should be avoided

We use **input seeking** for optimal performance and accuracy.

### Audio/Video Sync

The `-shortest` flag ensures the video stops when the shortest stream (audio or video) ends:

```typescript
...(hasAudio ? ['-shortest'] : [])
```

This prevents issues if:
- Audio is shorter than video frames
- Video frames are fewer than audio duration

## Performance Impact

✅ **Improved Performance:**
- Input seeking is much faster than output seeking
- No need to decode/discard unwanted audio
- Reduces encoding time for exports with late start times

✅ **Smaller Intermediate Data:**
- Only loads the needed audio segment
- Reduces memory usage during encoding

## Related Fixes

This completes the audio timing fix series:

1. ✅ **Frame Seeking Fix** - Correct visual frame timing
2. ✅ **Offline Audio Injection** - Frame-accurate audio reactivity
3. ✅ **Audio Trimming Fix** - Correct audio segment in final video

All three together ensure perfect audio/visual sync in exported videos!


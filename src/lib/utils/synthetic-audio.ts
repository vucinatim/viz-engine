/**
 * Loads and extracts audio data from a real audio file for component previews
 */

const FFT_SIZE = 2048;
const FREQUENCY_BIN_COUNT = FFT_SIZE / 2;
const AUDIO_FILE = '/music/[DnB] Dancefloor DnB.mp3';
const START_TIME = 43; // seconds
const DURATION = 5; // seconds

let cachedAudioData: {
  timeDomainFrames: Uint8Array[];
  frequencyFrames: Uint8Array[];
  sampleRate: number;
} | null = null;

let loadingPromise: Promise<void> | null = null;

/**
 * Loads and processes the audio file
 */
async function loadAudioData(): Promise<void> {
  if (cachedAudioData) return;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    try {
      // Fetch the audio file
      const response = await fetch(AUDIO_FILE);
      const arrayBuffer = await response.arrayBuffer();

      // Create offline audio context to decode
      const audioContext = new OfflineAudioContext(2, 44100 * 10, 44100);
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      const sampleRate = audioBuffer.sampleRate;
      const startSample = Math.floor(START_TIME * sampleRate);
      const endSample = Math.floor((START_TIME + DURATION) * sampleRate);

      // Extract the channel data for the desired range
      const channelData = audioBuffer.getChannelData(0);
      const snippet = channelData.slice(startSample, endSample);

      // Create an analyzer to process the audio
      const analyzerContext = new AudioContext();
      const analyzer = analyzerContext.createAnalyser();
      analyzer.fftSize = FFT_SIZE;

      // Process audio in chunks to create frames
      const framesPerSecond = 60;
      const samplesPerFrame = Math.floor(sampleRate / framesPerSecond);
      const totalFrames = Math.floor(
        ((snippet.length / samplesPerFrame) * DURATION) / DURATION,
      );

      const timeDomainFrames: Uint8Array[] = [];
      const frequencyFrames: Uint8Array[] = [];

      // Create offline context to analyze the snippet
      const offlineContext = new OfflineAudioContext(
        1,
        snippet.length,
        sampleRate,
      );
      const source = offlineContext.createBufferSource();
      const offlineAnalyzer = offlineContext.createAnalyser();
      offlineAnalyzer.fftSize = FFT_SIZE;
      offlineAnalyzer.smoothingTimeConstant = 0.8;

      // Create a buffer from the snippet
      const snippetBuffer = offlineContext.createBuffer(
        1,
        snippet.length,
        sampleRate,
      );
      snippetBuffer.copyToChannel(snippet, 0);
      source.buffer = snippetBuffer;

      source.connect(offlineAnalyzer);
      offlineAnalyzer.connect(offlineContext.destination);

      // Sample at regular intervals
      const frameInterval = Math.floor(
        snippet.length / (DURATION * framesPerSecond),
      );

      for (let i = 0; i < DURATION * framesPerSecond; i++) {
        const sampleOffset = i * frameInterval;
        if (sampleOffset + FFT_SIZE > snippet.length) break;

        // Get time domain data
        const timeDomainData = new Uint8Array(FFT_SIZE);
        for (let j = 0; j < FFT_SIZE; j++) {
          const sample = snippet[sampleOffset + j];
          timeDomainData[j] = Math.floor(((sample + 1) / 2) * 255);
        }

        // Calculate frequency data using FFT (simplified)
        const frequencyData = new Uint8Array(FREQUENCY_BIN_COUNT);
        // For a real implementation, we'd do an actual FFT here
        // For now, we'll create a simplified version based on time domain
        for (let j = 0; j < FREQUENCY_BIN_COUNT; j++) {
          let sum = 0;
          const binSize = Math.floor(FFT_SIZE / FREQUENCY_BIN_COUNT);
          for (let k = 0; k < binSize; k++) {
            sum += Math.abs(timeDomainData[j * binSize + k] - 128);
          }
          frequencyData[j] = Math.min(255, Math.floor(sum / binSize) * 4);
        }

        timeDomainFrames.push(timeDomainData);
        frequencyFrames.push(frequencyData);
      }

      await analyzerContext.close();

      cachedAudioData = {
        timeDomainFrames,
        frequencyFrames,
        sampleRate,
      };
    } catch (error) {
      console.error('Failed to load audio data for previews:', error);
      // Fall back to synthetic data on error
      cachedAudioData = null;
    }
  })();

  return loadingPromise;
}

/**
 * Gets time domain data for a given time
 * @param time Current time in seconds
 * @param duration Total loop duration in seconds (should match DURATION)
 * @returns Uint8Array with waveform data
 */
export function generateSyntheticTimeDomain(
  time: number,
  duration: number = DURATION,
): Uint8Array {
  if (!cachedAudioData || cachedAudioData.timeDomainFrames.length === 0) {
    // Fallback to simple synthetic data if audio isn't loaded
    const data = new Uint8Array(FFT_SIZE);
    data.fill(128);
    return data;
  }

  const loopTime = time % duration;
  const frameIndex = Math.floor(
    (loopTime / duration) * cachedAudioData.timeDomainFrames.length,
  );
  const clampedIndex = Math.min(
    frameIndex,
    cachedAudioData.timeDomainFrames.length - 1,
  );

  return cachedAudioData.timeDomainFrames[clampedIndex];
}

/**
 * Gets frequency data for a given time
 * @param time Current time in seconds
 * @param duration Total loop duration in seconds (should match DURATION)
 * @returns Uint8Array with frequency data
 */
export function generateSyntheticFrequency(
  time: number,
  duration: number = DURATION,
): Uint8Array {
  if (!cachedAudioData || cachedAudioData.frequencyFrames.length === 0) {
    // Fallback to simple synthetic data if audio isn't loaded
    const data = new Uint8Array(FREQUENCY_BIN_COUNT);
    data.fill(30);
    return data;
  }

  const loopTime = time % duration;
  const frameIndex = Math.floor(
    (loopTime / duration) * cachedAudioData.frequencyFrames.length,
  );
  const clampedIndex = Math.min(
    frameIndex,
    cachedAudioData.frequencyFrames.length - 1,
  );

  return cachedAudioData.frequencyFrames[clampedIndex];
}

/**
 * Creates a synthetic audio analyzer that can be used for previews
 * Returns an object with the same interface as a real AnalyserNode
 */
export function createSyntheticAnalyzer(): {
  fftSize: number;
  frequencyBinCount: number;
  context: { sampleRate: number };
} {
  return {
    fftSize: FFT_SIZE,
    frequencyBinCount: FREQUENCY_BIN_COUNT,
    context: {
      sampleRate: cachedAudioData?.sampleRate || 44100,
    },
  };
}

/**
 * Preloads the audio data - should be called early
 */
export async function preloadAudioData(): Promise<void> {
  return loadAudioData();
}

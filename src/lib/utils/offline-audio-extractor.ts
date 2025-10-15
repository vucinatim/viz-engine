/**
 * Offline Audio Data Extractor
 *
 * Pre-processes an audio file to extract frequency and time-domain data
 * for every frame at a specific FPS. This enables frame-perfect audio
 * synchronization during non-real-time video export.
 */

export interface AudioFrameData {
  frequencyData: Uint8Array;
  timeDomainData: Uint8Array;
  sampleRate: number;
  fftSize: number;
}

export interface OfflineAudioData {
  frames: AudioFrameData[];
  duration: number;
  sampleRate: number;
  fftSize: number;
}

/**
 * Extract audio data for every frame from an audio file
 * @param audioBuffer - Decoded audio buffer
 * @param fps - Target frames per second
 * @param fftSize - FFT size for frequency analysis (must be power of 2)
 * @param startTime - Start time in seconds (default: 0)
 * @param duration - Duration in seconds (default: full audio duration)
 * @returns Array of audio data for each frame
 */
export async function extractOfflineAudioData(
  audioBuffer: AudioBuffer,
  fps: number = 60,
  fftSize: number = 2048,
  startTime: number = 0,
  duration?: number,
): Promise<OfflineAudioData> {
  const sampleRate = audioBuffer.sampleRate;
  const audioDuration = duration ?? audioBuffer.duration;
  const totalFrames = Math.ceil(audioDuration * fps);

  const frames: AudioFrameData[] = [];

  // We'll use an offline audio context to analyze the audio
  // Process the audio in chunks corresponding to each frame
  const samplesPerFrame = sampleRate / fps;

  // Get the raw audio data (mono - mix channels if stereo)
  const channelData = audioBuffer.getChannelData(0);
  const channelData2 =
    audioBuffer.numberOfChannels > 1 ? audioBuffer.getChannelData(1) : null;

  // Mix to mono if stereo
  const monoData = new Float32Array(channelData.length);
  for (let i = 0; i < channelData.length; i++) {
    monoData[i] = channelData2
      ? (channelData[i] + channelData2[i]) / 2
      : channelData[i];
  }

  // Calculate the starting sample offset based on startTime
  const startSampleOffset = Math.floor(startTime * sampleRate);

  // Process each frame
  for (let frameIndex = 0; frameIndex < totalFrames; frameIndex++) {
    const startSample =
      Math.floor(frameIndex * samplesPerFrame) + startSampleOffset;
    const endSample = Math.min(
      Math.floor((frameIndex + 1) * samplesPerFrame) + startSampleOffset,
      monoData.length,
    );

    // Extract the audio chunk for this frame
    const frameChunk = monoData.slice(startSample, endSample);

    // Perform FFT analysis on this chunk
    const { frequencyData, timeDomainData } = analyzeAudioChunk(
      frameChunk,
      fftSize,
      sampleRate,
      frameIndex,
    );

    frames.push({
      frequencyData,
      timeDomainData,
      sampleRate,
      fftSize,
    });
  }

  return {
    frames,
    duration: audioDuration,
    sampleRate,
    fftSize,
  };
}

/**
 * Analyze a chunk of audio data using FFT
 * This mimics what the Web Audio API's AnalyserNode does
 */
function analyzeAudioChunk(
  audioChunk: Float32Array,
  fftSize: number,
  sampleRate: number,
  frameIndex?: number,
): { frequencyData: Uint8Array; timeDomainData: Uint8Array } {
  // Prepare the audio chunk for FFT
  // Pad or truncate to fftSize
  const fftInput = new Float32Array(fftSize);
  for (let i = 0; i < fftSize; i++) {
    fftInput[i] = i < audioChunk.length ? audioChunk[i] : 0;
  }

  // Apply Hanning window to reduce spectral leakage
  applyHanningWindow(fftInput);

  // Perform FFT
  const fftOutput = fft(fftInput);

  // Convert to frequency magnitude (0-255 scale like AnalyserNode)
  const frequencyBinCount = fftSize / 2;
  const frequencyData = new Uint8Array(frequencyBinCount);

  const minDecibels = -90;
  const maxDecibels = -10;
  const decibelRange = maxDecibels - minDecibels;

  for (let i = 0; i < frequencyBinCount; i++) {
    const real = fftOutput[i * 2];
    const imag = fftOutput[i * 2 + 1];
    const magnitude = Math.sqrt(real * real + imag * imag);

    // Normalize by FFT size (this is critical - AnalyserNode does this automatically)
    // Also apply a smoothing factor to match AnalyserNode's behavior
    const normalizedMagnitude = magnitude / fftSize;

    // Convert to decibels
    const decibels =
      normalizedMagnitude > 0
        ? 20 * Math.log10(normalizedMagnitude)
        : minDecibels;

    // Scale to 0-255 range
    const normalized = (decibels - minDecibels) / decibelRange;
    frequencyData[i] = Math.max(0, Math.min(255, Math.floor(normalized * 255)));
  }

  // Convert time-domain data to 0-255 scale like AnalyserNode
  const timeDomainData = new Uint8Array(fftSize);
  for (let i = 0; i < fftSize; i++) {
    // Convert from [-1, 1] to [0, 255]
    timeDomainData[i] = Math.floor(((fftInput[i] + 1) / 2) * 255);
  }

  return { frequencyData, timeDomainData };
}

/**
 * Apply Hanning window function to reduce spectral leakage
 */
function applyHanningWindow(data: Float32Array): void {
  const length = data.length;
  for (let i = 0; i < length; i++) {
    const multiplier = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (length - 1)));
    data[i] *= multiplier;
  }
}

/**
 * Simple FFT implementation using Cooley-Tukey algorithm
 * Note: For production use, consider using a library like fft.js for better performance
 */
function fft(input: Float32Array): Float32Array {
  const n = input.length;

  // Check if n is a power of 2
  if ((n & (n - 1)) !== 0) {
    throw new Error('FFT size must be a power of 2');
  }

  // Convert input to complex numbers (real, imag) pairs
  const output = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) {
    output[i * 2] = input[i]; // real
    output[i * 2 + 1] = 0; // imaginary
  }

  // Bit-reversal permutation
  for (let i = 0; i < n; i++) {
    const j = reverseBits(i, Math.log2(n));
    if (j > i) {
      // Swap
      [output[i * 2], output[j * 2]] = [output[j * 2], output[i * 2]];
      [output[i * 2 + 1], output[j * 2 + 1]] = [
        output[j * 2 + 1],
        output[i * 2 + 1],
      ];
    }
  }

  // Cooley-Tukey FFT
  for (let size = 2; size <= n; size *= 2) {
    const halfSize = size / 2;
    const step = n / size;

    for (let i = 0; i < n; i += size) {
      for (let j = 0; j < halfSize; j++) {
        const k = j * step;
        const angle = (-2 * Math.PI * k) / n;
        const twiddleReal = Math.cos(angle);
        const twiddleImag = Math.sin(angle);

        const evenIdx = (i + j) * 2;
        const oddIdx = (i + j + halfSize) * 2;

        const evenReal = output[evenIdx];
        const evenImag = output[evenIdx + 1];
        const oddReal = output[oddIdx];
        const oddImag = output[oddIdx + 1];

        const tReal = twiddleReal * oddReal - twiddleImag * oddImag;
        const tImag = twiddleReal * oddImag + twiddleImag * oddReal;

        output[evenIdx] = evenReal + tReal;
        output[evenIdx + 1] = evenImag + tImag;
        output[oddIdx] = evenReal - tReal;
        output[oddIdx + 1] = evenImag - tImag;
      }
    }
  }

  return output;
}

/**
 * Reverse bits of a number
 */
function reverseBits(num: number, bits: number): number {
  let result = 0;
  for (let i = 0; i < bits; i++) {
    result = (result << 1) | (num & 1);
    num >>= 1;
  }
  return result;
}

/**
 * Load an audio file and decode it
 */
export async function loadAndDecodeAudio(
  audioUrl: string,
): Promise<AudioBuffer> {
  const response = await fetch(audioUrl);
  const arrayBuffer = await response.arrayBuffer();

  // Use a temporary offline context just for decoding
  const tempContext = new OfflineAudioContext(2, 44100, 44100);
  const audioBuffer = await tempContext.decodeAudioData(arrayBuffer);

  return audioBuffer;
}

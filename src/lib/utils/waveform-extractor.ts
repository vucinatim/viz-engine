/**
 * Waveform Extractor
 *
 * Extracts visual waveform data from an audio buffer for display in timeline components.
 * Similar to how Wavesurfer.js generates waveform visualizations.
 */

export interface WaveformData {
  peaks: number[];
  duration: number;
  sampleRate: number;
  channels: number;
  leftChannel?: number[];
  rightChannel?: number[];
}

export interface WaveformOptions {
  /** Number of peaks to generate (default: 1000) */
  peaksCount?: number;
  /** Whether to normalize the waveform (default: true) */
  normalize?: boolean;
  /** Whether to use RMS (Root Mean Square) for better visual representation (default: true) */
  useRMS?: boolean;
}

/**
 * Extract waveform data from an audio buffer
 * @param audioBuffer - The decoded audio buffer
 * @param options - Waveform generation options
 * @returns Waveform data with peaks array
 */
export function extractWaveform(
  audioBuffer: AudioBuffer,
  options: WaveformOptions = {},
): WaveformData {
  const { peaksCount = 1000, normalize = true, useRMS = true } = options;

  const duration = audioBuffer.duration;
  const sampleRate = audioBuffer.sampleRate;
  const channels = audioBuffer.numberOfChannels;

  // Get channel data
  const channelData = [];
  for (let i = 0; i < channels; i++) {
    channelData.push(audioBuffer.getChannelData(i));
  }

  const monoData = new Float32Array(channelData[0].length);
  if (channels === 1) {
    monoData.set(channelData[0]);
  } else {
    // Mix channels to mono for the main peaks array
    for (let i = 0; i < monoData.length; i++) {
      let sum = 0;
      for (let ch = 0; ch < channels; ch++) {
        sum += channelData[ch][i];
      }
      monoData[i] = sum / channels;
    }
  }

  // Calculate samples per peak
  const samplesPerPeak = Math.floor(monoData.length / peaksCount);

  // Extract peaks for mono (main peaks array)
  const peaks: number[] = [];

  for (let i = 0; i < peaksCount; i++) {
    const start = i * samplesPerPeak;
    const end = Math.min(start + samplesPerPeak, monoData.length);

    let peak = 0;

    if (useRMS) {
      // Use RMS for better visual representation
      let sum = 0;
      for (let j = start; j < end; j++) {
        sum += monoData[j] * monoData[j];
      }
      peak = Math.sqrt(sum / (end - start));
    } else {
      // Use absolute peak value
      for (let j = start; j < end; j++) {
        peak = Math.max(peak, Math.abs(monoData[j]));
      }
    }

    peaks.push(peak);
  }

  // Extract stereo channel peaks if we have 2+ channels
  let leftChannelPeaks: number[] | undefined;
  let rightChannelPeaks: number[] | undefined;

  if (channels >= 2) {
    // Left channel (channel 0)
    leftChannelPeaks = [];
    for (let i = 0; i < peaksCount; i++) {
      const start = i * samplesPerPeak;
      const end = Math.min(start + samplesPerPeak, channelData[0].length);

      let peak = 0;

      if (useRMS) {
        let sum = 0;
        for (let j = start; j < end; j++) {
          sum += channelData[0][j] * channelData[0][j];
        }
        peak = Math.sqrt(sum / (end - start));
      } else {
        for (let j = start; j < end; j++) {
          peak = Math.max(peak, Math.abs(channelData[0][j]));
        }
      }

      leftChannelPeaks.push(peak);
    }

    // Right channel (channel 1)
    rightChannelPeaks = [];
    for (let i = 0; i < peaksCount; i++) {
      const start = i * samplesPerPeak;
      const end = Math.min(start + samplesPerPeak, channelData[1].length);

      let peak = 0;

      if (useRMS) {
        let sum = 0;
        for (let j = start; j < end; j++) {
          sum += channelData[1][j] * channelData[1][j];
        }
        peak = Math.sqrt(sum / (end - start));
      } else {
        for (let j = start; j < end; j++) {
          peak = Math.max(peak, Math.abs(channelData[1][j]));
        }
      }

      rightChannelPeaks.push(peak);
    }
  } else if (channels === 1) {
    // For mono, use the same data for both channels
    leftChannelPeaks = [...peaks];
    rightChannelPeaks = [...peaks];
  }

  // Normalize all peaks to 0-1 range if requested
  if (normalize) {
    if (peaks.length > 0) {
      const maxPeak = Math.max(...peaks);
      if (maxPeak > 0) {
        for (let i = 0; i < peaks.length; i++) {
          peaks[i] = peaks[i] / maxPeak;
        }
      }
    }

    if (leftChannelPeaks && leftChannelPeaks.length > 0) {
      const maxLeftPeak = Math.max(...leftChannelPeaks);
      if (maxLeftPeak > 0) {
        for (let i = 0; i < leftChannelPeaks.length; i++) {
          leftChannelPeaks[i] = leftChannelPeaks[i] / maxLeftPeak;
        }
      }
    }

    if (rightChannelPeaks && rightChannelPeaks.length > 0) {
      const maxRightPeak = Math.max(...rightChannelPeaks);
      if (maxRightPeak > 0) {
        for (let i = 0; i < rightChannelPeaks.length; i++) {
          rightChannelPeaks[i] = rightChannelPeaks[i] / maxRightPeak;
        }
      }
    }
  }

  return {
    peaks,
    duration,
    sampleRate,
    channels,
    leftChannel: leftChannelPeaks,
    rightChannel: rightChannelPeaks,
  };
}

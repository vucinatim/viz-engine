import type { VizArtifactRef } from "./artifacts.js";
import type { VizAssetId } from "./ids.js";

export type VizAudioFeatureProfile = "standard" | "extended" | "specialized";

export type VizStandardAudioFeatureName =
  | "rms"
  | "loudness"
  | "bass-energy"
  | "mid-energy"
  | "treble-energy"
  | "spectral-centroid"
  | "spectral-flux"
  | "onset-strength"
  | "waveform-peak";

export interface VizAudioFeatureSeries {
  name: string;
  values: number[];
  unit?: "linear-amplitude" | "unit" | "hertz" | "custom";
  normalization?: "none" | "decibel-unit" | "artifact-peak" | "custom";
  min?: number;
  max?: number;
  description?: string;
}

export interface VizAudioSourceWindow {
  startSample: number;
  sampleCount: number;
  startSeconds: number;
  durationSeconds: number;
}

export interface VizAudioFrameAlignment {
  fps: number;
  frameCount: number;
  alignment: "frame-centered";
}

export interface VizAudioAnalysisIdentity {
  pipeline: string;
  sourceContentIdentity: string;
  sampleRate: number;
  channelCount: number;
  fftSize: number;
  window: "hann";
  minDecibels: number;
  maxDecibels: number;
}

export interface VizPackedAudioFrameSeries {
  encoding: "uint8-base64";
  frameCount: number;
  valuesPerFrame: number;
  data: string;
}

export interface VizPackedAudioFrames {
  frequency: VizPackedAudioFrameSeries;
  timeDomain: VizPackedAudioFrameSeries;
}

export interface VizAudioFeatureTimelineArtifact extends VizArtifactRef {
  schemaVersion: 1;
  kind: "audio-feature-timeline";
  sourceAssetId: VizAssetId;
  profile: VizAudioFeatureProfile;
  sourceWindow: VizAudioSourceWindow;
  frameAlignment: VizAudioFrameAlignment;
  analysis?: VizAudioAnalysisIdentity;
  featureSeries: VizAudioFeatureSeries[];
  packedFrames?: VizPackedAudioFrames;
}

const BASE64_ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

export const encodeVizUint8Base64 = (bytes: Uint8Array): string => {
  let output = "";
  for (let index = 0; index < bytes.length; index += 3) {
    const first = bytes[index]!;
    const second = bytes[index + 1];
    const third = bytes[index + 2];
    const combined =
      (first << 16) | ((second ?? 0) << 8) | (third ?? 0);
    output += BASE64_ALPHABET[(combined >> 18) & 63];
    output += BASE64_ALPHABET[(combined >> 12) & 63];
    output +=
      second === undefined
        ? "="
        : BASE64_ALPHABET[(combined >> 6) & 63];
    output +=
      third === undefined ? "=" : BASE64_ALPHABET[combined & 63];
  }
  return output;
};

export const decodeVizUint8Base64 = (encoded: string): Uint8Array => {
  if (
    encoded.length % 4 !== 0 ||
    !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(
      encoded,
    )
  ) {
    throw new Error("Invalid canonical uint8 base64 payload.");
  }

  const padding = encoded.endsWith("==")
    ? 2
    : encoded.endsWith("=")
      ? 1
      : 0;
  const bytes = new Uint8Array((encoded.length / 4) * 3 - padding);
  let outputIndex = 0;

  for (let index = 0; index < encoded.length; index += 4) {
    const first = BASE64_ALPHABET.indexOf(encoded[index]!);
    const second = BASE64_ALPHABET.indexOf(encoded[index + 1]!);
    const third =
      encoded[index + 2] === "="
        ? 0
        : BASE64_ALPHABET.indexOf(encoded[index + 2]!);
    const fourth =
      encoded[index + 3] === "="
        ? 0
        : BASE64_ALPHABET.indexOf(encoded[index + 3]!);
    const combined =
      (first << 18) | (second << 12) | (third << 6) | fourth;

    bytes[outputIndex++] = (combined >> 16) & 255;
    if (outputIndex < bytes.length) {
      bytes[outputIndex++] = (combined >> 8) & 255;
    }
    if (outputIndex < bytes.length) {
      bytes[outputIndex++] = combined & 255;
    }
  }

  return bytes;
};

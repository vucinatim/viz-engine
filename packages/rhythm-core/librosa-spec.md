# librosa-spec

Purpose
- Define a TS-native "librosa-like" beat/rhythm analysis surface while keeping naming, concepts, and output shapes familiar to librosa users.
- Scope: beat/tempo/onset functions first, with extensibility for spectral features and timing utilities.

Design goals
- Familiar API names and parameter defaults (librosa-inspired), but implemented in TS for browser + Node.
- Clear separation between core DSP and editor/UI visualization.
- Deterministic, step-wise outputs to support visual debugging (e.g., onset envelope, tempogram, phase search).

High-level pipeline (librosa-inspired)
1) Load audio and convert to mono
   - Input: float32 PCM samples + sample rate (sr)
   - Optional: resample to target sr (e.g., 22050) for consistent analysis

2) Short-time Fourier transform (STFT)
   - Windowed analysis, hop_length, win_length, window function
   - Output: complex STFT frames; magnitude and power spectra

3) Onset strength ("onset envelope")
   - Spectral flux between frames (positive changes in magnitude)
   - Optional: frequency-weighting, log compression, local max filter
   - Output: onset_strength: number[] of length n_frames

4) Tempogram (autocorrelation or Fourier)
   - Compute tempogram from onset_strength
   - Autocorrelation tempogram yields tempo candidates in BPM or periods (lag)
   - Output: tempogram: number[] or number[][] (per frame), tempo_candidates

5) Tempo selection
   - Global tempo: pick dominant tempo candidate
   - Optional: tempo constraints (min/max BPM), prior weighting
   - Output: tempo_bpm

6) Beat tracking / phase alignment
   - Given onset envelope + tempo candidate(s), compute beat positions
   - Methods:
     - Simple comb/phase search for grid alignment (fast, visual)
     - Dynamic programming / Viterbi for more robust beat placement
   - Output: beats in frames/samples/seconds

7) Grid extraction
   - Convert beats to grid lines and optional downbeat estimation
   - Output: grid times, bar estimates, confidence

Function naming and shapes (librosa-aligned)
- load(audio, options) -> { y: Float32Array, sr: number }
- to_mono(y: Float32Array | Float32Array[], ...) -> Float32Array
- stft(y, options) -> ComplexMatrix
- magphase(stft) -> { magnitude, phase }
- onset_strength(y, options) -> { onset_env: number[], times: number[] }
- tempogram(onset_env, options) -> { tempogram: number[][], tempos: number[] }
- tempo(onset_env, options) -> { tempo: number, candidates: number[] }
- beat_track(onset_env, options) -> { tempo: number, beats: number[], confidence: number }
- frames_to_time(frames, sr, hop_length) -> number[]
- time_to_frames(times, sr, hop_length) -> number[]

Key parameters (match librosa defaults where reasonable)
- sr: 22050
- hop_length: 512
- win_length: 2048
- n_fft: 2048
- center: true (pad signal for centered frames)
- window: hann
- aggregate: mean (for onset envelope aggregation)
- max_bpm/min_bpm: 300 / 30
- tightness: beat tracking strength (DP/HMM)

Outputs and units
- Frames are indices in the STFT frame grid
- Times are in seconds
- Samples are raw PCM indices

Quality / stability notes
- Log compression on magnitude or onset envelope improves robustness
- Windowed tempogram captures tempo changes; global tempogram is simpler
- Beat tracking should expose confidence for UI visualization

Capability targets (phase 1)
- Onset envelope (flux) for full track
- Autocorrelation tempogram
- Global tempo estimate
- Beat positions in frames + seconds
- Grid visualization data for UI

Capability targets (phase 2)
- Multi-band onset envelopes (low/mid/high)
- Tempo curve over time
- Downbeat estimation (bar detection)
- Multi-tempo candidates + selection heuristics

Notes on compatibility
- Keep names, defaults, and return shapes aligned with librosa where practical
- Provide optional aliases for common librosa kwargs (e.g., hop_length, n_fft)
- Document differences explicitly when behavior diverges for performance or clarity

Terminology mapping (librosa -> rhythm-core)
- onset_strength -> onsetStrength
- tempogram -> tempogram
- beat_track -> beatTrack
- frames_to_time -> framesToTime
- time_to_frames -> timeToFrames

Rationale for TS-native implementation
- Direct port of librosa is not ideal due to numpy/scipy dependencies
- TS implementation enables real-time visualization, incremental updates, and in-browser usage

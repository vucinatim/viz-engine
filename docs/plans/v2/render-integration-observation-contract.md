# RH-03 render integration observation contract

Claim `1632735b-7331-4d82-93ec-f39667d9b6b9`, lease
`43b71fa9-e79d-401e-8c97-74ead0a05f52`, owner
`codex/night/2026-09-08T0102`, starting commit
`477b8262ae314a22a40a3fea8a473a67001678bf`.

The observable outcome is agreement between actual production preview and export
at identical frames, deterministic audio resources and drawing-buffer dimensions;
independence of an in-flight render from later editor changes; and decoded A/V
alignment. Use the actual Studio job service and mounted preview attachment.
Preserve production settings and resolved bundle assets/artifacts.

The shared Three host owns resource readiness and active asset failures. The
editor attachment exposes readiness for its last submitted frame and rejects
replacement, resize, new render or destruction during the wait. The attachment
store rejects unmount/replacement. Export must use this same host failure policy;
remove its duplicate model-failure interpretation. No alternate renderer,
asset-loader or test-only job composition is introduced.

Current evidence proves shared deterministic plans, detached exact resolution,
small codec/audio clips, positional output, cancellation and bounded handoff.
The mounted preview lacked a readiness promise distinguishing loaded from failed
assets. Add only this owner-local observation, then use it for production pixels.

Compare full pixels for Signal Cathedral and Afterlight Assembly at origin,
nonzero cold seek and return seek: global RGB SSIM >= 0.995 and normalized MAE <= 0.006.
Record nonblank contribution, active component/resource identities and difference
images so matching empty frames cannot pass. Reuse RH-01's fine-detail DPR2 proof
instead of building a second resolution sensor. Hold/fail a real resource to
reject premature readiness.

During a second real clip export, mutate visible editor content after capture
progress begins, seek and resize preview. Compare decoded frames to an unchanged
baseline, assert frozen input identity/dimensions, observe changed editor revision
and preview, then export the changed project as a negative control. Do not claim
React unmount proof from removing a DOM node.

A synthetic event fixture exercises the executor's nonzero clip start and
source/output FPS conversion with visible events and identifiable audio bursts
near beginning, middle and end. Decode actual outputs and require absolute A/V
error <= 16.667 ms. Shifted-origin and late-only-shift controls must fail. Retain
presentation start/end and untrimmed decoder observations. Use the RH-02-qualified
independent browser decoder for Opus, not FFmpeg's defective one-packet observer.

Bind Git/diff, bundle/resource, request, browser/GPU/DPR, codec and observer
identities. Record cancellation/resource cleanup and producer backpressure at the
existing boundaries. Evidence lanes are project semantics, temporal runtime,
visual composition, lifecycle and architecture. Integration is the required
closure gate, with checkpoint validation before the coherent commit. Headless
software GPU results are functional evidence only. Performance certification
requires an adequate quiet environment; artistic quality remains independent
visual and audible review, outside these numeric parity claims.

The real 44.1 kHz executor fixture exposed native Opus resampler tail loss:
150 packets covering 3.000 coded seconds minus 312 samples of pre-skip cover
only 2.9935 presentation seconds. Preserve that failed observation. The encoder
now explicitly converts the requested interval through Web Audio to Opus's
48 kHz domain; canonical feature-bake PCM remains unchanged. Exact decoded
sample count, stereo identity, nonzero source origin, unaligned conversion,
source-tail silence and cancellation reject a relabeled or truncated pass.
48 kHz inputs bypass conversion. Record the additional clip-sized PCM allocation;
Web Audio has no immediate cancel operation for an already started offline render.
A held completion must not create an encoder/output after cancellation.

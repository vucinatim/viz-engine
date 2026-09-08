# RH-03 independent rendering and media integration

This closes RH-03 only with its exact passing integration record and immutable
browser artifact manifest in the canonical completion record. It does not close
Goal Five's creative or hardware performance criteria.

## Identity and ownership

Program `goal-five-render-foundation`, definition
`7d14857310526ac660976fc1a6b5064a5de4fac4bdc02c93bc712e7abf03108a`.
Claim `1632735b-7331-4d82-93ec-f39667d9b6b9`, lease
`43b71fa9-e79d-401e-8c97-74ead0a05f52`, owner
`codex/night/2026-09-08T0102`, starting commit
`477b8262ae314a22a40a3fea8a473a67001678bf`.
The completion record binds the terminal commit and the frozen-diff checks.

The shared Three host owns rendering, resource readiness and active model/image
failure interpretation. Editor attachments expose readiness for their submitted
frame. Replacement, resize, rendering or disposal rejects obsolete waits;
unregister/re-register of the same attachment also invalidates them. Export no
longer duplicates model failure policy. A single abortable-wait utility belongs
to the browser application boundary. No editor store or DOM canvas supplies
export pixels.

The encoder additionally owns conversion of non-48-kHz PCM into Opus's 48 kHz
coded domain. It converts only the requested source interval through Web Audio,
keeps canonical decoded/feature-bake PCM unchanged, reports the extra clip-sized
PCM allocation and releases its references during disposal. Already-48-kHz PCM
bypasses conversion. AAC keeps its original source rate and authentic timing. The canonical browser
executor identity advances to `viz-render.browser-webgl.v4` for this changed
encoding contract.

## Observations and controls

The scoped browser suite comprises `render-host.spec.ts`,
`render-integration.spec.ts`, `render-av-integration.spec.ts` and
`streaming-export.spec.ts`. The final frozen report is
`.artifacts/autonomy/rh03-browser-final.json`; attached images, real media,
decoder observations, requests and resource identities are archived through the
completion manifest. The exact browser, platform, GPU, Git/diff and source
identities accompany those observations.

- Real Studio bundle loading, mounted preview and render job service compare
  Signal Cathedral and Afterlight Assembly at frames 0, 210 and return-to-0,
  using the same baked audio and actual 874x462 drawing buffer. The declared
  acceptance is normalized MAE <= 0.006 and global RGB SSIM >= 0.995. Afterlight matches
  exactly; Signal Cathedral's measured nonzero-frame MAE is about 0.00056 and
  SSIM about 0.99993. Full RGB, nonblank intensity, enabled components, active
  resource counts and preview/export/difference PNGs reject matching empty
  outputs. Direct inspection confirms the stage/crowd and tunnel compositions.
- A production MP4 clip is decoded independently by FFmpeg. During its second
  export, a real service progress event changes every layer's opacity, seeks
  editor transport to frame 321 and halves preview resolution. Its decoded
  frames remain byte-identical to baseline at requested 320x180. A new export
  has a different input identity and visibly different decoded pixels. Editor
  revision, transport and resolution observations confirm the mutations occurred.
- Real native H.264/AAC and VP9/Opus encode an executor fixture starting at
  source frame 60, converting source 60 FPS to output 30 FPS for 90 frames.
  Independently decoded video flashes and nonperiodic audio bursts at 0.1, 1.5
  and 2.8 seconds correlate at zero lag, within the declared 16.667 ms bound.
  WebM decodes to exactly 144,000 samples at 48 kHz. AAC decodes to 132,300
  samples at 44.1 kHz in the browser. Retain both native sample counts and the
  common-rate correlation observation. Moving decoded PCM samples globally and
  only before the last event produces independently observed 33.333 ms errors;
  the same correlator and acceptance reject both controls.
- Hold the first completed native video handoff across browser animation frames:
  the executor produces exactly one captured frame until release. Both final
  clips remain independently decodable. This rejects eager frame production;
  foundation tests separately hold positional storage IO and verify cleanup,
  quota errors and streaming hash order.
- A real held image prevents shared-host readiness; releasing it produces red
  pixels, while a failed network request rejects explicitly. A held program
  promise rejects promptly on update, resize or disposal and never resubscribes
  across subsequent updates. Attachment tests cover missing, failed, replaced,
  unmounted and same-object re-registered owners.
- Existing DPR-2 fine-detail output checks reject preview upscaling. All five
  streaming regressions are rerun: alpha/contact sheets, exact tiny and
  unaligned audio presentation, corrupted container controls, native cancel,
  held/faulted codec workers, and cleanup. The RH-02-qualified browser Opus
  decoder is retained; its known FFmpeg one-packet observer defects are not
  silently reused as a valid sample-count oracle.
- Stereo clip conversion produces exactly 400 samples for an unaligned interval,
  preserves channel identity and source PCM, and pads source-exhausted tails
  with silence. A held conversion completion rejects cancellation before any
  encoder/output exists; releasing it cannot create a late export.

## Failures, review and scope limits

The real 44.1-kHz source fixture exposed native Opus conversion producing only
150 packets of 960 coded samples for a three-second request. After 312 samples
of pre-skip, coverage was short by 6.5 ms. The strict muxer check rejected it.
The native packet trace is retained; explicit conversion fixes the input
boundary without changing priming metadata, guessing padding or relaxing
coverage. An initial readiness observation collided with the editor's legitimate
resource-triggered render; the fixture now observes completion of the mounted
resource-loading cycle before submitting its exact comparison frame. Replaced
frames still reject; there is no swallowed resource failure or selective retry.

The canonicalizer found an ABA readiness gap and a surviving retry loop; both
were removed and covered. It found no remaining coordinate or ownership blocker
in the codec conversion. The sensory auditor required independent decoded
counts and all three A/V events, preservation of canonical PCM, and explicit
conversion memory/cancellation limits. Checker review is required before closure.
The first checkpoint gate failed at the unchanged five-second review-packet
unit deadline. Historical terminal validation started separate Git processes per
changed file, making the now-larger completed render checkpoint expensive to
revalidate. The canonical evidence validator now resolves terminal tree entries
once and batches exact blob reads in bounded groups. Binary payloads, duplicate
blob IDs, newline paths, byte-hash mismatches and deleted-file replacement by a
directory are covered; no timeout, evidence identity or acceptance is weakened.
The failed checkpoint record remains `.artifacts/autonomy/checks/2026-09-08T01-18-27.122Z-checkpoint.json`.

All final checks run against one staged, unchanged diff: checkpoint for the
coherent commit, then integration for cross-package closure. These gates are
not relabeled as full product certification.

Headless muted Chromium with software rendering provides functional evidence;
it does not certify GPU throughput, real-time frame pacing, long-duration
endurance or artistic/audio quality. Stage timings are diagnostic, not performance
claims. Web Audio cannot immediately cancel an already running offline render:
the caller stops and no late encoder/output appears, while native conversion may
finish internally. Canonical PCM and one additional converted clip remain
source/clip-sized allocations. Successful artifact retention, large-duration
metadata policy, codec patch maintenance and future worker conversion remain
explicit entries in `docs/suggestions.md`. WebGPU/TSL and conditional WASM/native
migration remain the capability- and parity-gated roadmap in the rendering
strategy; they are not claimed implemented by this checkpoint.

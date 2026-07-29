# Suggestions

This file tracks durable, high-impact follow-up improvements for VizEngine V2.

## Active Architectural Suggestions

- Continue stable render-node reconciliation beyond the retained shader,
  Three-program, and polyline paths. Frequently changing text and mixed
  primitive groups can still recreate textures or geometry, which would
  undermine required responsiveness even when plans are deterministic.
- Continue the classified adapter burn-down from
  `phase-13-viz-session-runtime-preview-ownership.md`: replace each historical
  component render path with a package-runtime implementation, then delete the
  per-component runtime preview bridge when it has no consumers.
- Keep `VizSession` one canonical engine while splitting its large internal
  implementation into focused reducers, selectors, history, persistence, and
  host-attachment modules. Internal modularity must not recreate multiple
  sources of truth.
- Add a repeatable browser parity smoke for sample loading, the animation/node
  surface, Rhythm Lab, and playback. The 2026-07-29 manual calibration found
  three product-blocking regressions that type checks, builds, and lower-level
  tests did not detect.
- Finish moving component render meaning out of browser/editor adapters now
  that canonical document, runtime inspection, and browser attachment ownership
  are separated.
- Move the preserved editor node projection onto the package execution registry
  instead of letting node execution remain editor-owned. This is now required
  not only for bridge deletion but for full historical sampling of
  node-driven temporal visuals such as Heartbeat Monitor and event-driven
  visuals such as Light Tunnel.
- Restore the preserved editor debug toggle through explicit renderer-owned
  diagnostic overlays (grid, axes, light helpers, and program inspection)
  rather than putting debug state back into deterministic component semantics.
- Define a render compatibility classification for components and nodes:
  `render-safe`, `bake-required`, `live-only`.
- Introduce first-class baking contracts for audio features, simulation caches,
  and checkpoints instead of ad hoc offline helpers.
- Design a stable AI action surface early so the engine does not become
  UI-driven by accident.
- Keep Remotion behind a renderer adapter boundary and avoid letting Remotion
  semantics leak into the source-of-truth scene model.
- Move toward a package structure that cleanly separates contracts, runtime,
  bake, editor, and render adapters.
- Plan the V1 purge deliberately so the rewrite does not stall in an indefinite
  half-migrated state with duplicate folders and dead runtime paths.
- Split renderer preview-time asset hydration from future server/render-time
  asset materialization behind a cleaner shared material resolver once the
  first asset-backed proof is stable.
- Replace preserved-editor `FileInput` values that still persist browser-local
  `idb:` URIs with canonical asset references and host materialization. Morph
  Shapes now proves the package renderer can consume materialized binary
  assets, but the preserved browse control is not portable until this editor
  attachment seam is completed.
- Continue from the current inherited-style cleanup toward a pass-based
  compositor model in the `Three` path so preview and final-render semantics
  can eventually align for opacity, blend isolation, and later masks/effects.
- Keep the studio shell intentionally chunked as the runtime and renderer
  packages grow, so future preview/editor capability does not drift back into a
  single eager bundle after the first WebGL split.
- Keep the new golden-fixture workflow deliberate and reviewable as runtime
  behavior expands, so new snapshots stay small, canonical, and tied to
  meaningful engine semantics instead of becoming a dumping ground for noise.
- Keep host integrations consuming the portable runtime contract instead of
  growing app-specific adapter packages inside the Viz core workspace unless a
  truly reusable host boundary emerges.
- Extend the new pure-node graph slice into explicit temporal-node execution
  only after checkpointing, state ownership, and render-mode stepping rules are
  nailed down, so graph state does not leak back into editor-owned behavior.
- Keep the new temporal replay/checkpoint baseline simple until durable
  bake-time checkpoints land: fixed-step replay plus explicit runtime-session
  checkpoints first, then deliberate artifact-backed history optimizations,
  rather than random-access shortcuts that obscure scene semantics.
- Move bounded event-heavy program state such as Neural Network signal waves
  onto explicit bake/checkpoint artifacts when production scenes need dense
  long-lived triggering. The retained live program deliberately caps visible
  signal instances instead of recreating V1's unbounded mesh allocation.
- Define the production Stage character contract as canonical materialized
  character assets plus deterministic/bakeable animation sampling. The runtime
  Stage deliberately uses retained procedural actors instead of restoring
  roughly 27 MB of editor-bundled FBX URLs and browser-`dt` mixers, but exact
  historical character appearance remains unapproved visual-parity work.
- Move the preserved editor node-kernel catalog from app terrain into
  `@viz-engine/nodes-core` once this rendering cutover is certified. The
  current registry boundary removes duplicate evaluation and is canonical at
  runtime, but package ownership would let editor UI, CLI, agents, and renders
  consume one portable built-in node catalog.
- Extend the new raw-recorder comparison CLI into a headless fixed-device
  browser recording command so V1/V2 frame pacing, interaction latency, memory,
  and long-session stability can be captured without temporary profiler UI
  changes or manual hover behavior.
- Add a small repeatable browser video-export certification fixture that
  validates the downloaded container with media metadata and frame/audio probes,
  so MP4/WebM duration, dimensions, FPS, codecs, and synchronization stop
  depending on manual inspection.
- Keep the new project action surface pure and shared across editor, CLI, and
  future agent tooling so undo/history, collaboration, and AI mutation do not
  fork into app-specific mutation paths.
- Grow the current directory-backed bundle writer into a fuller import/export
  product surface deliberately, with archive packaging and explicit export
  policies for non-trivial media/artifact payloads, instead of letting ad hoc
  one-off export paths emerge per host or app shell.
- Extend the new isolated-layer `Three` compositor into a fuller pass/effect
  graph deliberately, but keep layer ownership explicit so masks, blur, bloom,
  and later post-processing do not get reimplemented as primitive-level hacks.
- Keep the future agent-operated editor loop centered on the same action and
  runtime surfaces as the CLI and tests, so “open the editor and build it live”
  does not drift into a browser-only control architecture with hidden state.
- Preserve the V1 editor UX as a first-class product reference while replacing
  the architecture underneath it, so V2 does not accidentally regress from a
  serious creative tool into a lower-ambition dev shell or inspector product.
- Build the next editor rebuild seam as a generic live transport and
  audio-session foundation on top of `@viz-engine/editor-session`, not inside a
  shell-specific app store, so play/pause/seek, live-vs-baked diagnostics, and
  audio-session lifecycle can later plug under the preserved V1 editor UX
  cleanly.
- When wiring the new transport/audio controllers under the preserved V1 editor
  shell, keep browser media element ownership outside the pure session package
  and feed only explicit state transitions inward, so browser quirks do not
  leak back into canonical editor/runtime semantics.
- Keep the new `@viz-engine/editor-control` surface intentionally small and
  stable, and only add operations that correspond to durable runtime/editor
  concepts, so the future MCP/tool layer grows around real semantics instead of
  becoming a bag of one-off convenience commands.
- The next component-authoring follow-up should be a true live pick-up loop for
  new or changed V2 components under the preserved editor UX, not just more
  scaffold helpers, so the agent can actually write a component and let the
  user see it update with minimal friction.
- Keep the new `@viz-engine/editor-control` browser-vs-Node split strict as the
  editor grows, so bundle/filesystem concerns do not leak back into browser
  builds and the operator surface stays safe to mount under the real editor.
- The next editor-facing follow-up should harden repeated browser-verified
  play/pause/seek behavior under the V2-backed Next shell, so the live loop is
  proven in the actual product terrain and not only through deterministic
  package/runtime tests.
- As more of the preserved V1 editor surface is rebuilt over V2, track and
  deliberately burn down the remaining legacy Next/ESLint warnings in old V1
  files so the final editor terrain does not carry avoidable noise forward.
- Keep browser-facing transport controls in the preserved V2 editor shell
  mechanically simple and explicitly controlled; avoid over-clever control
  primitives on the critical live-loop path when a plain button conveys the
  state more truthfully for both humans and agents.
- The next live-loop follow-up should connect the local operator surface and the
  open browser/editor session more directly, so browser verification can observe
  canonical state transitions without relying on fragile UI event synthesis
  alone.
- Build the next layer-creation/editor-authoring step on top of the new
  component-catalog truth, so new layer flows stay registry-driven instead of
  hardcoding component knowledge into the UI.
- Now that layer truth has an app-local canonical working project, the next
  cleanup should be to teach layer history to snapshot and restore that
  canonical project directly, so `history-store` no longer needs the temporary
  legacy-store reimport bridge after undo/redo.
- Now that preview transport truth has been split out of `editor-store`, the
  next cleanup should move browser-media attachment details and audio-session
  lifecycle behind an equally explicit audio-session owner, so preview
  transport stays canonical without inheriting audio-element quirks directly.
- Now that the audio session has been split from browser audio attachments, the
  next cleanup should remove the remaining direct media-element time writes and
  analyzer assumptions from waveform/export/legacy consumers so the graph and
  renderer paths stop reaching around the canonical audio-session seam.
- Now that graph truth and execution live in `editor-graph-store`, the next
  cleanup should shrink `node-network-store` further until it holds only
  explicit node-editor UI session state and no convenience graph ownership
  logic.
- Now that layer history snapshots canonical working-project truth directly,
  the next cleanup should apply the same ruthless standard to remaining
  history/context seams so no undo/redo path still depends on legacy store
  reconstruction as hidden truth.
## Next Cleanup Candidates

- keep burning down editor-era convenience accessors that still encourage
  treating adapter stores as canonical truth
- make persistence/bootstrap stop depending on legacy-shaped projected store
  hydration as the long-term source for editor startup
- reduce remaining history/control duplication so undo/redo, editor driving,
  and future agent tools converge on one cleaner control plane
- now that the editor has one explicit local control plane, the next cleanup
  should be to push more browser/runtime attachment internals behind that same
  seam where it stays simple, so only truly low-level attachment code still
  talks store-to-store directly
- now that browser render attachment setup is behind
  `editor-runtime-preview-attachment`, the next rendering step should be to
  keep porting preserved-editor visuals into package-runtime components and
  expand the runtime bridge layer-by-layer, instead of growing a second
  long-lived render architecture inside `src/components/editor`
- now that the mixed-import and chunking warnings are gone, keep the Vite build
  posture intentionally simple: explicit vendor splits plus lazy boundaries for
  hidden heavy surfaces, not a sprawling manual chunk map that becomes its own
  maintenance problem

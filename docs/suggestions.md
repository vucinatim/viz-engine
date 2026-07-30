# Suggestions

This file tracks durable, high-impact follow-up improvements for VizEngine V2.

## Active Architectural Suggestions

- Extend the authoritative decoder posture now proven for project
  transactions, live control, and audio-bake jobs to render and feedback job
  requests. Transport adapters must never cast arbitrary JSON into trusted
  typed operations.
- Add a minimal execution manifest that locks capability, component, node,
  renderer, bake, asset, and artifact identities required to reproduce output.
- Preserve the full analyzer-compatible standard audio artifact for semantic
  parity, but investigate an explicit compressed/binary container when real
  production bundles prove JSON/base64 storage too costly. Do not silently
  reduce bin/sample resolution as a storage optimization.
- Move cooperative browser audio analysis into a worker attachment when
  production-length measurements show main-thread contention. The current
  yielding implementation protects responsiveness, but it does not provide CPU
  isolation.
- Wrap the proven browser capture and FFmpeg implementation behind a shared
  render-job contract, then add repeatable still, contact-sheet, short-clip,
  media-probe, blank-frame, frozen-frame, and performance feedback tools.
- Continue stable render-node reconciliation beyond the retained shader,
  Three-program, and polyline paths. Frequently changing text and mixed
  primitive groups can still recreate textures or geometry, which would
  undermine required responsiveness even when plans are deterministic.
- Keep `VizSession` one canonical engine while splitting its large internal
  implementation into focused reducers, selectors, history, persistence, and
  host-attachment modules. Internal modularity must not recreate multiple
  sources of truth.
- Turn the now-repeatable browser parity procedure for layer creation,
  animation/node graphs, live values, undo/redo, persistence, playback, and
  export configuration into a checked automation. The convergence audit found
  a React Flow measurement regression that lower-level tests could not detect.
- Finish moving component render meaning out of browser/editor adapters now
  that canonical document, runtime inspection, and browser attachment ownership
  are separated.
- Restore the preserved editor debug toggle through explicit renderer-owned
  diagnostic overlays (grid, axes, light helpers, and program inspection)
  rather than putting debug state back into deterministic component semantics.
- Define a render compatibility classification for components and nodes:
  `render-safe`, `bake-required`, `live-only`.
- Introduce first-class baking contracts for audio features, simulation caches,
  and checkpoints instead of ad hoc offline helpers.
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
- Continue the accepted native 3D roadmap after the now-complete Stage slice:
  compare prepared GLB derivatives against the content-pinned FBX reference,
  then expose the proven substrate through the generic `Model3D` product
  surface with hierarchy, clip, material, and morph inspection. Do not pull
  character, facial, or retargeting semantics into that generic component.
- Add an offline model-preparation command that produces content-pinned GLB
  derivatives with supported material maps and four-weight skinning. The
  retained FBX path is functional, but repeated loader warnings should become
  preparation-time diagnostics instead of runtime console noise.
- Extend the new raw-recorder comparison CLI into a headless fixed-device
  browser recording command so V1/V2 frame pacing, interaction latency, memory,
  and long-session stability can be captured without temporary profiler UI
  changes or manual hover behavior.
- Automate the now-proven browser video-export certification workflow: run the
  small runtime fixture, probe the downloaded container, sample multiple frames,
  and assert non-black/non-identical output so future MP4/WebM coverage no
  longer needs manual orchestration.
- Treat the bundled FFmpeg core as a large lazy production asset: serve its
  roughly 32 MB WASM payload with immutable caching and compression where the
  deployment platform supports it, and keep it outside initial studio startup.
- Extend the three-minute playback soak into a scripted edit-churn scenario
  covering layer add/remove, graph edits, panel toggles, track changes, and
  repeated exports before promoting long-session stability to `verified`.
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
- Preserve the V1 editor UX as a first-class product reference while replacing
  the architecture underneath it, so V2 does not accidentally regress from a
  serious creative tool into a lower-ambition dev shell or inspector product.
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
  play/pause/seek behavior under the V2-backed Vite shell, so the live loop is
  proven in the actual product terrain and not only through deterministic
  package/runtime tests.
- As more of the preserved V1 editor surface is rebuilt over V2, track and
  deliberately burn down the remaining legacy Next/ESLint warnings in old V1
  files so the final editor terrain does not carry avoidable noise forward.
- Keep browser-facing transport controls in the preserved V2 editor shell
  mechanically simple and explicitly controlled; avoid over-clever control
  primitives on the critical live-loop path when a plain button conveys the
  state more truthfully for both humans and agents.

## Next Cleanup Candidates

- repair the repository Prettier configuration, which still imports the deleted
  Tailwind v3 `tailwind.config.ts`; formatting currently needs an explicit
  config override even though the active studio uses Tailwind v4
- keep burning down editor-era convenience accessors that still encourage
  treating adapter stores as canonical truth
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

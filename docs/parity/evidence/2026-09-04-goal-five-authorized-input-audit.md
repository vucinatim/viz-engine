# Goal Five Authorized Production Input Audit

Status: complete for `P1-01` at pinned input revision
`9fdc0712c0e1e67ef7ebbaf5ed4e1c192e005a9c`.

## Claim

Every repository-contained production input relevant to Goal Five has an exact
content identity, availability result, provenance boundary, intended usage
boundary, and honest authority classification. Repository presence is not
treated as permission to use product UI media, prior render outputs, evidence,
or test fixtures as new creative content.

The canonical machine record is the
[authorized-input inventory](./artifacts/2026-09-04-goal-five-authorized-input-inventory.json).
`pnpm goal5:inputs:validate` reconstructs it from the pinned Git tree, validates
the two production bundle manifests and their declared identities, and rejects
drift in the committed record. It deliberately audits a Git revision rather
than mutable filesystem discovery so this checkpoint remains reproducible.

## Authority And Provenance Boundary

Gate 0 authorized existing repository music, models, animations, and media for
the local flagship proof with recorded provenance. It did not authorize an
external download, purchase, generation service, public release, or a claim
about redistribution rights.

The repository contains no license file and no per-source audio or model
license record. Git history proves when and by whom bytes entered this
repository; it does not prove their upstream authorship or license:

- thirteen non-test music tracks entered at
  `4fa826f17b0cd42c67737a66029c93bbcd7c70a3` (`new music`)
- `Outsiders (feat. Charlotte Haining).mp3` entered at
  `67bcd0fa931dada89fd662744fc8cdc914f4dd31` (`additional polish`)
- the female DJ, female dancer, and male dancer were introduced under their
  original playground paths at
  `6e5abb59f6148514630d06065e3151ded4cd4b55`; only the female DJ's current
  bytes already existed there
- the current female-dancer and male-dancer bytes, and the male cheer model,
  first existed together at
  `edc2cf94da90fbb60858e604c3295dbb89075bfb`
- all four unchanged byte identities moved to their canonical V2 Stage paths at
  `9906bc4e84126d370b26fcd3aa244c4b49f90edd`

All source audio and model entries therefore carry
`unverified-no-repository-record`. They remain usable for this authorized local
proof, but publication or redistribution is a separate human decision.

## Inventory Result

The pinned scan classifies 82 relevant or plausibly confusable repository
entries:

| Usage boundary       | Count | Meaning                                                         |
| -------------------- | ----: | --------------------------------------------------------------- |
| candidate            |    18 | 14 source-music tracks and four source Stage models             |
| candidate capability |    10 | Code-defined shader/render sources for detailed P1-02 audit     |
| reference-derived    |     6 | Two derived 12-second audio windows and four exact model copies |
| reference-only       |    17 | Prior production packs, bakes, outputs, and example projects    |
| technical-only       |     3 | Pitch, heartbeat, and sine-sweep audio fixtures                 |
| not production input |    28 | Product media, evidence media, and test fixtures                |

The distinction is load-bearing: prior outputs and fixtures cannot be counted
as new production breadth, while source models are counted once despite their
portable bundle copies.

## Music Sources

All 14 non-test source tracks are present, content-addressed, stereo MP3s, and
long enough to contain a 45–60 second candidate window. The durations below
were observed with FFprobe 7.1.1; `P1-03` owns deterministic musical analysis,
window comparison, and final recommendation.

| Source                              |  Duration | Sample rate |
| ----------------------------------- | --------: | ----------: |
| Outsiders (feat. Charlotte Haining) | 278.727 s |    44.1 kHz |
| Acoustic — Guitar + Vocal           | 147.432 s |      48 kHz |
| Bass — Future Bass                  | 159.192 s |      48 kHz |
| Breakbeat — Funky Breakbeat         | 225.312 s |      48 kHz |
| DnB — Dancefloor DnB                | 175.824 s |      48 kHz |
| DnB — Electric DnB                  | 270.000 s |      48 kHz |
| DnB — Rap DnB                       | 202.560 s |      48 kHz |
| HipHop — 808 Rap                    | 144.984 s |      48 kHz |
| HipHop — LoFi HipHop                | 106.992 s |      48 kHz |
| House — Progressive House           | 138.792 s |      48 kHz |
| Jazz — Jazz Fusion                  | 198.000 s |      48 kHz |
| Rock — Electronic Rock              | 212.184 s |      48 kHz |
| Rock — Indie Rock                   | 154.872 s |      48 kHz |
| Synthwave — Retro Synthwave         |  99.960 s |      48 kHz |

The three `[Test]` files are available but intentionally ineligible as flagship
music: they are technical signals lasting 8.020, 7.992, and 35.808 seconds.
Signal Cathedral's Progressive House and Afterlight Assembly's Dancefloor DnB
files are explicit 12-second FFmpeg derivatives. Their manifests preserve
source paths and windows, so they are reusable evidence and comparison inputs,
not independent music candidates.

## Models, Embedded Animation, And Textures

The four canonical Stage sources are available under `public/models/stage` and
retain their stable V2 asset identities:

| Role          | Asset ID                          | Content identity           |         Size |
| ------------- | --------------------------------- | -------------------------- | -----------: |
| female DJ     | `viz-builtin-stage-female-dj`     | `sha256:87c7b85a…9cd9c16`  | 22,091,584 B |
| female dancer | `viz-builtin-stage-female-dancer` | `sha256:fd684785…c9396479` |  3,143,948 B |
| male dancer   | `viz-builtin-stage-male-dancer`   | `sha256:c9cf2a02…eb43582`  |  2,611,308 B |
| male cheer    | `viz-builtin-stage-male-cheer`    | `sha256:354aab94…ee3959b`  |  1,189,100 B |

Each FBX contains model, embedded texture, rig, and authored-animation content.
Afterlight Assembly's four bundle files are byte-identical copies, producing
exactly four duplicate groups rather than four additional creative assets.

Existing browser certification proves that all four load and animate through
the renderer-owned model resource path. `male-cheer.fbx` references one missing
external normal map; the mesh, rig, clip, and base material remain usable and
the dependency is an explicit non-fatal warning. No source has a prepared GLB
derivative or committed capability manifest, so any preparation remains a
future explicit derivation rather than an assumed input.

## Shaders, Images, Video, And Production Packs

There is no standalone shader asset. Ten repository source files contain the
code-defined shader and compositor implementations available to the flagship;
the machine inventory pins each file by content. Their concrete component,
parameter, renderer, and authoring capabilities belong to `P1-02`, so this audit
does not misclassify implementation files as portable assets.

There is also no standalone image, video, or texture source authorized as new
flagship creative content. The repository images and videos in scope are:

- product branding, tutorial media, and the historical product demo
- parity and certification evidence
- prior Signal Cathedral and Afterlight Assembly render outputs
- automated-test fixtures

They remain reference-only or non-input. A complementary 2D/image/video role
must therefore use an existing code-defined capability, receive an explicit
Gate 1 exclusion, or wait for separately authorized source content. It must not
silently reuse a screenshot or prior final render.

Both prior production packs are complete at the pinned revision:

- Signal Cathedral declares one derived audio asset and one baked artifact.
- Afterlight Assembly declares one derived audio asset, four model copies, and
  one baked artifact.
- every declared asset, artifact, project, and execution manifest exists
- every declared content identity matches its file
- no production-bundle availability issue was found

The packs are architectural and aesthetic reference material. Goal Five must
remain a distinct multi-act work rather than extending either 12-second scene.

## Materialization And Risk Decisions

1. `P1-03` must analyze the 14 source tracks and derive only the selected exact
   window after Gate 1 direction is prepared.
2. Stage model source identities are canonical; portable bundle copies are
   outputs of materialization, not alternate source ownership.
3. Model preparation, if justified later, must produce a content-pinned derived
   managed asset with provenance. No hidden cache or manual overwrite is valid.
4. Prior baked audio artifacts remain bound to their 12-second source windows
   and cannot stand in for the future flagship analysis.
5. The missing complementary-media source and unproven redistribution rights
   are explicit constraints, not reasons to acquire external assets
   autonomously.

## Validation And False-Pass Rejection

The audit rejects the plausible false passes that a directory listing would
permit:

- exact hashes collapse the four copied models into four identities
- path classification prevents fixtures, screenshots, branding, and prior
  outputs from being counted as creative inputs
- bundle traversal rejects missing declared files and identity mismatches
- the pinned revision prevents later working-tree state from rewriting history
- explicit license status prevents repository presence from implying rights
- known dependency and prepared-derivative gaps remain visible

Validated commands:

```text
pnpm goal5:inputs:update
pnpm goal5:inputs:validate
pnpm goal5:criteria:validate
ffprobe 7.1.1 over all 17 source and two derived MP3 files
```

No external file was downloaded, purchased, generated through a service, or
added to the authorized set during this checkpoint.

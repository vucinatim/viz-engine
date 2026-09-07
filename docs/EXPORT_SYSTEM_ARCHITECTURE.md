# Export architecture

The current authority is the [rendering, performance, and deployment strategy](./visions/rendering-performance-and-deployment-strategy.md).

Browser export uses a frozen render source, the canonical runtime evaluator and
an independent Three render host at requested dimensions. Preview uses the same
GPU implementation. Editor DOM capture and CSS canvas recomposition are removed.
The job service owns cancellation and result identity; the capture session owns
its canvas, runtime history, and resources. Studio supplies capability registries
and source resources, and its transport does not drive export.

RH-01 retains the existing FFmpeg.wasm video encoder as its working consumer.
RH-02 replaces that sequence-buffering implementation with a streaming handoff;
RH-03 validates decoded media, lifecycle and performance under exact conditions.
Those pending capabilities are not represented as implemented or certified.

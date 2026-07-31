import type { VizEditorTransportState } from '@viz-engine/editor-session';

type TransportPresentationListener = (
  transport: Readonly<VizEditorTransportState>,
) => void;

let transport: VizEditorTransportState = {
  fps: 60,
  durationFrames: 1,
  currentFrame: 0,
  isPlaying: false,
  loop: false,
  mode: 'live',
};
const listeners = new Set<TransportPresentationListener>();

export const transportPresentationClock = {
  getSnapshot: () => transport,
  publish(nextTransport: VizEditorTransportState) {
    transport = nextTransport;
    listeners.forEach((listener) => listener(transport));
  },
  subscribe(listener: TransportPresentationListener) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};

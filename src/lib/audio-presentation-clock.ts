export interface AudioPresentationTime {
  currentTime: number;
  visualTime: number;
}

type AudioPresentationListener = (
  time: Readonly<AudioPresentationTime>,
) => void;

const initialTime: AudioPresentationTime = {
  currentTime: 0,
  visualTime: 0,
};

let time = initialTime;
const listeners = new Set<AudioPresentationListener>();

export const audioPresentationClock = {
  getSnapshot: () => time,
  getSubscriberCount: () => listeners.size,
  publish(nextTime: AudioPresentationTime) {
    time = nextTime;
    listeners.forEach((listener) => listener(time));
  },
  reset() {
    this.publish(initialTime);
  },
  subscribe(listener: AudioPresentationListener) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};

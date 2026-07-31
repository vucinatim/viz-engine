export interface RhythmSelectionWindow {
  start: number;
  end: number;
}

type RhythmSelectionListener = (
  selection: Readonly<RhythmSelectionWindow>,
) => void;

let selection: RhythmSelectionWindow = { start: 0, end: 0.2 };
const listeners = new Set<RhythmSelectionListener>();

export const rhythmSelectionPresentation = {
  getSnapshot: () => selection,
  getSubscriberCount: () => listeners.size,
  publish(nextSelection: RhythmSelectionWindow) {
    if (
      selection.start === nextSelection.start &&
      selection.end === nextSelection.end
    ) {
      return;
    }
    selection = nextSelection;
    listeners.forEach((listener) => listener(selection));
  },
  subscribe(listener: RhythmSelectionListener) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};

const listeners = new Set<() => void>();

export const invalidateEditorRuntimePreview = (): void => {
  for (const listener of listeners) {
    listener();
  }
};

export const getEditorRuntimePreviewInvalidationSubscriberCount = () =>
  listeners.size;

export const subscribeEditorRuntimePreviewInvalidation = (
  listener: () => void,
): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

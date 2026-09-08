/** Cancel a wait promptly; the operation's owner still owns resource disposal. */
export const awaitAbortable = <T>(
  operation: () => Promise<T>,
  signal: AbortSignal,
): Promise<T> => {
  signal.throwIfAborted();
  return new Promise<T>((resolve, reject) => {
    const abort = () => reject(signal.reason);
    signal.addEventListener('abort', abort, { once: true });
    void Promise.resolve()
      .then(() => {
        signal.throwIfAborted();
        return operation();
      })
      .then((value) => {
        signal.throwIfAborted();
        return value;
      })
      .then(resolve, reject)
      .finally(() => signal.removeEventListener('abort', abort));
  });
};

const AUDIO_PROBE_TIMEOUT_MS = 10_000;

export const probeAudioUrl = (url: string): Promise<void> => {
  if (typeof Audio === 'undefined') return Promise.resolve();

  return new Promise((resolve, reject) => {
    const audio = new Audio();
    let settled = false;
    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      globalThis.clearTimeout(timeout);
      audio.removeEventListener('loadedmetadata', handleLoaded);
      audio.removeEventListener('error', handleError);
      audio.removeAttribute('src');
      audio.load();
      if (error) reject(error);
      else resolve();
    };
    const handleLoaded = () => finish();
    const handleError = () =>
      finish(new Error('This audio file could not be decoded by the browser.'));
    const timeout = globalThis.setTimeout(
      () => finish(new Error('The audio file took too long to load.')),
      AUDIO_PROBE_TIMEOUT_MS,
    );

    audio.preload = 'metadata';
    audio.addEventListener('loadedmetadata', handleLoaded, { once: true });
    audio.addEventListener('error', handleError, { once: true });
    audio.src = url;
    audio.load();
  });
};

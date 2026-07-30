export function calculateAudioLevel(dataArray: Uint8Array) {
  const sum = dataArray.reduce((acc, val) => acc + val, 0);
  return sum / dataArray.length;
}

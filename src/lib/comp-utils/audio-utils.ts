export function calculateAudioLevel(dataArray: Uint8Array) {
  let sum = dataArray.reduce((acc, val) => acc + val, 0);
  return sum / dataArray.length;
}

export const generateLayerId = (compName: string) =>
  `layer-${compName}-${new Date().getTime()}`;

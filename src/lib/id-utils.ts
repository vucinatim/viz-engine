export const generateLayerId = (compName: string) =>
  `layer-${compName}-${new Date().getTime()}`;

export interface ParameterInfo {
  layerId: string;
  componentName: string;
  parameterName: string;
  isEnabled?: boolean;
}

export const destructureParameterId = (parameterId: string): ParameterInfo => {
  // Format: "layer-ComponentName-timestamp:parameterName"
  const parts = parameterId.split(':');

  if (parts.length >= 2) {
    const layerPart = parts[0];
    const paramPart = parts[1];

    // Extract component name from layer ID (format: "layer-ComponentName-timestamp")
    const layerMatch = layerPart.match(/layer-([^-]+)-/);
    const componentName = layerMatch ? layerMatch[1] : 'Unknown';

    return {
      layerId: layerPart,
      componentName,
      parameterName: paramPart,
    };
  }

  // Fallback for different network ID formats
  const networkIdParts = parameterId.split('-');
  if (networkIdParts.length >= 2) {
    const componentName = networkIdParts[1] || 'Unknown';
    const parameterName = networkIdParts.slice(2).join('-') || 'Unknown';

    return {
      layerId: parameterId,
      componentName,
      parameterName,
    };
  }

  return {
    layerId: parameterId,
    componentName: 'Unknown',
    parameterName: 'Unknown',
  };
};

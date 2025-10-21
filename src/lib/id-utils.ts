export const generateLayerId = (compName: string) =>
  `layer-${compName}-${new Date().getTime()}`;

export interface ParameterInfo {
  layerId: string;
  componentName: string;
  parameterName: string;
  /** The actual parameter name (last part of the path) */
  displayName: string;
  /** The group path formatted for display (e.g., "transform › rotation") */
  groupPath: string | null;
  /** Full parameter path joined with dots (for search) */
  fullPath: string;
  isEnabled?: boolean;
}

/**
 * Convert camelCase or PascalCase to Title Case with spaces
 * e.g., "triggerWave" -> "Trigger Wave", "SimpleCube" -> "Simple Cube"
 */
const toTitleCase = (str: string): string => {
  return str
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
};

export const destructureParameterId = (parameterId: string): ParameterInfo => {
  // Format: "layer-ComponentName-timestamp:group:subgroup:parameterName"
  const parts = parameterId.split(':');

  if (parts.length >= 2) {
    const layerPart = parts[0];
    const parameterPath = parts.slice(1); // All parts after the layer ID

    // Extract component name from layer ID (format: "layer-ComponentName-timestamp")
    const layerMatch = layerPart.match(/layer-([^-]+)-/);
    const componentName = layerMatch ? layerMatch[1] : 'Unknown';

    // Get the actual parameter name (last part) and format it
    const actualParamName =
      parameterPath[parameterPath.length - 1] || 'Unknown';
    const displayName = toTitleCase(actualParamName);

    // Build group path (all parts except the last one)
    const groupPath =
      parameterPath.length > 1
        ? parameterPath.slice(0, -1).map(toTitleCase).join(' › ')
        : null;

    // Full path for search (with dots)
    const fullPath = parameterPath.join('.');

    return {
      layerId: layerPart,
      componentName,
      parameterName: actualParamName, // Keep original for compatibility
      displayName,
      groupPath,
      fullPath,
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
      displayName: toTitleCase(parameterName),
      groupPath: null,
      fullPath: parameterName,
    };
  }

  return {
    layerId: parameterId,
    componentName: 'Unknown',
    parameterName: 'Unknown',
    displayName: 'Unknown',
    groupPath: null,
    fullPath: 'Unknown',
  };
};

interface ParamSchema {
  type: 'number' | 'string' | 'boolean' | 'color' | 'select';
  default: any;
  label: string;
  description: string;
  uiComponent: 'input' | 'slider' | 'switch' | 'colorPicker' | 'select';
  options?: any[]; // For select type
  validation?: {
    min?: number;
    max?: number;
    regex?: string; // For string validation
  };
  group?: string; // Optional grouping for UI
}

interface ConfigSchema {
  [key: string]: ParamSchema;
}
// @ts-ignore
v.group({
  label: 'Layer',
  description: 'Layer settings',
  params: [
    // @ts-ignore
    v.number({
      default: 1,
      label: 'Opacity',
      description: 'The opacity of the layer',
      uiComponent: 'slider',
      validation: {
        min: 0,
        max: 1,
      },
    }),
    // @ts-ignore
    v.color({
      default: '#000000',
      label: 'Background',
      description: 'The background color of the layer',
      uiComponent: 'colorPicker',
    }),
  ],
});

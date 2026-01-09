export type StageParamUiType = 'number' | 'boolean' | 'select';

export type OutputViewId =
  | 'Onset'
  | 'Grid'
  | 'Kick'
  | 'Snare'
  | 'Hat'
  | 'Custom';

export type StageStatus = 'active' | 'placeholder';

export interface StageParamUiDefinition {
  id: string;
  label: string;
  type: StageParamUiType;
  unit?: string;
  min?: number;
  max?: number;
  step?: number;
  options?: string[];
}

export interface PipelineStageDefinition {
  id: string;
  title: string;
  status: StageStatus;
  params: StageParamUiDefinition[];
}

export const OUTPUT_VIEW_OPTIONS: OutputViewId[] = [
  'Onset',
  'Grid',
  'Kick',
  'Snare',
  'Hat',
  'Custom',
];

export const PIPELINE_STAGES: PipelineStageDefinition[] = [
  {
    id: 'onset',
    title: 'Onset',
    status: 'active',
    params: [
      { id: 'hopLength', label: 'hop (samples)', type: 'number', unit: 'samples' },
      { id: 'nFft', label: 'n_fft (samples)', type: 'number', unit: 'samples' },
      { id: 'winLength', label: 'win (samples)', type: 'number', unit: 'samples' },
      {
        id: 'aggregate',
        label: 'aggregate',
        type: 'select',
        options: ['mean', 'median', 'max'],
      },
      { id: 'logCompression', label: 'log', type: 'boolean' },
    ],
  },
  {
    id: 'tempogram',
    title: 'Tempogram',
    status: 'placeholder',
    params: [],
  },
  {
    id: 'tempo',
    title: 'Tempo',
    status: 'placeholder',
    params: [],
  },
  {
    id: 'grid',
    title: 'Grid',
    status: 'placeholder',
    params: [],
  },
  {
    id: 'extraction',
    title: 'Extraction',
    status: 'placeholder',
    params: [],
  },
];

import {
  VIZ_PROJECT_SCHEMA_VERSION,
  type VizProjectDocument,
} from '@viz-engine/contracts';

const DEFAULT_PROJECT_ID = 'viz-local-project';
const DEFAULT_PROJECT_NAME = 'Untitled Viz Project';
const DEFAULT_VIEWPORT_WIDTH = 1920;
const DEFAULT_VIEWPORT_HEIGHT = 1080;
const DEFAULT_FPS = 60;
const DEFAULT_DURATION_FRAMES = 1;

export const createEmptyVizProjectDocument = (
  overrides: Partial<
    Pick<
      VizProjectDocument,
      'projectId' | 'name' | 'timeline' | 'viewport' | 'metadata'
    >
  > = {},
): VizProjectDocument => ({
  schemaVersion: VIZ_PROJECT_SCHEMA_VERSION,
  projectId: overrides.projectId ?? DEFAULT_PROJECT_ID,
  name: overrides.name ?? DEFAULT_PROJECT_NAME,
  timeline: overrides.timeline ?? {
    fps: DEFAULT_FPS,
    durationInFrames: DEFAULT_DURATION_FRAMES,
  },
  viewport: overrides.viewport ?? {
    width: DEFAULT_VIEWPORT_WIDTH,
    height: DEFAULT_VIEWPORT_HEIGHT,
    backgroundColor: '#000000',
  },
  layerOrder: [],
  layers: [],
  graphs: [],
  ...(overrides.metadata === undefined ? {} : { metadata: overrides.metadata }),
});

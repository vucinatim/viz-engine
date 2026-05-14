import bundledAudioFiles from 'virtual:bundled-audio-files';
import bundledSampleProjects from 'virtual:sample-projects';

export interface SampleProjectManifestEntry {
  name: string;
  filename: string;
  url: string;
}

export function getBundledAudioFiles() {
  return bundledAudioFiles;
}

export function getBundledSampleProjects() {
  return bundledSampleProjects;
}

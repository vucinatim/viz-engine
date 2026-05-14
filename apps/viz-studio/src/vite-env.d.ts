declare module 'virtual:bundled-audio-files' {
  const files: string[];
  export default files;
}

declare module 'virtual:sample-projects' {
  interface SampleProjectManifestEntry {
    name: string;
    filename: string;
    url: string;
  }

  const projects: SampleProjectManifestEntry[];
  export default projects;
}

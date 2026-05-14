import { V2EditorPageClient } from '@/components/editor/v2-editor-page-client';
import { getBundledAudioFiles } from '@/lib/server/bundled-audio';

export default function Home() {
  const bundledTracks = getBundledAudioFiles();

  return <V2EditorPageClient bundledTracks={bundledTracks} />;
}

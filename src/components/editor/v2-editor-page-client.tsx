'use client';

import useBodyProps from '@/lib/stores/body-props-store';

import { V2EditorShell } from '@/components/editor/v2-editor-shell';

export const V2EditorPageClient = ({
  bundledTracks,
}: {
  bundledTracks: string[];
}) => {
  const { props } = useBodyProps();

  return (
    <main className="relative h-screen w-screen" {...props}>
      <V2EditorShell bundledTracks={bundledTracks} />
    </main>
  );
};

import React from "react";

import { AmbientBackground } from "./ambient-background";
import { EditorLayout, EditorPanel } from "./editor-layout";
import { useStudioUiStore } from "./studio-ui-store";
import { V2AudioPanel } from "./v2-audio-panel";
import { V2EditorHeader } from "./v2-editor-header";
import { V2PreviewStage } from "./v2-preview-stage";
import { V2ScenePanel } from "./v2-scene-panel";
import { V2EditorProvider } from "./v2-editor-provider";

export const V2EditorShell = ({
  bundledTracks,
}: {
  bundledTracks: string[];
}) => {
  const ambientMode = useStudioUiStore((state) => state.ambientMode);

  return (
    <V2EditorProvider>
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-zinc-900">
          {ambientMode && <AmbientBackground />}
        </div>

        <div className="z-10 mx-3 -mb-1 mt-3 overflow-hidden rounded-md border border-gray-600/20 bg-zinc-800/70">
          <V2EditorHeader />
        </div>

        <EditorLayout
          leftChildren={
            <EditorPanel>
              <V2ScenePanel />
            </EditorPanel>
          }
          topRightChildren={
            <EditorPanel>
              <V2PreviewStage />
            </EditorPanel>
          }
          bottomRightChildren={
            <EditorPanel>
              <V2AudioPanel bundledTracks={bundledTracks} />
            </EditorPanel>
          }
        />
      </div>
    </V2EditorProvider>
  );
};

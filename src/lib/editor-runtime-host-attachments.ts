import {
  ButtonConfigOption,
  GroupConfigOption,
} from '@/components/config/config';
import type { LayerData } from '@/lib/editor-layer-types';
import type { EditorRuntimePreviewAttachment } from '@/lib/editor-runtime-preview-attachment';
import { toEditorComponentId } from '@/lib/viz-session/project-adapters';

export const installEditorRuntimeHostAttachments = ({
  layer,
  preview,
}: {
  layer: LayerData;
  preview: EditorRuntimePreviewAttachment;
}): (() => void) => {
  if (toEditorComponentId(layer.comp.name) !== 'stage-scene') {
    return () => undefined;
  }

  const camera = layer.config.options.camera;
  if (!(camera instanceof GroupConfigOption)) {
    return () => undefined;
  }
  const flyMode = camera.options.enterWasdMode;
  if (!(flyMode instanceof ButtonConfigOption)) {
    return () => undefined;
  }

  const previousAction = flyMode.onPress;
  flyMode.onPress = preview.activateFlyCameraMode;

  return () => {
    if (flyMode.onPress === preview.activateFlyCameraMode) {
      flyMode.onPress = previousAction;
    }
  };
};

import {
  ComponentActionControl,
  ComponentSettingControl,
  createComponentParameterId,
  getSettingNodeHandleType,
  isSettingVisible,
} from '@/components/config/config';
import { AnimatedLiveValue } from '@/components/editor/animated-live-value';
import editorControl from '@/lib/editor-control';
import useEditorRuntimePreviewAttachmentStore from '@/lib/stores/editor-runtime-preview-attachment-store';
import { cn } from '@/lib/utils';
import {
  selectParameterGraphBindings,
  selectProjectedNodeNetworks,
  useLiveLayerSetting,
  useVizSessionSelector,
} from '@/lib/viz-session';
import type {
  VizComponentGroupSetting,
  VizComponentSettingDefinition,
} from '@viz-engine/contracts';
import { AudioLines, Info, Target, X } from 'lucide-react';
import { memo, type ReactNode } from 'react';
import useNodeNetworkStore from '../node-network/node-network-store';
import { Button } from '../ui/button';
import CollapsibleGroup from '../ui/collapsible-group';
import SimpleTooltip from '../ui/simple-tooltip';
import { Toggle } from '../ui/toggle';

type ValueSetting = Exclude<
  VizComponentSettingDefinition,
  VizComponentGroupSetting | { kind: 'action' }
>;

const isAnimatable = (setting: VizComponentSettingDefinition): boolean =>
  setting.kind !== 'group' &&
  setting.kind !== 'action' &&
  setting.kind !== 'file' &&
  setting.kind !== 'list' &&
  setting.animatable !== false;

const SettingLabel = ({
  setting,
  children,
}: {
  setting: VizComponentSettingDefinition;
  children?: ReactNode;
}) => (
  <SimpleTooltip
    text={setting.description}
    trigger={
      <div className="mb-2 flex items-center gap-x-2 text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
        {setting.description && <Info className="h-3 w-3 opacity-50" />}
        {setting.label}
        {children}
      </div>
    }
  />
);

const ActionField = ({
  layerId,
  setting,
}: {
  layerId: string;
  setting: Extract<VizComponentSettingDefinition, { kind: 'action' }>;
}) => (
  <div className="px-4 pb-6">
    <SettingLabel setting={setting} />
    <ComponentActionControl
      label={setting.buttonLabel ?? setting.label}
      onPress={() =>
        useEditorRuntimePreviewAttachmentStore
          .getState()
          .invokeLayerAction(layerId, setting.actionId)
      }
    />
  </div>
);

const SettingEntries = ({
  layerId,
  group,
  path = [],
  values,
}: {
  layerId: string;
  group: VizComponentGroupSetting;
  path?: string[];
  values: Record<string, unknown>;
}) => {
  const parameterGraphBindings = useVizSessionSelector(
    selectParameterGraphBindings,
  );

  return Object.entries(group.fields).map(([key, setting]) => {
    if (!isSettingVisible(setting.visibleWhen, values)) {
      return null;
    }
    const settingPath = [...path, key];
    if (setting.kind === 'group') {
      const animatedParams = Object.entries(setting.fields).flatMap(
        ([childKey, child]) =>
          isAnimatable(child) &&
          parameterGraphBindings[
            createComponentParameterId(layerId, [...settingPath, childKey])
          ]
            ? [child.label]
            : [],
      );
      return (
        <CollapsibleGroup
          key={key}
          label={setting.label}
          description={setting.description}
          animatedParams={animatedParams}>
          <div className="flex flex-col pt-2 pb-0">
            <SettingEntries
              layerId={layerId}
              group={setting}
              path={settingPath}
              values={values}
            />
          </div>
        </CollapsibleGroup>
      );
    }
    if (setting.kind === 'action') {
      return <ActionField key={key} layerId={layerId} setting={setting} />;
    }
    return (
      <div key={key} className="pb-6">
        <ParameterField
          layerId={layerId}
          paramPath={settingPath}
          setting={setting}
        />
      </div>
    );
  });
};

const LayerParameters = ({
  layerId,
  settings,
}: {
  layerId: string;
  settings: VizComponentGroupSetting;
}) => {
  const values =
    useVizSessionSelector(
      (state) =>
        state.project.workingProject.layers.find(
          (layer) => layer.id === layerId,
        )?.settings,
    ) ?? {};
  return (
    <div className="flex flex-col">
      <SettingEntries layerId={layerId} group={settings} values={values} />
    </div>
  );
};

export default LayerParameters;

interface ParameterFieldProps {
  layerId: string;
  paramPath: string[];
  setting: ValueSetting;
}

const ParameterField = memo(
  ({ layerId, paramPath, setting }: ParameterFieldProps) => {
    const id = createComponentParameterId(layerId, paramPath);
    const value = useVizSessionSelector((state) => {
      let current: unknown = state.project.workingProject.layers.find(
        (layer) => layer.id === layerId,
      )?.settings;
      for (const key of paramPath) {
        if (typeof current !== 'object' || current === null) {
          return undefined;
        }
        current = (current as Record<string, unknown>)[key];
      }
      return current;
    });
    const liveSetting = useLiveLayerSetting(layerId, paramPath);
    const effectiveValue = liveSetting ? liveSetting.value : value;
    const graphBinding = useVizSessionSelector(
      (state) => selectParameterGraphBindings(state)[id],
    );
    const resolvedNetworkId = graphBinding?.graphId ?? id;
    const animated = useVizSessionSelector((state) => {
      const networks = selectProjectedNodeNetworks(state);
      return (
        !!graphBinding && (networks[resolvedNetworkId]?.isEnabled ?? false)
      );
    });
    const openNetwork = useNodeNetworkStore((state) => state.openNetwork);
    const highlighted = openNetwork === resolvedNetworkId;
    const type = getSettingNodeHandleType(setting);

    return (
      <div className="flex grow flex-wrap justify-between px-4">
        <SimpleTooltip
          text={setting.description}
          trigger={
            <div
              className={cn(
                'text-2xs mr-1 mb-2 flex items-center gap-x-2 leading-none font-medium',
                animated && !highlighted && 'text-animation-blue',
                animated && highlighted && 'text-animation-purple',
              )}>
              {setting.description && <Info className="h-3 w-3 opacity-50" />}
              {setting.label || paramPath.at(-1)}
              {animated && <AnimatedLiveValue parameterId={id} />}
            </div>
          }
        />
        <div className="flex w-full items-center gap-x-2">
          <div
            className={cn(
              'relative grow',
              animated && 'pointer-events-none opacity-50',
            )}>
            <ComponentSettingControl
              setting={setting}
              value={effectiveValue}
              onChange={(nextValue) =>
                editorControl.project.updateLayerValue(
                  layerId,
                  paramPath,
                  nextValue,
                )
              }
              onGestureStart={() =>
                editorControl.project.beginLayerValueGesture(layerId, paramPath)
              }
              onTransientChange={(nextValue) =>
                editorControl.project.updateLiveLayerValue(
                  layerId,
                  paramPath,
                  nextValue,
                )
              }
              onCommit={(nextValue) =>
                editorControl.project.commitLayerValueGesture(
                  layerId,
                  paramPath,
                  nextValue,
                )
              }
              onGestureCancel={() =>
                editorControl.project.cancelLayerValueGesture(
                  layerId,
                  paramPath,
                )
              }
              onAssetSelect={async (selection) => {
                const asset =
                  selection.kind === 'file'
                    ? await editorControl.project.attachLayerFileAsset(
                        layerId,
                        paramPath,
                        selection.file,
                      )
                    : await editorControl.project.attachLayerExternalAsset(
                        layerId,
                        paramPath,
                        selection.uri,
                      );
                return `asset:${asset.id}`;
              }}
            />
          </div>
          {isAnimatable(setting) && (
            <>
              <Toggle
                aria-label="Enable/Select Animation"
                tooltip="Enable or select parameter animation"
                pressed={animated}
                variant={
                  animated && highlighted
                    ? 'highlighted'
                    : animated
                      ? 'active'
                      : 'outline'
                }
                onPressedChange={() => {
                  if (animated) {
                    editorControl.nodeEditor.openNetwork(id);
                    editorControl.nodeEditor.setShouldForceShowOverlay(true);
                  } else {
                    editorControl.nodeEditor.setAnimationEnabled(
                      id,
                      true,
                      type,
                    );
                  }
                }}>
                {animated ? <AudioLines /> : <Target />}
              </Toggle>
              {animated && (
                <SimpleTooltip
                  text="Disable animation"
                  trigger={
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 hover:bg-red-500/20"
                      onClick={() =>
                        editorControl.nodeEditor.setAnimationEnabled(
                          id,
                          false,
                          type,
                        )
                      }>
                      <X size={14} className="text-red-400" />
                    </Button>
                  }
                />
              )}
            </>
          )}
        </div>
      </div>
    );
  },
  (previous, next) =>
    previous.layerId === next.layerId &&
    previous.setting === next.setting &&
    previous.paramPath.join('.') === next.paramPath.join('.'),
);

ParameterField.displayName = 'ParameterField';

import editorControl from '@/lib/editor-control';
import useEditorGraphStore from '@/lib/stores/editor-graph-store';
import { cn } from '@/lib/utils';
import {
  selectParameterGraphBindings,
  selectRuntimeGraphValueForParameter,
  useVizSessionSelector,
} from '@/lib/viz-session';
import { AudioLines, Info, Target, X } from 'lucide-react';
import { memo } from 'react';
import {
  ButtonConfigOption,
  ConfigParam,
  GroupConfigOption,
  VConfigType,
} from '../config/config';
import useNodeNetworkStore from '../node-network/node-network-store';
import { Button } from '../ui/button';
import CollapsibleGroup from '../ui/collapsible-group';
import SimpleTooltip from '../ui/simple-tooltip';
import { Toggle } from '../ui/toggle';

interface LayerParametersProps {
  layerId: string;
  config: VConfigType;
}

const LayerParameters = ({ layerId, config }: LayerParametersProps) => {
  // Subscribe ONLY to the enabled state map (not the entire networks object)
  // This prevents rerenders when node positions or other network data changes
  const parameterGraphBindings = useVizSessionSelector(
    selectParameterGraphBindings,
  );

  // Get all current values once for visibleIf checks
  const allValues = useVizSessionSelector(
    (state) =>
      state.project.workingProject.layers.find((layer) => layer.id === layerId)
        ?.settings,
  );

  // Helper function to get animated parameters in a group
  const getAnimatedParamsInGroup = (groupOption: GroupConfigOption<any>) => {
    const animatedParams: string[] = [];

    Object.values(groupOption.options).forEach((innerOption) => {
      if (innerOption instanceof ConfigParam && innerOption.isAnimatable) {
        const isAnimated = !!parameterGraphBindings[innerOption.id];
        if (isAnimated) {
          animatedParams.push(innerOption.label);
        }
      }
    });

    return animatedParams;
  };

  return (
    <div className="flex flex-col">
      {Object.entries(config.options).map(([key, option]) => {
        const isHidden =
          typeof option.visibleIf === 'function' &&
          !option.visibleIf(allValues ?? {});
        if (isHidden) return null;

        return (
          <div key={key}>
            {option instanceof GroupConfigOption ? (
              <CollapsibleGroup
                label={option.label}
                description={option.description}
                animatedParams={getAnimatedParamsInGroup(option)}>
                <div className="flex flex-col pt-2 pb-0">
                  {Object.entries(option.options).map(
                    ([innerKey, innerOption]) => {
                      const opt = innerOption as
                        ConfigParam<any> | ButtonConfigOption;
                      const isHidden =
                        typeof opt.visibleIf === 'function' &&
                        !opt.visibleIf(allValues ?? {});
                      if (isHidden) return null;

                      // Handle buttons separately (they don't have values/animation)
                      if (opt instanceof ButtonConfigOption) {
                        return (
                          <div key={innerKey} className="px-4 pb-6">
                            <SimpleTooltip
                              text={opt.description}
                              trigger={
                                <div className="mb-2 flex items-center gap-x-2 text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                  {opt.description && (
                                    <Info className="h-3 w-3 opacity-50" />
                                  )}
                                  {opt.label}
                                </div>
                              }
                            />
                            {opt.toFormElement(null, () => {})}
                          </div>
                        );
                      }
                      return (
                        <div key={innerKey} className="pb-6">
                          <ParameterField
                            layerId={layerId}
                            paramPath={[key, innerKey]}
                            option={opt}
                          />
                        </div>
                      );
                    },
                  )}
                </div>
              </CollapsibleGroup>
            ) : option instanceof ButtonConfigOption ? (
              <div className="px-4 pb-6">
                <SimpleTooltip
                  text={option.description}
                  trigger={
                    <div className="mb-2 flex items-center gap-x-2 text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      {option.description && (
                        <Info className="h-3 w-3 opacity-50" />
                      )}
                      {option.label}
                    </div>
                  }
                />
                {option.toFormElement(null, () => {})}
              </div>
            ) : (
              <div className="pb-6">
                <ParameterField
                  layerId={layerId}
                  paramPath={[key]}
                  option={option as ConfigParam<any>}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default LayerParameters;

interface ParameterFieldProps {
  layerId: string;
  paramPath: string[];
  option: ConfigParam<any>;
}

const ParameterField = memo(
  ({ layerId, paramPath, option }: ParameterFieldProps) => {
    // Subscribe ONLY to this parameter's value
    const value = useVizSessionSelector((state) => {
      const layerValues = state.project.workingProject.layers.find(
        (layer) => layer.id === layerId,
      )?.settings;
      if (!layerValues) return undefined;

      // Navigate the path to get the value
      let current: unknown = layerValues;
      for (const key of paramPath) {
        if (typeof current !== 'object' || current === null) {
          return undefined;
        }
        current = (current as Record<string, unknown>)[key];
      }
      return current;
    });

    const graphBinding = useVizSessionSelector(
      (state) => selectParameterGraphBindings(state)[option.id],
    );
    const resolvedNetworkId = graphBinding?.graphId ?? option.id;
    const isAnimated = useEditorGraphStore(
      (state) =>
        !!graphBinding &&
        (state.networks[resolvedNetworkId]?.isEnabled ?? false),
    );

    const openNetwork = useNodeNetworkStore((state) => state.openNetwork);

    const isHighlighted = openNetwork === resolvedNetworkId;

    return (
      <div className="flex grow flex-wrap justify-between px-4">
        <SimpleTooltip
          text={option.description}
          trigger={
            <div
              className={cn(
                'text-2xs mr-1 mb-2 flex items-center gap-x-2 leading-none font-medium',
                isAnimated && !isHighlighted && 'text-animation-blue',
                isAnimated && isHighlighted && 'text-animation-purple',
              )}>
              {option.description && <Info className="h-3 w-3 opacity-50" />}
              {option.label || paramPath[paramPath.length - 1]}
              {isAnimated && <AnimatedLiveValue parameterId={option.id} />}
            </div>
          }
        />
        <div className="flex w-full items-center gap-x-2">
          <div
            className={cn(
              'relative grow',
              isAnimated && 'pointer-events-none opacity-50',
            )}>
            {option.toFormElement(
              value,
              (newValue) => {
                editorControl.project.updateLayerValue(
                  layerId,
                  paramPath,
                  newValue,
                );
              },
              () => {
                editorControl.history.startGesture(
                  `${layerId}:${paramPath.join('.')}`,
                );
              },
              () => {
                editorControl.history.endGesture(
                  `${layerId}:${paramPath.join('.')}`,
                );
              },
              async (selection) => {
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
              },
            )}
          </div>
          {option.isAnimatable && (
            <>
              <Toggle
                aria-label="Enable/Select Animation"
                tooltip="Enable or select parameter animation"
                pressed={!!isAnimated}
                variant={
                  isAnimated && isHighlighted
                    ? 'highlighted'
                    : isAnimated && !isHighlighted
                      ? 'active'
                      : 'outline'
                }
                onPressedChange={() => {
                  // If already animated, just select/open it
                  if (isAnimated) {
                    editorControl.nodeEditor.openNetwork(option.id);
                    editorControl.nodeEditor.setShouldForceShowOverlay(true);
                    return;
                  }

                  // Otherwise, enable the animation
                  editorControl.nodeEditor.setAnimationEnabled(
                    option.id,
                    true,
                    option.type,
                  );
                }}>
                {isAnimated ? <AudioLines /> : <Target />}
              </Toggle>
              {isAnimated && (
                <SimpleTooltip
                  text="Disable animation"
                  trigger={
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 hover:bg-red-500/20"
                      onClick={() => {
                        editorControl.nodeEditor.setAnimationEnabled(
                          option.id,
                          false,
                          option.type,
                        );
                      }}>
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
  // Custom comparison function to only rerender when needed
  (prevProps, nextProps) => {
    // Always rerender if props change
    if (
      prevProps.layerId !== nextProps.layerId ||
      prevProps.option !== nextProps.option ||
      prevProps.paramPath.join('.') !== nextProps.paramPath.join('.')
    ) {
      return false;
    }
    // Otherwise, let Zustand selectors handle rerenders
    return true;
  },
);

ParameterField.displayName = 'ParameterField';

// Separate component that subscribes to the live values store.
// Only this small element re-renders as the animated value changes.
export const AnimatedLiveValue = ({
  parameterId,
  className = 'text-zinc-300',
}: {
  parameterId: string;
  className?: string;
}) => {
  const value = useVizSessionSelector((state) =>
    selectRuntimeGraphValueForParameter(state, parameterId),
  );

  if (value === undefined) return null;

  let text: string;
  if (typeof value === 'number') {
    text = value.toFixed(2);
  } else if (typeof value === 'string') {
    text = value;
  } else {
    try {
      text = JSON.stringify(value);
    } catch {
      text = String(value);
    }
  }
  return <span className={className}>{text}</span>;
};

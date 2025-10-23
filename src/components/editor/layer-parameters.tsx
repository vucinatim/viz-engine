import { useHistoryStore } from '@/lib/stores/history-store';
import useLayerValuesStore from '@/lib/stores/layer-values-store';
import { cn } from '@/lib/utils';
import { AudioLines, Info, Target, X } from 'lucide-react';
import { memo } from 'react';
import useAnimationLiveValuesStore from '../../lib/stores/animation-live-values-store';
import {
  ButtonConfigOption,
  ConfigParam,
  GroupConfigOption,
  VConfigType,
} from '../config/config';
import useNodeNetworkStore, {
  useNetworkEnabledMap,
} from '../node-network/node-network-store';
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
  const networkEnabledMap = useNetworkEnabledMap();

  // Get all current values once for visibleIf checks
  const allValues = useLayerValuesStore((state) => state.values[layerId]);

  // Helper function to get animated parameters in a group
  const getAnimatedParamsInGroup = (groupOption: GroupConfigOption<any>) => {
    const animatedParams: string[] = [];

    Object.entries(groupOption.options).forEach(([innerKey, innerOption]) => {
      if (innerOption instanceof ConfigParam && innerOption.isAnimatable) {
        const isAnimated = networkEnabledMap[innerOption.id];
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
                <div className="flex flex-col pb-0 pt-2">
                  {Object.entries(option.options).map(
                    ([innerKey, innerOption]) => {
                      const opt = innerOption as
                        | ConfigParam<any>
                        | ButtonConfigOption;
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
                                <div className="mb-2 flex items-center gap-x-2 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
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
                    <div className="mb-2 flex items-center gap-x-2 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
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
    const value = useLayerValuesStore((state) => {
      const layerValues = state.values[layerId];
      if (!layerValues) return undefined;

      // Navigate the path to get the value
      let current = layerValues;
      for (const key of paramPath) {
        current = current?.[key];
      }
      return current;
    });

    const isAnimated = useNodeNetworkStore(
      (state) => state.networks[option.id]?.isEnabled,
    );

    const openNetwork = useNodeNetworkStore((state) => state.openNetwork);
    const setOpenNetwork = useNodeNetworkStore((state) => state.setOpenNetwork);
    const setNetworkEnabled = useNodeNetworkStore(
      (state) => state.setNetworkEnabled,
    );
    const setShouldForceShowOverlay = useNodeNetworkStore(
      (state) => state.setShouldForceShowOverlay,
    );
    const updateLayerValue = useLayerValuesStore(
      (state) => state.updateLayerValue,
    );

    // Get history bypass control
    const setBypassHistory = useHistoryStore((state) => state.setBypassHistory);

    const isHighlighted = openNetwork === option.id;

    return (
      <div className="flex grow flex-wrap justify-between px-4">
        <SimpleTooltip
          text={option.description}
          trigger={
            <div
              className={cn(
                'mb-2 mr-1 flex items-center gap-x-2 text-2xs font-medium leading-none',
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
                updateLayerValue(layerId, paramPath, newValue);
              },
              () => {
                // On drag start - bypass history
                setBypassHistory(true);
              },
              () => {
                // On drag end - re-enable history
                setBypassHistory(false);
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
                    setOpenNetwork(option.id);
                    setShouldForceShowOverlay(true);
                    return;
                  }

                  // Otherwise, enable the animation
                  setNetworkEnabled(option.id, true, option.type);
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
                        setNetworkEnabled(option.id, false, option.type);
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
  const value = useAnimationLiveValuesStore(
    (state) => state.values[parameterId],
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

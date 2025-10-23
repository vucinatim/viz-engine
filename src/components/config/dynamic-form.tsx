import { useHistoryStore } from '@/lib/stores/history-store';
import useLayerValuesStore from '@/lib/stores/layer-values-store';
import { cn } from '@/lib/utils';
import { AudioLines, Info, Target, X } from 'lucide-react';
import { UseFormReturn, useForm } from 'react-hook-form';
import useAnimationLiveValuesStore from '../../lib/stores/animation-live-values-store';
import useNodeNetworkStore, {
  useNetworkEnabledMap,
} from '../node-network/node-network-store';
import { Button } from '../ui/button';
import CollapsibleGroup from '../ui/collapsible-group';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '../ui/form';
import SimpleTooltip from '../ui/simple-tooltip';
import { Toggle } from '../ui/toggle';
import {
  ButtonConfigOption,
  ConfigParam,
  GroupConfigOption,
  VConfigType,
} from './config';

interface DynamicFormProps {
  layerId: string;
  config: VConfigType;
  defaultValues?: any;
}

const DynamicForm = ({ layerId, config, defaultValues }: DynamicFormProps) => {
  const form = useForm({
    values: defaultValues,
  });

  // Subscribe ONLY to the enabled state map (not the entire networks object)
  // This prevents rerenders when node positions or other network data changes
  const networkEnabledMap = useNetworkEnabledMap();

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
    <Form {...form}>
      <div className="flex flex-col">
        {Object.entries(config.options).map(([key, option]) => {
          const isHidden =
            typeof option.visibleIf === 'function' &&
            !option.visibleIf(form.getValues());
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
                          !opt.visibleIf(form.getValues());
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
                            <MemoField
                              layerId={layerId}
                              name={`${key}.${innerKey}`}
                              form={form}
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
                  <MemoField
                    layerId={layerId}
                    name={key}
                    form={form}
                    option={option as ConfigParam<any>}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Form>
  );
};

interface DynamicFormFieldProps {
  layerId: string;
  name: string;
  option: ConfigParam<any>;
  form: UseFormReturn;
}

const DynamicFormField = ({
  layerId,
  name,
  option,
  form,
}: DynamicFormFieldProps) => {
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

  // Live animated value is rendered in a separate component to avoid
  // re-rendering the entire field when the value updates.

  return (
    <FormField
      name={name}
      control={form.control}
      render={({ field, fieldState }) => {
        return (
          <FormItem className="flex grow flex-wrap justify-between px-4">
            <SimpleTooltip
              text={option.description}
              trigger={
                <FormLabel
                  className={cn(
                    'flex items-center gap-x-2',
                    isAnimated && !isHighlighted && 'text-animation-blue',
                    isAnimated && isHighlighted && 'text-animation-purple',
                  )}>
                  {option.description && (
                    <Info className="h-3 w-3 opacity-50" />
                  )}
                  {option.label || name.charAt(0).toUpperCase() + name.slice(1)}
                  {isAnimated && <AnimatedLiveValue parameterId={option.id} />}
                </FormLabel>
              }
            />
            <div className="flex w-full items-center gap-x-2">
              <div
                className={cn(
                  'relative grow',
                  isAnimated && 'pointer-events-none opacity-50',
                )}>
                <FormControl>
                  {option.toFormElement(
                    field.value,
                    (newValue) => {
                      field.onChange(newValue);
                      updateLayerValue(layerId, name.split('.'), newValue);
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
                </FormControl>
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
            <FormMessage>{fieldState.error?.message}</FormMessage>
          </FormItem>
        );
      }}
    />
  );
};

export default DynamicForm;

// Memoized field to limit rerenders to the changed control only
import React from 'react';
const MemoField = React.memo(DynamicFormField, (prev, next) => {
  // Re-render when:
  // - it's the same field (name)
  // - the value in RHF changed for this field
  // - its animation state changed (enabled/highlighted/live value)

  if (prev.name !== next.name) return false;
  if (prev.layerId !== next.layerId) return false;

  // React Hook Form exposes current values via form.getValues
  const prevVal = prev.form.getValues(prev.name);
  const nextVal = next.form.getValues(next.name);
  if (prevVal !== nextVal) return false;

  // Shallow compare option meta likely stable; assume stable
  return true;
});

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

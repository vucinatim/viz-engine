import useLayerValuesStore from '@/lib/stores/layer-values-store';
import { cn } from '@/lib/utils';
import { AudioLines, Info, Target } from 'lucide-react';
import { UseFormReturn, useForm } from 'react-hook-form';
import useAnimationLiveValuesStore from '../../lib/stores/animation-live-values-store';
import useNodeNetworkStore from '../node-network/node-network-store';
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
import { ConfigParam, GroupConfigOption, VConfigType } from './config';

interface DynamicFormProps {
  layerId: string;
  config: VConfigType;
  defaultValues?: any;
}

const DynamicForm = ({ layerId, config, defaultValues }: DynamicFormProps) => {
  const form = useForm({
    values: defaultValues,
  });

  return (
    <Form {...form}>
      <div className="flex flex-col">
        {Object.entries(config.options).map(([key, option]) => (
          <div key={key}>
            {option instanceof GroupConfigOption ? (
              <CollapsibleGroup
                label={option.label}
                description={option.description}>
                <div className="flex flex-col gap-y-4 pb-6">
                  {Object.entries(option.options).map(
                    ([innerKey, innerOption]) => (
                      <DynamicFormField
                        layerId={layerId}
                        key={`${key}.${innerKey}`}
                        name={`${key}.${innerKey}`}
                        form={form}
                        option={innerOption as ConfigParam<any>}
                      />
                    ),
                  )}
                </div>
              </CollapsibleGroup>
            ) : (
              <div className="pb-6">
                <DynamicFormField
                  layerId={layerId}
                  name={key}
                  form={form}
                  option={option as ConfigParam<any>}
                />
              </div>
            )}
          </div>
        ))}
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
  const liveValue = useAnimationLiveValuesStore(
    (state) => state.values[option.id],
  );

  const openNetwork = useNodeNetworkStore((state) => state.openNetwork);
  const setOpenNetwork = useNodeNetworkStore((state) => state.setOpenNetwork);
  const setNetworkEnabled = useNodeNetworkStore(
    (state) => state.setNetworkEnabled,
  );
  const updateLayerValue = useLayerValuesStore(
    (state) => state.updateLayerValue,
  );

  const isHighlighted = openNetwork === option.id;

  const getFormattedValue = () => {
    if (typeof liveValue === 'number') {
      return liveValue.toFixed(2);
    }
    if (typeof liveValue === 'string') {
      return liveValue;
    }
    return JSON.stringify(liveValue);
  };

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
                <FormLabel className="flex items-center gap-x-2">
                  {option.description && (
                    <Info className="h-3 w-3 opacity-50" />
                  )}
                  {option.label || name.charAt(0).toUpperCase() + name.slice(1)}
                  {isAnimated && (
                    <div className="text-zinc-300">{getFormattedValue()}</div>
                  )}
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
                  {option.toFormElement(field.value, (newValue) => {
                    field.onChange(newValue);
                    updateLayerValue(layerId, name.split('.'), newValue);
                  })}
                </FormControl>
              </div>
              {option.isAnimatable && (
                <Toggle
                  aria-label="Toggle Animation"
                  tooltip="Toggle parameter animation"
                  pressed={!!isAnimated}
                  variant={
                    isAnimated && isHighlighted ? 'highlighted' : 'outline'
                  }
                  onPressedChange={(newValue) => {
                    // If the toggle is already active but for a different network,
                    // clicking it again should open the corresponding network editor
                    if (isAnimated && !isHighlighted) {
                      setOpenNetwork(option.id);
                      return;
                    }

                    // Otherwise, just toggle the animation on/off
                    setNetworkEnabled(option.id, newValue);
                  }}>
                  {isAnimated ? <AudioLines /> : <Target />}
                </Toggle>
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

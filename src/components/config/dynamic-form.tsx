import { cn } from '@/lib/utils';
import { AudioLines, Info, Target } from 'lucide-react';
import { useEffect, useState } from 'react';
import { UseFormReturn, useForm } from 'react-hook-form';
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
  config: VConfigType;
  defaultValues?: any;
}

const DynamicForm = ({ config, defaultValues }: DynamicFormProps) => {
  const form = useForm({
    defaultValues: defaultValues,
  });

  // Update form when default values change
  useEffect(() => {
    if (defaultValues) {
      console.log('Resetting form with default values', defaultValues);
      form.reset(defaultValues);
    }
  }, [defaultValues, form]);

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
  name: string;
  option: ConfigParam<any>;
  form: UseFormReturn;
}

const DynamicFormField = ({ name, option, form }: DynamicFormFieldProps) => {
  const [isAnimated, setIsAnimated] = useState(false);
  const openNetwork = useNodeNetworkStore((state) => state.openNetwork);
  const setOpenNetwork = useNodeNetworkStore((state) => state.setOpenNetwork);
  const setNetworkEnabled = useNodeNetworkStore(
    (state) => state.setNetworkEnabled,
  );

  const isHighlighted = openNetwork === option.id;

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
                  {option.toFormElement(field.value, field.onChange)}
                </FormControl>
              </div>
              {option.isAnimatable && (
                <Toggle
                  aria-label="Toggle Animation"
                  tooltip="Toggle parameter animation"
                  pressed={isAnimated}
                  variant={
                    isAnimated && isHighlighted ? 'highlighted' : 'outline'
                  }
                  onPressedChange={(newValue) => {
                    if (isAnimated && !isHighlighted) {
                      setOpenNetwork(option.id);
                      return;
                    }

                    if (newValue) {
                      setNetworkEnabled(option.id, true);
                      setIsAnimated(true);
                    } else {
                      setNetworkEnabled(option.id, false);
                      setIsAnimated(false);
                    }
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

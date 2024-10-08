import { Info } from 'lucide-react';
import { useEffect } from 'react';
import { UseFormReturn, useForm } from 'react-hook-form';
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
import { BaseConfigOption, GroupConfigOption, VConfigType } from './config';

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
                        option={innerOption as BaseConfigOption<any>}
                      />
                    ),
                  )}
                </div>
              </CollapsibleGroup>
            ) : (
              <div className="pb-6">
                <DynamicFormField name={key} form={form} option={option} />
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
  option: BaseConfigOption<any>;
  form: UseFormReturn;
}

const DynamicFormField = ({ name, option, form }: DynamicFormFieldProps) => {
  return (
    <FormField
      name={name}
      control={form.control}
      render={({ field, fieldState }) => {
        return (
          <FormItem className="flex flex-wrap justify-between px-4">
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

            <FormControl>
              {option.toFormElement(field.value, field.onChange)}
            </FormControl>
            <FormMessage>{fieldState.error?.message}</FormMessage>
          </FormItem>
        );
      }}
    />
  );
};

export default DynamicForm;

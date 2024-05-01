import React, { MutableRefObject, useEffect } from "react";
import { ControllerRenderProps, useForm, UseFormReturn } from "react-hook-form";
import { z, ZodObject } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";
import { Input } from "../ui/input";
import { Slider } from "../ui/slider";
import { ColorPickerPopover } from "../ui/color-picker";
import { SimpleSelect } from "../ui/select";
import { AlertCircle, Info } from "lucide-react";
import { getDefaults, getNumberConstraints } from "@/lib/schema-utils";
import { getMetadata, InputType } from "@/lib/types/field-metadata";
import CollapsibleGroup from "../ui/collapsible-group";
import SimpleTooltip from "../ui/simple-tooltip";
import { Switch } from "../ui/switch";

type FieldProps = ControllerRenderProps<{ [k: string]: any }, string>;

interface DynamicFormProps {
  schema: ZodObject<any>;
  valuesRef: React.MutableRefObject<any>;
  defaultValues?: any;
}

const DynamicForm = ({
  schema,
  valuesRef,
  defaultValues,
}: DynamicFormProps) => {
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: defaultValues,
  });

  // Rerender when default values change
  useEffect(() => {
    if (!defaultValues) return;
    console.log("Resetting form with default values", defaultValues);
    form.reset(defaultValues);
  }, [defaultValues, form]);

  return (
    <Form {...form}>
      {Object.entries(schema.shape).map(([outerKey, value]) => {
        const fieldSchema = value;
        const metadata = getMetadata(value);

        // Handle ZodObject by creating a collapsible group
        if (fieldSchema instanceof z.ZodObject) {
          return (
            <CollapsibleGroup
              key={outerKey}
              label={metadata?.label || "Group"}
              description={metadata?.description}
              className="pt-4"
            >
              <div className="pb-6 flex flex-col gap-y-2">
                {Object.entries(fieldSchema.shape).map(([innerKey, value]) => (
                  <DynamicFormField
                    key={`${outerKey}.${innerKey}`}
                    name={`${outerKey}.${innerKey}`}
                    form={form}
                    valuesRef={valuesRef.current[outerKey]}
                    fieldSchema={value as z.ZodType<any>}
                  />
                ))}
              </div>
            </CollapsibleGroup>
          );
        }

        // Handle other types with a regular form field
        return (
          <div key={outerKey}>
            <DynamicFormField
              name={outerKey}
              form={form}
              valuesRef={valuesRef.current}
              fieldSchema={fieldSchema as z.ZodType<any>}
            />
          </div>
        );
      })}
    </Form>
  );
};

interface DynamicFormFieldProps {
  name: string;
  fieldSchema: z.ZodType<any>;
  form: UseFormReturn;
  valuesRef: MutableRefObject<any>;
}

const DynamicFormField = ({
  name,
  fieldSchema,
  form,
  valuesRef,
}: DynamicFormFieldProps) => {
  return (
    <FormField
      name={name}
      control={form.control}
      render={({ field, fieldState }) => {
        const metadata = getMetadata(fieldSchema);
        return (
          <FormItem className="px-4">
            <SimpleTooltip
              text={metadata?.description}
              trigger={
                <FormLabel className="flex items-center gap-x-2">
                  {metadata?.description && (
                    <Info className="w-3 h-3 opacity-50" />
                  )}
                  {metadata?.label ||
                    name.charAt(0).toUpperCase() + name.slice(1)}
                </FormLabel>
              }
            />

            <FormControl>
              {getInputComponent(fieldSchema, field, valuesRef)}
            </FormControl>
            <FormMessage>{fieldState.error?.message}</FormMessage>
          </FormItem>
        );
      }}
    />
  );
};

const getInputComponent = (schema: unknown, field: FieldProps, values: any) => {
  const handleOnChange = (value: any) => {
    field.onChange(value);
    // Since grouped fields are stored in an object, we need to update the correct key
    const objectKey = field.name.split(".").pop() || field.name;
    values[objectKey] = value;
  };

  // If the schema is a ZodDefault, get the inner type
  let type = schema;
  const metadata = getMetadata(schema);
  if (schema instanceof z.ZodDefault) {
    type = schema._def.innerType;
  }

  // Handle ZodNumber with a Slider
  if (type instanceof z.ZodNumber) {
    return (
      <Slider
        value={field.value}
        onChange={handleOnChange}
        {...getNumberConstraints(type)}
      />
    );
  }

  // Handle ZodBoolean with a Toggle
  if (type instanceof z.ZodBoolean) {
    return (
      <Switch value={field.value} onChange={handleOnChange} name={field.name} />
    );
  }

  // Handle ZodString with either ColorPicker or Input
  if (type instanceof z.ZodString) {
    if (metadata?.inputType === InputType.Color) {
      return (
        <ColorPickerPopover value={field.value} onChange={handleOnChange} />
      );
    }
    return <Input value={field.value} onChange={handleOnChange} />;
  }

  // Handle ZodEnum with a SimpleSelect
  if (type instanceof z.ZodEnum) {
    return (
      <SimpleSelect
        name={field.name}
        value={field.value}
        onChange={handleOnChange}
        options={type._def.values}
      />
    );
  }

  // Default unsupported type handler
  return (
    <div className="bg-background border items-center border-input text-sm rounded-md h-10 w-full px-3 py-2 text-rose-500 flex gap-x-2">
      <AlertCircle size={16} className="shrink-0" />
      <p className="truncate grow min-w-0">Unsupported type</p>
      <span className="text-rose-300 shrink-0 text-xs">
        [{type?.constructor.name}]
      </span>
    </div>
  );
};

export default DynamicForm;

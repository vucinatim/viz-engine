import React, { MutableRefObject } from "react";
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

type FieldProps = ControllerRenderProps<{ [k: string]: any }, string>;

interface DynamicFormProps {
  schema: ZodObject<any>;
  valuesRef: React.MutableRefObject<any>;
}

const DynamicForm = ({ schema, valuesRef }: DynamicFormProps) => {
  const defaultValues = getDefaults(schema);
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues,
  });

  return (
    <Form {...form}>
      {Object.entries(schema.shape).map(([key, value]) => {
        const fieldSchema = value;
        const metadata = getMetadata(value);

        // Handle ZodObject by creating a collapsible group
        if (fieldSchema instanceof z.ZodObject) {
          return (
            <CollapsibleGroup
              key={key}
              label={metadata?.label || "Group"}
              description={metadata?.description}
            >
              {Object.entries(fieldSchema.shape).map(([key, value]) => (
                <DynamicFormField
                  key={key}
                  name={key}
                  form={form}
                  valuesRef={valuesRef}
                  fieldSchema={value as z.ZodType<any>}
                />
              ))}
            </CollapsibleGroup>
          );
        }

        // Handle other types with a regular form field
        return (
          <div key={key} className="px-4">
            <DynamicFormField
              name={key}
              form={form}
              valuesRef={valuesRef}
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
          <FormItem>
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

const getInputComponent = (
  schema: unknown,
  field: FieldProps,
  valuesRef: MutableRefObject<any>
) => {
  const handleOnChange = (value: any) => {
    field.onChange(value);
    valuesRef.current[field.name] = value;
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

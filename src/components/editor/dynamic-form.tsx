import React, { use, useCallback, useEffect } from "react";
import { ControllerRenderProps, useForm, useWatch } from "react-hook-form";
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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
  SimpleSelect,
} from "../ui/select";
import { AlertCircle } from "lucide-react";

type FieldProps = ControllerRenderProps<{ [k: string]: any }, string>;

// Utility function to extract constraints
function getNumberConstraints(schema: z.ZodNumber) {
  let min: number | undefined = undefined;
  let max: number | undefined = undefined;
  let step: number | undefined = undefined;

  // Zod stores constraints in checks array
  schema._def.checks.forEach((check) => {
    if (check.kind === "min") {
      min = check.value;
    } else if (check.kind === "max") {
      max = check.value;
    } else if (check.kind === "multipleOf") {
      step = check.value;
    }
  });

  return { min, max, step };
}

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

  const getInputComponent = useCallback(
    (schema: unknown, field: FieldProps) => {
      const handleOnChange = (value: any) => {
        field.onChange(value);
        valuesRef.current[field.name] = value;
      };

      // If the schema is a ZodDefault, get the inner type
      let type = schema;
      const description = (schema as z.ZodAny).description;
      if (schema instanceof z.ZodDefault) {
        type = schema._def.innerType;
      }

      // If the schema is a ZodNumber, render a Slider
      if (type instanceof z.ZodNumber) {
        const zodType = type as z.ZodNumber;
        return (
          <Slider
            value={field.value}
            onChange={handleOnChange}
            {...getNumberConstraints(zodType)}
          />
        );
      }

      // If the schema is a ZodString, it can be a color or a regular string
      if (type instanceof z.ZodString) {
        // If the schema has a description of "color", render a color input
        if (description === "color") {
          return (
            <ColorPickerPopover value={field.value} onChange={handleOnChange} />
          );
        }

        // Otherwise, render a regular input
        return <Input value={field.value} onChange={handleOnChange} />;
      }

      // If the schema is a ZodEnum, render a select input
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

      return (
        <div className="bg-background border items-center border-input text-sm rounded-md h-10 w-full px-3 py-2 text-rose-500 flex gap-x-2">
          <AlertCircle size={16} className="shrink-0" />
          <p className="truncate grow min-w-0">Unsupported type</p>
          <span className="text-rose-300 shrink-0 text-xs">
            [{type?.constructor.name}]
          </span>
        </div>
      );
    },
    [valuesRef]
  );

  return (
    <Form {...form}>
      {Object.entries(schema.shape).map(([key, value]) => {
        return (
          <FormField
            key={key}
            control={form.control}
            name={key}
            render={({ field, fieldState }) => (
              <FormItem>
                <FormLabel>
                  {key.charAt(0).toUpperCase() + key.slice(1)}
                </FormLabel>
                <FormControl>{getInputComponent(value, field)}</FormControl>
                <FormMessage>{fieldState.error?.message}</FormMessage>
              </FormItem>
            )}
          />
        );
      })}
    </Form>
  );
};

function getDefaults<Schema extends z.AnyZodObject>(schema: Schema) {
  return Object.fromEntries(
    Object.entries(schema.shape).map(([key, value]) => {
      if (value instanceof z.ZodDefault)
        return [key, value._def.defaultValue()];
      return [key, undefined];
    })
  );
}

export default DynamicForm;

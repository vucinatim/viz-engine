import React, { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
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

  // Watch all fields in the form
  const values = useWatch({ control: form.control });

  // Update the ref whenever form values change
  useEffect(() => {
    valuesRef.current = values;
  }, [values, valuesRef]);

  return (
    <Form {...form}>
      {Object.keys(schema.shape).map((key) => (
        <FormField
          key={key}
          control={form.control}
          name={key}
          render={({ field, fieldState }) => (
            <FormItem>
              <FormLabel>
                {key.charAt(0).toUpperCase() + key.slice(1)}
              </FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage>{fieldState.error?.message}</FormMessage>
            </FormItem>
          )}
        />
      ))}
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

import { z } from "zod";

// Utility function to extract default values from a Zod schema
export function getDefaults<Schema extends z.AnyZodObject>(
  schema: Schema
): Object {
  return Object.fromEntries(
    Object.entries(schema.shape).map(([key, value]) => {
      if (value instanceof z.ZodDefault)
        return [key, value._def.defaultValue()];
      if (value instanceof z.ZodObject)
        return [key, getDefaults(value as Schema)];
      return [key, undefined];
    })
  );
}

// Utility function to extract constraints from a ZodNumber schema
export function getNumberConstraints(schema: z.ZodNumber) {
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

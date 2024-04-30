import { z } from "zod";

export enum InputType {
  Color = "color",
  Slider = "slider",
  Select = "select",
  Toggle = "toggle",
}

interface FieldMetadata {
  label: string;
  description: string;
  inputType?: InputType;
}

export function meta(metadata: FieldMetadata): string {
  return JSON.stringify(metadata);
}

export function getMetadata(schema: unknown): FieldMetadata | null {
  if (!(schema instanceof z.ZodType)) {
    console.error("Schema is not a zod type");
    return null;
  }
  if (!schema || !schema.description) {
    console.error("Schema has no description");
    return null;
  }

  try {
    // Attempt to extract and parse the description assuming it contains JSON stringified metadata
    const description = schema.description;
    if (description) {
      const parsed = JSON.parse(description);
      if (parsed && typeof parsed === "object") {
        return parsed as FieldMetadata;
      }
    }
  } catch (error) {
    console.error("Failed to parse metadata:", error);
  }
  return null;
}

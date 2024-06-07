import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel } from "../ui/form";
import { Toggle } from "../ui/toggle";
import { Eye, EyeOff } from "lucide-react";
import { ColorPickerPopover } from "../ui/color-picker";
import { Slider } from "../ui/slider";
import { SimpleSelect } from "../ui/select";
import useLayerStore, { LayerData } from "@/lib/stores/layer-store";
import { useEffect } from "react";

const blendingModes = ["normal", "multiply", "screen", "overlay"] as const;

export const layerSettingsSchema = z.object({
  visible: z.boolean().default(true),
  background: z.string().default("rgba(10, 10, 10, 1)"),
  opacity: z.number().min(0).max(1).default(1),
  blendingMode: z.enum(blendingModes).default("normal"),
  freeze: z.boolean().default(true),
  showDebug: z.boolean().default(false),
});

export type LayerSettings = z.infer<typeof layerSettingsSchema>;

export type BlendingMode = LayerSettings["blendingMode"];

interface LayerSettingsProps {
  layer: LayerData;
}

const LayerSettings = ({ layer }: LayerSettingsProps) => {
  const { updateLayerSettings } = useLayerStore();
  const form = useForm({
    resolver: zodResolver(layerSettingsSchema),
    defaultValues: layer.layerSettings ?? layerSettingsSchema.parse({}),
  });

  // If Layer settings change outside of the form, update the form values
  useEffect(() => {
    form.reset(layer.layerSettings ?? layerSettingsSchema.parse({}));
  }, [layer.layerSettings, form]);

  // Update layer settings on first render to ensure the form is in sync
  useEffect(() => {
    updateLayerSettings(layer.id, form.getValues());
  }, [layer.id, form, updateLayerSettings]);

  // Define handleOnChange as a higher-order function
  const createOnChangeHandler =
    (originalOnChange: (value: any) => void) => (value: any) => {
      originalOnChange(value);
      updateLayerSettings(layer.id, form.getValues());
    };

  return (
    <Form {...form}>
      <div className="flex items-center gap-x-3">
        <FormField
          name="visible"
          control={form.control}
          render={({ field: { value, onChange } }) => (
            <FormItem>
              <FormControl>
                <Toggle
                  aria-label="Toggle visibility"
                  tooltip="Toggle visibility"
                  pressed={value}
                  onPressedChange={(newValue) =>
                    createOnChangeHandler(() => onChange(newValue))(null)
                  }
                >
                  {value ? <Eye /> : <EyeOff />}
                </Toggle>
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          name="opacity"
          control={form.control}
          render={({ field }) => (
            <FormItem className="grow" orientation="vertical">
              <FormLabel>Opacity</FormLabel>
              <FormControl className="-mt-2">
                <Slider
                  value={field.value}
                  onChange={createOnChangeHandler(field.onChange)}
                  min={0}
                  max={1}
                  step={0.01}
                />
              </FormControl>
            </FormItem>
          )}
        />
      </div>
      <div className="flex items-center gap-x-2">
        <FormField
          name="blendingMode"
          control={form.control}
          render={({ field }) => (
            <FormItem className="min-w-32" orientation="vertical">
              <FormLabel>Blending Mode</FormLabel>
              <FormControl>
                <SimpleSelect
                  name={field.name}
                  value={field.value}
                  onChange={createOnChangeHandler(field.onChange)}
                  options={[...blendingModes]}
                />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          name="background"
          control={form.control}
          render={({ field }) => (
            <FormItem className="grow" orientation="vertical">
              <FormLabel>Background</FormLabel>
              <FormControl>
                <ColorPickerPopover
                  value={field.value}
                  onChange={createOnChangeHandler(field.onChange)}
                />
              </FormControl>
            </FormItem>
          )}
        />
      </div>
    </Form>
  );
};

export default LayerSettings;

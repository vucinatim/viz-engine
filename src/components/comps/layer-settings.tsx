import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel } from "../ui/form";
import { Toggle } from "../ui/toggle";
import { Eye, EyeOff } from "lucide-react";
import { ColorPickerPopover } from "../ui/color-picker";
import { Slider } from "../ui/slider";
import { SimpleSelect } from "../ui/select";

const blendingModes = ["normal", "multiply", "screen", "overlay"] as const;

const layerSettingsSchema = z.object({
  visible: z.boolean().default(true),
  backgroundColor: z.string().default("#ffffff"),
  opacity: z.number().min(0).max(1).default(1),
  blendingMode: z.enum(blendingModes).default("normal"),
});

interface LayerSettingsProps {
  layerId: string;
}

const LayerSettings = ({ layerId }: LayerSettingsProps) => {
  const form = useForm({
    resolver: zodResolver(layerSettingsSchema),
    defaultValues: layerSettingsSchema.parse({}),
  });

  return (
    <Form {...form}>
      <div className="flex items-center gap-x-1">
        <FormField
          name="visible"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Toggle
                  aria-label="Toggle visibility"
                  onClick={() => field.onChange(!field.value)}
                >
                  {field.value ? <Eye /> : <EyeOff />}
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
                  onChange={field.onChange}
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
            <FormItem className="grow" orientation="vertical">
              <FormLabel>Blending Mode</FormLabel>
              <FormControl>
                <SimpleSelect
                  name={field.name}
                  value={field.value}
                  onChange={field.onChange}
                  options={[...blendingModes]}
                />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          name="backgroundColor"
          control={form.control}
          render={({ field }) => (
            <FormItem className="grow" orientation="vertical">
              <FormLabel>Background Color</FormLabel>
              <FormControl>
                <ColorPickerPopover
                  value={field.value}
                  onChange={field.onChange}
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

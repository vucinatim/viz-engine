import editorControl from '@/lib/editor-control';
import { LayerData } from '@/lib/editor-layer-types';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff } from 'lucide-react';
import { useCallback, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { ColorPickerPopover } from '../ui/color-picker';
import { Form, FormControl, FormField, FormItem, FormLabel } from '../ui/form';
import { SimpleSelect } from '../ui/select';
import { Slider } from '../ui/slider';
import { Toggle } from '../ui/toggle';

const blendingModes = [
  'normal',
  'multiply',
  'screen',
  'overlay',
  'darken',
  'lighten',
  'color-dodge',
  'color-burn',
  'hard-light',
  'soft-light',
  'difference',
  'exclusion',
  'hue',
  'saturation',
  'color',
  'luminosity',
] as const;

export const layerSettingsSchema = z.object({
  visible: z.boolean().default(true),
  background: z.string().default('rgba(10, 10, 10, 1)'),
  opacity: z.number().min(0).max(1).default(1),
  blendingMode: z.enum(blendingModes).default('normal'),
  freeze: z.boolean().default(true),
  showDebug: z.boolean().default(false),
});

export type LayerSettings = z.infer<typeof layerSettingsSchema>;

export type BlendingMode = LayerSettings['blendingMode'];

interface LayerSettingsProps {
  layer: LayerData;
}

const LayerSettings = ({ layer }: LayerSettingsProps) => {
  const isInternalUpdateRef = useRef(false);

  const form = useForm({
    resolver: zodResolver(layerSettingsSchema),
    defaultValues: layer.layerSettings ?? layerSettingsSchema.parse({}),
  });

  const formRef = useRef(form);
  formRef.current = form;

  // Only reset form if changes came from outside (not from this form)
  useEffect(() => {
    if (!isInternalUpdateRef.current) {
      form.reset(layer.layerSettings ?? layerSettingsSchema.parse({}));
    }
    isInternalUpdateRef.current = false;
  }, [layer.layerSettings, form]);

  // Memoized handler to prevent recreation on every render
  const createOnChangeHandler = useCallback(
    (originalOnChange: (value: any) => void) => (value: any) => {
      isInternalUpdateRef.current = true;
      originalOnChange(value);
      // Get current form values using ref
      editorControl.project.updateLayerSettings(
        layer.id,
        formRef.current.getValues(),
      );
    },
    [layer.id],
  );

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
                  }>
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
                  ariaLabel="Opacity"
                  value={field.value}
                  onChange={createOnChangeHandler(field.onChange)}
                  onGestureStart={() =>
                    editorControl.project.beginLayerPropertyGesture(layer.id, [
                      'opacity',
                    ])
                  }
                  onTransientChange={(value) => {
                    editorControl.project.updateLiveLayerProperty(
                      layer.id,
                      ['opacity'],
                      value,
                    );
                  }}
                  onCommit={(value) => {
                    isInternalUpdateRef.current = true;
                    field.onChange(value);
                    editorControl.project.commitLayerPropertyGesture(
                      layer.id,
                      ['opacity'],
                      value,
                    );
                  }}
                  onGestureCancel={() => {
                    editorControl.project.cancelLayerPropertyGesture(layer.id, [
                      'opacity',
                    ]);
                  }}
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
                  onGestureStart={() =>
                    editorControl.project.beginLayerPropertyGesture(layer.id, [
                      'background',
                    ])
                  }
                  onTransientChange={(value) => {
                    editorControl.project.updateLiveLayerProperty(
                      layer.id,
                      ['background'],
                      value,
                    );
                  }}
                  onCommit={(value) => {
                    isInternalUpdateRef.current = true;
                    field.onChange(value);
                    editorControl.project.commitLayerPropertyGesture(
                      layer.id,
                      ['background'],
                      value,
                    );
                  }}
                  onGestureCancel={() => {
                    editorControl.project.cancelLayerPropertyGesture(layer.id, [
                      'background',
                    ]);
                  }}
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

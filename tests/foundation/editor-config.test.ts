import { ButtonConfigOption, ConfigParam, v } from '@/components/config/config';
import { VType } from '@/components/config/types';
import { describe, expect, it, vi } from 'vitest';

const input = {
  audioSignal: new Uint8Array(),
  time: 0,
};

describe('editor config', () => {
  it('preserves value, validation, and animation semantics for every parameter kind', () => {
    const settings = [
      [v.number({ label: 'Number', defaultValue: 2, min: 1, max: 3 }), 3],
      [v.color({ label: 'Color', defaultValue: '#fff' }), 'red'],
      [v.text({ label: 'Text', defaultValue: 'hello' }), 'world'],
      [v.toggle({ label: 'Toggle', defaultValue: false }), true],
      [
        v.select({
          label: 'Select',
          defaultValue: 'one',
          options: ['one', 'two'],
        }),
        'two',
      ],
      [
        v.file({
          label: 'File',
          defaultValue: '',
          allowedExtensions: ['.glb'],
        }),
        'asset:model',
      ],
      [
        v.vector3({
          label: 'Vector',
          defaultValue: { x: 0, y: 1, z: 2 },
        }),
        { x: 3, y: 4, z: 5 },
      ],
      [
        v.list({
          label: 'List',
          defaultValue: [1],
          itemConfig: v.number({
            label: 'Item',
            defaultValue: 0,
            min: 0,
            max: 10,
          }),
        }),
        [2, 3],
      ],
    ] as const;

    for (const [setting, next] of settings) {
      setting.setValue(next);
      expect(setting.getValue(input)).toEqual(next);
      expect(setting.validate(next)).toBe(true);
    }

    expect(settings.map(([setting]) => setting.type)).toEqual([
      VType.Number,
      VType.Color,
      VType.String,
      VType.Boolean,
      VType.Select,
      VType.File,
      VType.Vector3,
      VType.List,
    ]);
    expect(settings.map(([setting]) => setting.isAnimatable)).toEqual([
      true,
      true,
      true,
      true,
      true,
      false,
      true,
      false,
    ]);
  });

  it('rejects invalid bounded, color, select, file, and list values', () => {
    expect(
      v
        .number({ label: 'Number', defaultValue: 1, min: 0, max: 2 })
        .validate(3),
    ).toBe(false);
    expect(
      v.color({ label: 'Color', defaultValue: '#fff' }).validate('wat'),
    ).toBe(false);
    expect(
      v
        .select({
          label: 'Select',
          defaultValue: 'one',
          options: ['one'],
        })
        .validate('two'),
    ).toBe(false);
    expect(
      v
        .file({
          label: 'Model',
          defaultValue: '',
          allowedExtensions: ['.glb'],
        })
        .validate('model.fbx'),
    ).toBe(false);
    expect(
      v
        .list({
          label: 'List',
          defaultValue: [],
          itemConfig: v.number({
            label: 'Item',
            defaultValue: 0,
            min: 0,
            max: 1,
          }),
        })
        .validate([0, 2]),
    ).toBe(false);
  });

  it('clones nested mutable values and grouped options independently', () => {
    const original = v.config({
      transform: v.group(
        { label: 'Transform' },
        {
          position: v.vector3({
            label: 'Position',
            defaultValue: { x: 0, y: 0, z: 0 },
          }),
        },
      ),
      values: v.list({
        label: 'Values',
        defaultValue: [1],
        itemConfig: v.number({
          label: 'Value',
          defaultValue: 0,
          min: 0,
          max: 10,
        }),
      }),
    });
    const cloned = original.clone();

    cloned.options.transform.options.position.setValue({ x: 1, y: 2, z: 3 });
    cloned.options.values.setValue([4, 5]);

    expect(original.getValues(input)).toEqual({
      transform: { position: { x: 0, y: 0, z: 0 } },
      values: [1],
    });
    expect(cloned.getValues(input)).toEqual({
      transform: { position: { x: 1, y: 2, z: 3 } },
      values: [4, 5],
    });
  });

  it('keeps buttons as null-valued editor actions', () => {
    const onPress = vi.fn();
    const action = v.button({ label: 'Reset', onPress });
    const config = v.config({ action });

    expect(action).toBeInstanceOf(ButtonConfigOption);
    expect(action).not.toBeInstanceOf(ConfigParam);
    expect(config.getValues(input)).toEqual({ action: null });
    action.onPress();
    expect(onPress).toHaveBeenCalledOnce();
  });
});

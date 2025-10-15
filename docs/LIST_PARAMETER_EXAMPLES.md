# List Parameter Examples

The `v.list()` parameter is a generic wrapper that can create a list of ANY config parameter type.

## Basic Examples

### List of Colors
```typescript
colorPalette: v.list({
  label: 'Color Palette',
  description: 'Multiple colors for gradient',
  defaultValue: ['#FF00FF', '#00FFFF', '#FFFF00'],
  itemConfig: v.color({
    label: 'Color',
    defaultValue: '#FFFFFF',
  }),
})
```

### List of Numbers
```typescript
frequencies: v.list({
  label: 'Frequency Bands',
  description: 'List of frequency cutoffs in Hz',
  defaultValue: [60, 250, 500, 2000, 4000],
  itemConfig: v.number({
    label: 'Frequency',
    defaultValue: 100,
    min: 20,
    max: 20000,
    step: 10,
  }),
})
```

### List of Files (3D Models)
```typescript
models: v.list({
  label: '3D Models',
  description: 'List of models to load',
  defaultValue: ['/models/cube.glb', '/models/sphere.glb'],
  itemConfig: v.file({
    label: 'Model File',
    defaultValue: '',
    allowedExtensions: ['.glb', '.gltf', '.fbx'],
  }),
})
```

### List of Strings
```typescript
labels: v.list({
  label: 'Text Labels',
  description: 'List of text strings to display',
  defaultValue: ['Hello', 'World'],
  itemConfig: v.text({
    label: 'Label',
    defaultValue: '',
  }),
})
```

### List of Vector3
```typescript
positions: v.list({
  label: 'Object Positions',
  description: 'List of 3D positions',
  defaultValue: [
    { x: 0, y: 0, z: 0 },
    { x: 5, y: 0, z: 0 },
  ],
  itemConfig: v.vector3({
    label: 'Position',
    defaultValue: { x: 0, y: 0, z: 0 },
    min: -100,
    max: 100,
  }),
})
```

## Advanced Examples

### List of Groups (Complex Structures)
```typescript
particles: v.list({
  label: 'Particle Configs',
  description: 'Configure multiple particle systems',
  defaultValue: [
    { size: 1, color: '#FFFFFF', speed: 0.5 },
  ],
  itemConfig: v.group(
    {
      label: 'Particle System',
      description: 'Individual particle configuration',
    },
    {
      size: v.number({
        label: 'Size',
        defaultValue: 1,
        min: 0.1,
        max: 10,
      }),
      color: v.color({
        label: 'Color',
        defaultValue: '#FFFFFF',
      }),
      speed: v.number({
        label: 'Speed',
        defaultValue: 1,
        min: 0,
        max: 5,
      }),
    }
  ),
})
```

## Benefits

1. **Fully Generic**: Works with ANY config parameter type
2. **Consistent UI**: Each item uses the same editor as the standalone parameter
3. **Type-Safe**: Full TypeScript inference for list items
4. **Validation**: Inherits validation from the item config
5. **Extensible**: New parameter types automatically work with lists
6. **Clean API**: Single `v.list()` function for all list types


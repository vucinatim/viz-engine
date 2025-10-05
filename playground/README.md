# How to Get Models to Work from Mixamo

## Import to Blender

1. **Combine mesh parts**: Press `CTRL+J`

2. **Add Decimate modifier**: 
   - Set to `0.1`
   - Click the arrow down
   - Click **Apply**

## Export to FBX

Go to **File > Export > FBX (.fbx)** and configure the panel on the right with these options:

### Main
- **Selected Objects**: ✅ Check this to only export what you have selected
- **Object Types**: Select **Armature** and **Mesh** (and others if you have them)

### Transform
- **Forward**: `-Z Forward`
- **Up**: `Y Up` (This is the standard for Three.js)
- **Apply Scalings**: `FBX All`

### Armature
- **Only Deform Bones**: ✅ Check this. It prevents exporting extra control bones from your rig that aren't needed for the animation
- **Add Leaf Bones**: ❌ Uncheck this. It can add unnecessary bones and complicate the skeleton hierarchy

### Bake Animation 🔥
*This is the most important part!*

- **Bake Animation**: ✅ Check the main "Bake Animation" box
- **NLA Strips**: ✅ Check this
- **All Actions**: ✅ Check this
- **Force Start/End Keying**: ❌ Uncheck this
- **Step**: `1.0` (This bakes a keyframe on every frame)
- **Simplify**: `0.0` (Do not simplify the animation, as it can remove detail)
# Sample Projects

This folder contains sample VizEngine projects that appear in the **Sample Projects** dropdown in the application.

## How to Add Sample Projects

1. Export a project from the VizEngine editor (File → Save As...)
2. The exported file will have the extension `.vizengine.json`
3. Copy the exported file to this folder (`/public/projects/`)
4. Restart the dev server (if running)
5. The project will now appear in the **Sample Projects** menu in the editor

## File Naming

The filename (without `.vizengine.json`) will be used as the display name in the dropdown.

For example:
- `my-awesome-visualization.vizengine.json` → Shows as "my-awesome-visualization"
- `Bass-Heavy-Show.vizengine.json` → Shows as "Bass-Heavy-Show"

## Tips

- Use descriptive names for your sample projects
- Keep file sizes reasonable (avoid very large projects with many layers)
- Test your sample projects before committing them to ensure they load correctly


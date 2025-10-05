# Documentation Generation

This folder contains scripts and tools for automatically generating project documentation.

## Scripts

### Main Documentation Generator
```bash
pnpm docs
```
This runs the complete documentation generation process:
1. Dumps all project files
2. Creates a tree structure
3. Generates markdown documentation
4. Cleans up temporary files

### Individual Scripts

#### Dump Files
```bash
pnpm docs:dump
```
Lists all files in the project and saves them to `docs/all-files.txt`

#### Create Tree Structure
```bash
pnpm docs:tree
```
Converts the file list into a tree structure and generates `docs/PROJECT_STRUCTURE.md`

## Generated Files

- `PROJECT_STRUCTURE.md` - Complete project file tree with documentation
- `all-files.txt` - Temporary file with all project files (auto-deleted)

## Scripts Location

All scripts are located in the `docs/scripts/` folder:
- `dump-files.ts` - File discovery script (TypeScript)
- `create-tree.ts` - Tree structure generator (TypeScript)
- `generate-docs.ts` - Main orchestrator script (TypeScript)

## Usage

To regenerate the project structure documentation:

```bash
pnpm docs
```

This will create an up-to-date `PROJECT_STRUCTURE.md` file with the current state of your project.

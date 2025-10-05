import fs from 'fs';
import path from 'path';

interface TreeNode {
  [key: string]: TreeNode | null;
}

function createTreeStructure(fileList: string[]): TreeNode {
  const tree: TreeNode = {};

  fileList.forEach((filePath) => {
    const parts = filePath.split('/');
    let current = tree;

    parts.forEach((part, index) => {
      if (index === parts.length - 1) {
        // This is a file
        current[part] = null;
      } else {
        // This is a directory
        if (!current[part]) {
          current[part] = {};
        }
        current = current[part] as TreeNode;
      }
    });
  });

  return tree;
}

function formatTree(tree: TreeNode, indent: number = 0): string[] {
  const lines: string[] = [];
  const spaces = '  '.repeat(indent);

  Object.keys(tree)
    .sort()
    .forEach((key) => {
      if (tree[key] === null) {
        // File
        lines.push(`${spaces}├── ${key}`);
      } else {
        // Directory
        lines.push(`${spaces}├── ${key}/`);
        const subLines = formatTree(tree[key] as TreeNode, indent + 1);
        lines.push(...subLines);
      }
    });

  return lines;
}

// Read the file list from docs directory
const fileListPath = path.join(__dirname, '../all-files.txt');
const fileList = fs
  .readFileSync(fileListPath, 'utf8')
  .split('\n')
  .filter((line) => line.trim());

// Create tree structure
const tree = createTreeStructure(fileList);

// Format the tree
const treeLines = formatTree(tree);

// Create the README content
const readmeContent = `# Viz Engine - Project Structure

This document provides a complete overview of the project's file structure.

## File Tree

\`\`\`
${treeLines.join('\n')}
\`\`\`

## Summary

- **Total Files**: ${fileList.length}
- **Main Application**: Next.js app in \`src/\`
- **Playground**: Standalone Three.js playground in \`playground/\`
- **Documentation**: Project docs in \`docs/\`
- **Configuration**: Various config files in root directory

## Key Directories

- \`src/app/\` - Next.js app pages and layout
- \`src/components/\` - React components organized by feature
- \`src/lib/\` - Utility functions, hooks, stores, and types
- \`playground/src/\` - Three.js playground with scene components
- \`public/music/\` - Audio files for testing
- \`docs/\` - Project documentation

## Component Organization

- \`audio/\` - Audio-related components (file loader, panel, capture, etc.)
- \`comps/\` - Visualization components (spectrum, cubes, shapes, etc.)
- \`config/\` - Configuration and form components
- \`editor/\` - Main editor interface components
- \`node-network/\` - Node-based animation system
- \`ui/\` - Reusable UI components (shadcn/ui based)

## Libraries and Utilities

- \`hooks/\` - Custom React hooks
- \`stores/\` - Zustand state management stores
- \`types/\` - TypeScript type definitions
- \`comp-utils/\` - Component utility functions
- \`theme/\` - Audio visualization themes
`;

// Write to docs directory
const outputPath = path.join(__dirname, '../PROJECT_STRUCTURE.md');
fs.writeFileSync(outputPath, readmeContent);

console.log('Project structure has been written to docs/PROJECT_STRUCTURE.md');

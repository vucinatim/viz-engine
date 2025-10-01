import fs from 'fs';
import path from 'path';

function getAllFiles(
  dirPath: string,
  arrayOfFiles: string[] = [],
  basePath: string = '',
): string[] {
  const files = fs.readdirSync(dirPath);

  files.forEach((file) => {
    const fullPath = path.join(dirPath, file);
    const relativePath = path.join(basePath, file);

    if (fs.statSync(fullPath).isDirectory()) {
      // Skip node_modules and other common directories we don't want to include
      if (
        file !== 'node_modules' &&
        file !== '.git' &&
        file !== '.next' &&
        file !== 'dist' &&
        file !== 'build'
      ) {
        arrayOfFiles = getAllFiles(fullPath, arrayOfFiles, relativePath);
      }
    } else {
      arrayOfFiles.push(relativePath);
    }
  });

  return arrayOfFiles;
}

// Get all files from the project root (two levels up from docs/scripts)
const projectRoot = path.join(__dirname, '../../');
const allFiles = getAllFiles(projectRoot);

// Write to a file in the docs directory
const outputPath = path.join(__dirname, '../all-files.txt');
fs.writeFileSync(outputPath, allFiles.join('\n'));

console.log(
  `Found ${allFiles.length} files. Check docs/all-files.txt for the complete list.`,
);

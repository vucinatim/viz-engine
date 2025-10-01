import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('🚀 Starting documentation generation...\n');

try {
  // Step 1: Dump all files
  console.log('📁 Step 1: Dumping all project files...');
  execSync('pnpm tsx docs/scripts/dump-files.ts', { stdio: 'inherit' });
  console.log('✅ File dump completed\n');

  // Step 2: Create tree structure
  console.log('🌳 Step 2: Creating project tree structure...');
  execSync('pnpm tsx docs/scripts/create-tree.ts', { stdio: 'inherit' });
  console.log('✅ Tree structure completed\n');

  // Step 3: Clean up temporary files
  console.log('🧹 Step 3: Cleaning up temporary files...');
  const tempFile = path.join(__dirname, '../all-files.txt');
  if (fs.existsSync(tempFile)) {
    fs.unlinkSync(tempFile);
    console.log('✅ Temporary files cleaned up\n');
  }

  console.log('🎉 Documentation generation completed successfully!');
  console.log('📄 Generated files:');
  console.log('   - docs/PROJECT_STRUCTURE.md');
} catch (error) {
  console.error(
    '❌ Error during documentation generation:',
    (error as Error).message,
  );
  process.exit(1);
}

import fs from 'fs';
import { NextResponse } from 'next/server';
import path from 'path';

export async function GET() {
  try {
    const projectsDir = path.join(process.cwd(), 'public', 'projects');

    // Check if directory exists
    if (!fs.existsSync(projectsDir)) {
      return NextResponse.json([]);
    }

    // Read all .vizengine.json files from the directory
    const files = fs.readdirSync(projectsDir);
    const projectFiles = files
      .filter((file) => file.endsWith('.vizengine.json'))
      .map((file) => ({
        name: file.replace('.vizengine.json', ''),
        filename: file,
        url: `/projects/${file}`,
      }));

    return NextResponse.json(projectFiles);
  } catch (error) {
    console.error('Error listing sample projects:', error);
    return NextResponse.json([]);
  }
}

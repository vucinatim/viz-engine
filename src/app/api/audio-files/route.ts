import fs from 'fs';
import { NextResponse } from 'next/server';
import path from 'path';

// This will be executed at build time and cached
export const dynamic = 'force-static';

export async function GET() {
  try {
    const musicDir = path.join(process.cwd(), 'public', 'music');

    // Check if directory exists
    if (!fs.existsSync(musicDir)) {
      return NextResponse.json([]);
    }

    const filenames = fs
      .readdirSync(musicDir)
      // filter out all files except mp3, wav, and ogg
      .filter((file) => /\.(mp3|wav|ogg)$/.test(file))
      .sort(); // Sort alphabetically for consistency

    return NextResponse.json(filenames);
  } catch (error) {
    console.error('Error reading audio files:', error);
    return NextResponse.json([]);
  }
}

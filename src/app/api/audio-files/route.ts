import { NextResponse } from 'next/server';
import { getBundledAudioFiles } from '@/lib/server/bundled-audio';

// This will be executed at build time and cached
export const dynamic = 'force-static';

export async function GET() {
  try {
    return NextResponse.json(getBundledAudioFiles());
  } catch (error) {
    console.error('Error reading audio files:', error);
    return NextResponse.json([]);
  }
}

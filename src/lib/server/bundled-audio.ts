import fs from 'fs';
import path from 'path';

export const getBundledAudioFiles = (): string[] => {
  try {
    const musicDirectory = path.join(process.cwd(), 'public', 'music');

    if (!fs.existsSync(musicDirectory)) {
      return [];
    }

    return fs
      .readdirSync(musicDirectory)
      .filter((file) => /\.(mp3|wav|ogg)$/.test(file))
      .sort();
  } catch (error) {
    console.error('Failed to read bundled audio files.', error);
    return [];
  }
};

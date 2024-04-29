"use server";

import fs from "fs";
import path from "path";

// Server action to get all audio files in the music directory
export default async function AudioFilesServer() {
  const musicDir = path.join(process.cwd(), "public", "music");
  const filenames = fs
    .readdirSync(musicDir)
    // filter out all files except mp3, wav, and ogg
    .filter((file) => /\.(mp3|wav|ogg)$/.test(file));

  return filenames;
}

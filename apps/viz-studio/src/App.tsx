import { useEffect } from "react";

import { bundledAudioTracks } from "./bundled-audio-tracks";
import { V2EditorShell } from "./v2-editor-shell";

export function App() {
  useEffect(() => {
    document.documentElement.lang = "en";
    document.documentElement.classList.add("dark");
    document.body.classList.add("min-h-screen", "bg-background", "text-foreground");

    return () => {
      document.body.classList.remove("min-h-screen", "bg-background", "text-foreground");
    };
  }, []);

  return (
    <main className="relative h-screen w-screen overflow-hidden">
      <V2EditorShell bundledTracks={bundledAudioTracks} />
    </main>
  );
}

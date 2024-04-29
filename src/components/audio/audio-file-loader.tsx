import AudioFilesServer from "@/app/audio-files.server";
import useAudioStore from "@/lib/stores/audio-store";
import { AlertCircle, Folder, Music } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import SearchSelect from "../ui/search-select";
import TickerText from "../ui/ticker-text";
import { Button } from "../ui/button";
import { useDropzone } from "react-dropzone";
import { cn } from "@/lib/utils";
import useSetBodyProps from "@/lib/hooks/use-set-body-props";

export const DROPZONE_ACCEPTED_TYPES = {
  "audio/*": [".mp3", ".wav", ".ogg"],
};

const AudioFileLoader = () => {
  const [audioFiles, setAudioFiles] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const { wavesurfer, setAudioFile } = useAudioStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        const objectUrl = URL.createObjectURL(acceptedFiles[0]);
        wavesurfer?.load(objectUrl);
        setAudioFile(acceptedFiles[0]);
        setSelectedFile(acceptedFiles[0].name);
      }
    },
    [setAudioFile, wavesurfer]
  );
  const { getRootProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: DROPZONE_ACCEPTED_TYPES,
    noClick: true,
    maxFiles: 1,
  });
  useSetBodyProps(getRootProps());

  useEffect(() => {
    AudioFilesServer().then((files) => {
      setAudioFiles(files);
      if (files.length > 0) {
        setSelectedFile(files[0]);
        wavesurfer?.load(`/music/${files[0]}`);
      }
    });
  }, [wavesurfer]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const objectUrl = URL.createObjectURL(file);
      wavesurfer?.load(objectUrl);
      setAudioFile(file);
    }
  };

  return (
    <div className="flex items-center gap-x-2">
      <div
        className={cn(
          "absolute inset-0 flex flex-col gap-y-2 items-center pointer-events-none justify-center bg-white/20 backdrop-blur-sm z-50 opacity-0 transition-opacity",
          isDragActive && "opacity-1",
          isDragReject && "bg-rose-500/20 opacity-1"
        )}
      >
        <div>{isDragReject ? <AlertCircle /> : <Music />}</div>
        <p>{isDragReject ? "File type not supported" : "Load audio file"}</p>
      </div>
      <Button
        size="icon"
        variant="outline"
        className="p-2 bg-black/10 hover:bg-black/20"
        onClick={() => fileInputRef?.current?.click()}
      >
        <Folder className="w-6 h-6" />
      </Button>
      <SearchSelect
        trigger={
          <TickerText
            leadingIcon={<Music />}
            text={selectedFile || "Load File"}
          />
        }
        options={audioFiles}
        extractKey={(filename) => filename}
        renderOption={(filename) => <div className="truncate">{filename}</div>}
        noItemsMessage="No audio files found."
        placeholder="Search audio files..."
        onSelect={(filename) => {
          const objectUrl = `/music/${filename}`;
          setSelectedFile(filename);
          wavesurfer?.load(objectUrl);
        }}
      />
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="audio/*"
        style={{ display: "none" }}
      />
    </div>
  );
};

export default AudioFileLoader;

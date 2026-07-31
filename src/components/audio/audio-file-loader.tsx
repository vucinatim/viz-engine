import editorControl from '@/lib/editor-control';
import useSetBodyProps from '@/lib/hooks/use-set-body-props';
import { getBundledAudioFiles } from '@/lib/public-manifests';
import { cn } from '@/lib/utils';
import { getVizSessionState, useVizSessionSelector } from '@/lib/viz-session';
import { AlertCircle, Folder, Music } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '../ui/button';
import SearchSelect from '../ui/search-select';
import TickerText from '../ui/ticker-text';

// const DEFAULT_AUDIO_FILE = 'Outsiders (feat. Charlotte Haining).mp3';
const DEFAULT_AUDIO_FILE = '[HipHop] 808 Rap.mp3';

const DROPZONE_ACCEPTED_TYPES = {
  'audio/*': ['.mp3', '.wav', '.ogg'],
};

const AudioFileLoader = () => {
  const currentTrackIndex = useVizSessionSelector(
    (state) => state.audio.currentTrackIndex,
  );
  const trackList = useVizSessionSelector((state) => state.audio.trackList);
  const sessionSource = useVizSessionSelector(
    (state) => state.audio.session.source,
  );

  const [audioFiles, setAudioFiles] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const objectUrl = URL.createObjectURL(acceptedFiles[0]);
      editorControl.audio.attachLocalFile(acceptedFiles[0], objectUrl);
      setSelectedFile(acceptedFiles[0].name);
    }
  }, []);
  const { getRootProps, isDragActive, isDragReject, fileRejections } =
    useDropzone({
      onDrop,
      accept: DROPZONE_ACCEPTED_TYPES,
      noClick: true,
      noKeyboard: true,
      maxFiles: 1,
      useFsAccessApi: false,
    });
  useSetBodyProps(getRootProps());

  useEffect(() => {
    const files = getBundledAudioFiles();
    setAudioFiles(files);
    editorControl.audio.setTrackList(files);
    const activeSource = getVizSessionState().audio.session.source;
    if (activeSource) {
      setSelectedFile(activeSource.label ?? activeSource.id);
      return;
    }
    if (files.length > 0) {
      const defaultFile =
        files.find((f) => f === DEFAULT_AUDIO_FILE) || files[0];
      const defaultIndex = files.indexOf(defaultFile);
      setSelectedFile(defaultFile);
      editorControl.audio.attachBundledTrack(defaultFile, defaultIndex);
    }
  }, []);

  // Sync selected file with current track index from store (e.g., when skip buttons are used)
  useEffect(() => {
    if (trackList.length > 0 && currentTrackIndex >= 0) {
      const currentTrack = trackList[currentTrackIndex];
      if (currentTrack) {
        setSelectedFile(currentTrack);
      }
      return;
    }
    setSelectedFile(sessionSource?.label ?? sessionSource?.id ?? null);
  }, [currentTrackIndex, sessionSource, trackList]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const objectUrl = URL.createObjectURL(file);
      editorControl.audio.attachLocalFile(file, objectUrl);
    }
  };

  const isAudioReject = useMemo(
    () => fileRejections.some((rejection) => rejection.file.type === 'audio/*'),
    [fileRejections],
  );

  return (
    <div className="flex items-center gap-x-2">
      <div
        className={cn(
          'pointer-events-none absolute inset-0 z-50 flex flex-col items-center justify-center gap-y-2 bg-white/20 opacity-0 backdrop-blur-sm transition-opacity',
          isDragActive && 'opacity-1',
          isDragReject && !isAudioReject && 'opacity-0',
          isAudioReject && 'bg-rose-500/20 opacity-1',
        )}>
        <div>{isAudioReject ? <AlertCircle /> : <Music />}</div>
        <p>{isAudioReject ? 'File type not supported' : 'Load audio file'}</p>
      </div>
      <Button
        size="icon"
        onClick={() => fileInputRef?.current?.click()}
        tooltip="Load audio file">
        <Folder className="h-6 w-6" />
      </Button>
      <SearchSelect
        trigger={
          <TickerText
            leadingIcon={<Music />}
            text={selectedFile || 'Load File'}
          />
        }
        options={audioFiles}
        extractKey={(filename) => filename}
        renderOption={(filename) => <div className="truncate">{filename}</div>}
        noItemsMessage="No audio files found."
        placeholder="Search audio files..."
        onSelect={(filename) => {
          const trackIndex = audioFiles.indexOf(filename);
          setSelectedFile(filename);
          editorControl.audio.attachBundledTrack(filename, trackIndex);
        }}
      />
      <input
        name="audio-file"
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="audio/*"
        style={{ display: 'none' }}
      />
    </div>
  );
};

export default AudioFileLoader;

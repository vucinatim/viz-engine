import editorControl from '@/lib/editor-control';
import useSetBodyProps from '@/lib/hooks/use-set-body-props';
import { getBundledAudioFiles } from '@/lib/public-manifests';
import useAudioEngineStore from '@/lib/stores/audio-engine-store';
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
  const projectInitialized = useVizSessionSelector(
    (state) => state.project.initialized,
  );
  const sourceLoad = useAudioEngineStore((state) => state.sourceLoad);

  const [audioFiles, setAudioFiles] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const initializedDefaultRef = useRef(false);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const objectUrl = URL.createObjectURL(acceptedFiles[0]);
      await editorControl.audio.attachLocalFile(acceptedFiles[0], objectUrl);
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
  }, []);

  useEffect(() => {
    if (
      !projectInitialized ||
      initializedDefaultRef.current ||
      audioFiles.length === 0
    ) {
      return;
    }
    initializedDefaultRef.current = true;

    const activeSource = getVizSessionState().audio.session.source;
    if (activeSource) {
      setSelectedFile(activeSource.label ?? activeSource.id);
      return;
    }

    const defaultFile =
      audioFiles.find((file) => file === DEFAULT_AUDIO_FILE) || audioFiles[0];
    const defaultIndex = audioFiles.indexOf(defaultFile);
    setSelectedFile(defaultFile);
    void editorControl.audio.attachBundledTrack(defaultFile, defaultIndex);
  }, [audioFiles, projectInitialized]);

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

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      const objectUrl = URL.createObjectURL(file);
      await editorControl.audio.attachLocalFile(file, objectUrl);
    }
    event.target.value = '';
  };

  const isAudioReject = useMemo(
    () => fileRejections.length > 0,
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
          void editorControl.audio.attachBundledTrack(filename, trackIndex);
        }}
      />
      {sourceLoad.status === 'loading' && (
        <span className="text-xs text-white/60" role="status">
          Loading {sourceLoad.label}…
        </span>
      )}
      {sourceLoad.status === 'error' && (
        <span className="max-w-60 text-xs text-rose-300" role="alert">
          {sourceLoad.message}
        </span>
      )}
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

import AudioFilesServer from '@/app/audio-files.server';
import useSetBodyProps from '@/lib/hooks/use-set-body-props';
import useAudioStore from '@/lib/stores/audio-store';
import { cn } from '@/lib/utils';
import { AlertCircle, Folder, Music } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '../ui/button';
import SearchSelect from '../ui/search-select';
import TickerText from '../ui/ticker-text';

export const DROPZONE_ACCEPTED_TYPES = {
  'audio/*': ['.mp3', '.wav', '.ogg'],
};

const AudioFileLoader = () => {
  const [audioFiles, setAudioFiles] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const { wavesurfer, setAudioFile, audioElementRef, setCurrentTrackUrl } =
    useAudioStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        const objectUrl = URL.createObjectURL(acceptedFiles[0]);
        if (audioElementRef.current) {
          audioElementRef.current.srcObject = null as any;
          audioElementRef.current.src = objectUrl;
          audioElementRef.current.muted = false;
          audioElementRef.current.load();
        }
        wavesurfer?.load(objectUrl);
        setCurrentTrackUrl(objectUrl);
        setAudioFile(acceptedFiles[0]);
        setSelectedFile(acceptedFiles[0].name);
      }
    },
    [audioElementRef, setAudioFile, setCurrentTrackUrl, wavesurfer],
  );
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
    AudioFilesServer().then((files) => {
      setAudioFiles(files);
      if (files.length > 0) {
        setSelectedFile(files[0]);
        const url = `/music/${files[0]}`;
        if (audioElementRef.current) {
          audioElementRef.current.srcObject = null as any;
          audioElementRef.current.src = url;
          audioElementRef.current.muted = false;
          audioElementRef.current.load();
        }
        wavesurfer?.load(url);
        setCurrentTrackUrl(url);
      }
    });
  }, [audioElementRef, setCurrentTrackUrl, wavesurfer]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const objectUrl = URL.createObjectURL(file);
      if (audioElementRef.current) {
        audioElementRef.current.srcObject = null as any;
        audioElementRef.current.src = objectUrl;
        audioElementRef.current.muted = false;
        audioElementRef.current.load();
      }
      wavesurfer?.load(objectUrl);
      setCurrentTrackUrl(objectUrl);
      setAudioFile(file);
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
          isAudioReject && 'opacity-1 bg-rose-500/20',
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
          const objectUrl = `/music/${filename}`;
          if (audioElementRef.current) {
            audioElementRef.current.srcObject = null as any;
            audioElementRef.current.src = objectUrl;
            audioElementRef.current.muted = false;
            audioElementRef.current.load();
          }
          setSelectedFile(filename);
          wavesurfer?.load(objectUrl);
          setCurrentTrackUrl(objectUrl);
        }}
      />
      <input
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

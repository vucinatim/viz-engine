import useAudioStore from "@/lib/stores/audio-store";

const AudioFileLoader = () => {
  const { setAudioFile } = useAudioStore();
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setAudioFile(file);
    }
  };

  return <input type="file" onChange={handleFileChange} accept="audio/*" />;
};

export default AudioFileLoader;

import useLayerStore from "@/lib/stores/layer-store";
import Image from "next/image";
import LayerMirrorCanvas from "./layer-mirror-canvas";
import useEditorStore from "@/lib/stores/editor-store";

const AmbientBackground = () => {
  const { layers } = useLayerStore();
  const { ambientMode } = useEditorStore();

  return (
    <div>
      {/* <Image src="/logo.png" alt={"bg"} layout="fill" objectFit="cover" /> */}
      {ambientMode && (
        <div className="absolute inset-0">
          {layers.map((layer) => (
            <LayerMirrorCanvas key={layer.id} layer={layer} />
          ))}
        </div>
      )}
      <div className="absolute inset-0 backdrop-blur-2xl bg-zinc-900/60" />
    </div>
  );
};

export default AmbientBackground;

import useLayerStore, { LayerData } from "@/lib/stores/layer-store";
import LayerMirrorCanvas from "./layer-mirror-canvas";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface LayerPreviewProps {
  layer: LayerData;
}

const LayerPreview = ({ layer }: LayerPreviewProps) => {
  const { updateLayerSettings } = useLayerStore();

  return (
    <div className="group cursor-pointer relative shrink-0 h-full aspect-video rounded-md overflow-hidden">
      {layer.layerSettings.visible && <LayerMirrorCanvas layer={layer} />}
      <div
        onMouseDown={() =>
          updateLayerSettings(layer.id, {
            ...layer.layerSettings,
            visible: !layer.layerSettings.visible,
          })
        }
        className={cn(
          "bg-zinc-500/20 transition-opacity absolute inset-0",
          layer.layerSettings.visible
            ? "opacity-0 group-hover:opacity-100"
            : "opacity-100 group-hover:opacity-50"
        )}
      >
        <div
          className={cn(
            "absolute inset-0 flex items-center justify-center",
            layer.layerSettings.visible
              ? "opacity-0 group-hover:opacity-100"
              : "opacity-100 group-hover:opacity-0"
          )}
        >
          <EyeOff className="w-5 h-5 text-zinc-500" />
        </div>
        <div
          className={cn(
            "absolute inset-0 flex items-center justify-center opacity-0",
            !layer.layerSettings.visible && "opacity-0 group-hover:opacity-100"
          )}
        >
          <Eye className="w-5 h-5 text-zinc-500" />
        </div>
      </div>
    </div>
  );
};

export default LayerPreview;

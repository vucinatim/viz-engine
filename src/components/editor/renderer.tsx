import useLayerStore from "@/lib/stores/layer-store";
import LayerRenderer from "./layer-renderer";

const Renderer = () => {
  const { layers } = useLayerStore();

  return (
    <div className="absolute inset-0 flex items-center justify-center">
      {layers.map((layer) => (
        <LayerRenderer key={layer.id} layer={layer} />
      ))}
    </div>
  );
};

export default Renderer;

import Image from "next/image";
import EditorToolbar from "./editor-toolbar";
import { Label } from "../ui/label";
import { Switch } from "../ui/switch";
import useEditorStore from "@/lib/stores/editor-store";
import { cn } from "@/lib/utils";

const EditorHeader = () => {
  const { ambientMode, setAmbientMode } = useEditorStore();
  return (
    <div className="px-4 flex items-center">
      <Image
        src="/logo.png"
        alt="VizEngineLogo"
        className="mr-2"
        priority
        width={25}
        height={25}
        style={{
          width: "auto",
          height: "auto",
        }}
      />
      <div className="grow">
        <EditorToolbar />
      </div>
      <div className="flex items-center gap-x-4">
        <Label
          htmlFor="airplane-mode"
          className={cn(
            "text-white/20 transition-colors",
            ambientMode && "text-white"
          )}
        >
          Ambient Mode
        </Label>
        <Switch
          id="airplane-mode"
          className="border-white/5 border"
          checked={ambientMode}
          onCheckedChange={setAmbientMode}
        />
      </div>
    </div>
  );
};

export default EditorHeader;

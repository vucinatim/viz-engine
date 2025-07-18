import { Button } from '@/components/ui/button';
import { ColorPickerPopover } from '@/components/ui/color-picker';
import { Input } from '@/components/ui/input';
import { X } from 'lucide-react';
import { useRef } from 'react';
import { GraphNodeData, useNodeNetwork } from './node-network-store';

interface ValueMapperBodyProps {
  id: string;
  data: GraphNodeData;
  selected: boolean;
  nodeNetworkId: string;
}

const defaultColor = '#ffffff';

const ValueMapperBody = ({
  id: nodeId,
  data,
  nodeNetworkId,
}: ValueMapperBodyProps) => {
  const { updateInputValue } = useNodeNetwork(nodeNetworkId);
  const mapping = data.inputValues.mapping || {};
  const inputRef = useRef<HTMLInputElement>(null);

  const handleAdd = () => {
    const input = inputRef.current?.value?.trim();
    if (!input || mapping[input]) return;
    const newMapping = { ...mapping, [input]: defaultColor };
    updateInputValue(nodeId, 'mapping', newMapping);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleRemove = (key: string) => {
    const newMapping = { ...mapping };
    delete newMapping[key];
    updateInputValue(nodeId, 'mapping', newMapping);
  };

  const handleColorChange = (key: string, color: string) => {
    const newMapping = { ...mapping, [key]: color };
    updateInputValue(nodeId, 'mapping', newMapping);
  };

  return (
    <div className="flex min-w-[200px] flex-col gap-2">
      <div className="flex items-center gap-2">
        <Input ref={inputRef} placeholder="Note (e.g. C2)" className="flex-1" />
        <Button type="button" size="sm" onClick={handleAdd}>
          Add
        </Button>
      </div>
      <div className="flex flex-col gap-1">
        {Object.entries(mapping).map(([key, color]) => (
          <div key={key} className="flex items-center gap-2">
            <span className="w-12 text-xs">{key}</span>
            <ColorPickerPopover
              value={color as string}
              onChange={(c) => handleColorChange(key, c)}
            />
            <Button
              type="button"
              size="iconMini"
              variant="ghost"
              className="shrink-0"
              onClick={() => handleRemove(key)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ValueMapperBody;

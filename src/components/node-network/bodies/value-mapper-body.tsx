import { Button } from '@/components/ui/button';
import { ColorPickerPopover } from '@/components/ui/color-picker';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { X } from 'lucide-react';
import { useRef } from 'react';
import { GraphNodeData, useNodeNetwork } from '../node-network-store';

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
  const mode = (data.inputValues.mode || 'number') as string;
  const inputKeyRef = useRef<HTMLInputElement>(null);
  const inputValueRef = useRef<HTMLInputElement>(null);

  const handleAdd = () => {
    const key = inputKeyRef.current?.value?.trim();
    if (!key || mapping[key]) return;

    let defaultValue: any;
    switch (mode) {
      case 'color':
        defaultValue = defaultColor;
        break;
      case 'number':
        defaultValue = '0';
        break;
      case 'string':
      default:
        defaultValue = '';
        break;
    }

    const newMapping = { ...mapping, [key]: defaultValue };
    updateInputValue(nodeId, 'mapping', newMapping);
    if (inputKeyRef.current) inputKeyRef.current.value = '';
  };

  const handleRemove = (key: string) => {
    const newMapping = { ...mapping };
    delete newMapping[key];
    updateInputValue(nodeId, 'mapping', newMapping);
  };

  const handleValueChange = (key: string, value: any) => {
    const newMapping = { ...mapping, [key]: value };
    updateInputValue(nodeId, 'mapping', newMapping);
  };

  const handleModeChange = (newMode: string) => {
    updateInputValue(nodeId, 'mode', newMode);
  };

  const renderValueInput = (key: string, value: any) => {
    switch (mode) {
      case 'color':
        return (
          <ColorPickerPopover
            value={value as string}
            onChange={(c) => handleValueChange(key, c)}
          />
        );
      case 'number':
      case 'string':
      default:
        return (
          <Input
            type="text"
            value={value as string}
            onChange={(e) => handleValueChange(key, e.target.value)}
            className="h-7 w-24 text-xs"
            placeholder={mode === 'number' ? '0' : 'Value'}
          />
        );
    }
  };

  return (
    <div className="flex min-w-[220px] flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="text-xs text-zinc-400">Mode:</span>
        <Select value={mode} onValueChange={handleModeChange}>
          <SelectTrigger className="h-7 w-24 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="number">Number</SelectItem>
            <SelectItem value="string">String</SelectItem>
            <SelectItem value="color">Color</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-2">
        <Input
          ref={inputKeyRef}
          placeholder="Key (e.g. 0)"
          className="h-7 w-16 text-xs"
        />
        <Button type="button" size="sm" onClick={handleAdd} className="h-7">
          Add
        </Button>
      </div>
      <div className="flex flex-col gap-1">
        {Object.entries(mapping).map(([key, value]) => (
          <div key={key} className="flex items-center gap-2">
            <span className="w-8 text-xs text-zinc-300">{key}:</span>
            {renderValueInput(key, value)}
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

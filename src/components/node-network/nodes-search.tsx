import { useEffect, useRef } from 'react';
import { nodes } from '../config/animation-nodes';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '../ui/command';
import { useNodeNetwork } from './node-network-store';

interface NodeSearchProps {
  networkId: string;
  mousePosition: { x: number; y: number };
}

const NodesSearch = ({ networkId, mousePosition }: NodeSearchProps) => {
  const { addNode } = useNodeNetwork(networkId);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Focus the input when the component mounts
    inputRef.current?.focus();
  }, []);

  return (
    <Command>
      <CommandInput
        ref={inputRef}
        placeholder="Search nodes..."
        className="h-9"
      />
      <CommandEmpty>{'No nodes found.'}</CommandEmpty>
      <CommandList>
        <CommandGroup heading="Suggestions">
          {nodes.map((node, index) => (
            <CommandItem
              key={`${node.label}-${index}`}
              value={node.label}
              onSelect={() => {
                const nodeId = `${networkId}-node-${Date.now()}`;
                const initialInputValues = node.inputs.reduce(
                  (acc, input) => {
                    acc[input.id] = input.defaultValue;
                    return acc;
                  },
                  {} as { [key: string]: any },
                );
                addNode({
                  id: nodeId,
                  type: 'NodeRenderer',
                  position: mousePosition,
                  data: {
                    definition: node,
                    inputValues: initialInputValues,
                    state: {},
                  },
                });
              }}>
              <p>{node.label}</p>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  );
};

export default NodesSearch;

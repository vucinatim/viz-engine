import { useEffect, useRef } from 'react';
import { AnimNode, nodes } from '../config/animation-nodes';
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
}

const NodesSearch = ({ networkId }: NodeSearchProps) => {
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
                addNode({
                  id: nodeId,
                  type: 'NodeRenderer',
                  position: { x: 0, y: 0 },
                  data: node as AnimNode,
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

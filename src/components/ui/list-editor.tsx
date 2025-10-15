import { Plus, Trash2 } from 'lucide-react';
import { ReactNode } from 'react';
import { Button } from './button';

interface ListEditorProps<T> {
  value: T[];
  onChange: (value: T[]) => void;
  renderItem: (
    item: T,
    index: number,
    onChange: (newItem: T) => void,
  ) => ReactNode;
  createDefaultItem: () => T;
  itemLabel?: string;
}

export function ListEditor<T>({
  value,
  onChange,
  renderItem,
  createDefaultItem,
  itemLabel = 'Item',
}: ListEditorProps<T>) {
  // Ensure value is always an array
  const safeValue = Array.isArray(value) ? value : [];

  const addItem = () => {
    onChange([...safeValue, createDefaultItem()]);
  };

  const removeItem = (index: number) => {
    onChange(safeValue.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, newItem: T) => {
    const newValue = [...safeValue];
    newValue[index] = newItem;
    onChange(newValue);
  };

  return (
    <div className="flex flex-col gap-2">
      {safeValue.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          <div className="flex-1">
            {renderItem(item, index, (newItem) => updateItem(index, newItem))}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={() => removeItem(index)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full"
        onClick={addItem}>
        <Plus className="mr-2 h-4 w-4" />
        Add {itemLabel}
      </Button>
    </div>
  );
}

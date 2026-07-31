import { Input } from '@/components/ui/input';
import { useEffect, useId, useRef, useState } from 'react';

interface NodeLiteralInputProps {
  kind: 'number' | 'string';
  value: unknown;
  className: string;
  placeholder?: string;
  onBegin: () => void;
  onTransientChange: (value: string | number) => void;
  onCommit: () => void;
  onCancel: () => void;
}

const NodeLiteralInput = ({
  kind,
  value,
  className,
  placeholder,
  onBegin,
  onTransientChange,
  onCommit,
  onCancel,
}: NodeLiteralInputProps) => {
  const inputId = useId();
  const canonicalText = value === undefined ? '' : String(value);
  const [text, setText] = useState(canonicalText);
  const editingRef = useRef(false);

  useEffect(() => {
    if (!editingRef.current) {
      setText(canonicalText);
    }
  }, [canonicalText]);

  const cancel = () => {
    editingRef.current = false;
    setText(canonicalText);
    onCancel();
  };

  const commit = () => {
    if (!editingRef.current) {
      return;
    }
    editingRef.current = false;
    if (kind === 'number' && !Number.isFinite(Number(text))) {
      setText(canonicalText);
      onCancel();
      return;
    }
    onCommit();
  };

  return (
    <Input
      type="text"
      id={inputId}
      name={inputId}
      className={className}
      value={text}
      placeholder={placeholder}
      onFocus={() => {
        editingRef.current = true;
        onBegin();
      }}
      onChange={(event) => {
        const nextText = event.target.value;
        setText(nextText);
        if (kind === 'string') {
          onTransientChange(nextText);
          return;
        }
        const numericValue = Number(nextText);
        if (nextText !== '' && Number.isFinite(numericValue)) {
          onTransientChange(numericValue);
        }
      }}
      onBlur={commit}
      onKeyDown={(event) => {
        event.stopPropagation();
        if (event.key === 'Enter') {
          event.currentTarget.blur();
        } else if (event.key === 'Escape') {
          event.preventDefault();
          cancel();
          event.currentTarget.blur();
        }
      }}
    />
  );
};

export default NodeLiteralInput;

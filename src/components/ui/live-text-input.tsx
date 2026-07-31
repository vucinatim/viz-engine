import { useEffect, useRef, useState } from 'react';
import { Input, type InputProps } from './input';

interface LiveTextInputProps extends Omit<
  InputProps,
  'value' | 'onChange' | 'onBlur'
> {
  value: string;
  onChange: (value: string) => void;
  onTransientChange?: (value: string) => void;
  onCommit?: (value: string) => void;
  onGestureStart?: () => void;
  onGestureCancel?: () => void;
}

/**
 * Keeps keystrokes local and in the live runtime channel. The canonical value
 * and its history entry change once, when editing ends.
 */
export const LiveTextInput = ({
  value,
  onChange,
  onTransientChange,
  onCommit,
  onGestureStart,
  onGestureCancel,
  onFocus,
  onKeyDown,
  ...props
}: LiveTextInputProps) => {
  const [text, setText] = useState(value);
  const editingRef = useRef(false);

  useEffect(() => {
    if (!editingRef.current) {
      setText(value);
    }
  }, [value]);

  const cancel = () => {
    if (!editingRef.current) return;
    editingRef.current = false;
    setText(value);
    onGestureCancel?.();
  };

  const commit = () => {
    if (!editingRef.current) return;
    editingRef.current = false;
    if (onCommit) onCommit(text);
    else if (onTransientChange) onChange(text);
  };

  return (
    <Input
      {...props}
      value={text}
      onFocus={(event) => {
        if (!editingRef.current) {
          editingRef.current = true;
          onGestureStart?.();
        }
        onFocus?.(event);
      }}
      onChange={(event) => {
        const nextText = event.target.value;
        setText(nextText);
        (onTransientChange ?? onChange)(nextText);
      }}
      onBlur={commit}
      onKeyDown={(event) => {
        onKeyDown?.(event);
        if (event.defaultPrevented) return;
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

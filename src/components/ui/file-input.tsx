import { useEffect, useRef, useState } from 'react';

import { Button } from './button';
import { Input } from './input';

export type FileInputSelection =
  { kind: 'file'; file: File } | { kind: 'external-uri'; uri: string };

type FileInputProps = {
  value: string;
  onChange: (value: string) => void;
  onAssetSelect: (selection: FileInputSelection) => Promise<string>;
  acceptExtensions?: string[];
  placeholder?: string;
};

export default function FileInput({
  value,
  onChange,
  onAssetSelect,
  acceptExtensions,
  placeholder,
}: FileInputProps) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [draft, setDraft] = useState(value);
  const [isAttaching, setIsAttaching] = useState(false);
  const [error, setError] = useState<string>();
  const accept =
    acceptExtensions && acceptExtensions.length > 0
      ? acceptExtensions.join(',')
      : undefined;

  useEffect(() => setDraft(value), [value]);

  const selectAsset = async (selection: FileInputSelection) => {
    setIsAttaching(true);
    setError(undefined);
    try {
      const nextValue = await onAssetSelect(selection);
      setDraft(nextValue);
    } catch (selectionError) {
      setDraft(value);
      setError(
        selectionError instanceof Error
          ? selectionError.message
          : 'Could not attach asset.',
      );
    } finally {
      setIsAttaching(false);
    }
  };

  const commitExternalUri = async () => {
    const uri = draft.trim();
    if (uri === value) {
      return;
    }
    if (!uri) {
      onChange('');
      return;
    }
    if (uri.startsWith('asset:')) {
      setDraft(value);
      return;
    }
    await selectAsset({ kind: 'external-uri', uri });
  };

  return (
    <div className="flex items-center gap-2">
      <Input
        data-testid="asset-uri-input"
        value={draft}
        aria-invalid={Boolean(error)}
        title={error}
        placeholder={placeholder ?? 'https://.../file.ext'}
        onChange={(event) => {
          setDraft(event.target.value);
          setError(undefined);
        }}
        onBlur={() => void commitExternalUri()}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            void commitExternalUri();
          }
          if (event.key === 'Escape') {
            setDraft(value);
            setError(undefined);
          }
        }}
      />
      <input
        ref={fileRef}
        data-testid="asset-file-input"
        type="file"
        accept={accept}
        className="hidden"
        onChange={async (event) => {
          const file = event.target.files?.[0];
          if (file) {
            await selectAsset({ kind: 'file', file });
          }
          event.target.value = '';
        }}
      />
      <Button
        data-testid="asset-browse"
        type="button"
        variant="outline"
        size="xs"
        disabled={isAttaching}
        onClick={() => fileRef.current?.click()}>
        {isAttaching ? 'Attaching…' : 'Browse'}
      </Button>
      {draft && (
        <Button
          type="button"
          variant="ghost"
          size="xs"
          disabled={isAttaching}
          onClick={() => {
            setDraft('');
            onChange('');
          }}>
          Clear
        </Button>
      )}
    </div>
  );
}

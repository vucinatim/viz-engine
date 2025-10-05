import { idbGetFile, idbPutFile } from '@/lib/idb-file-store';
import { useEffect, useRef } from 'react';
import { Button } from './button';
import { Input } from './input';

type FileInputProps = {
  value: string;
  onChange: (value: string) => void;
  acceptExtensions?: string[]; // e.g., ['.glb', '.gltf']
  placeholder?: string;
};

export default function FileInput({
  value,
  onChange,
  acceptExtensions,
  placeholder,
}: FileInputProps) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const accept =
    acceptExtensions && acceptExtensions.length > 0
      ? acceptExtensions.join(',')
      : undefined;

  // Normalize incoming values to a stable idb: scheme so they persist across reloads
  useEffect(() => {
    if (!value) return;
    // Already normalized
    if (value.startsWith('idb:')) return;
    // Migrate blob: url → idb: key if we previously stored the blob by that temp id
    if (value.startsWith('blob:')) {
      const tempKey = `blob:${value.slice(value.lastIndexOf('/') + 1)}`;
      idbGetFile(tempKey).then(async (blob) => {
        if (!blob) return;
        const key = await computeBlobKey(blob);
        await idbPutFile(key, blob);
        onChange(`idb:${key}`);
      });
      return;
    }
    // Convert relative public path → idb: for persistence
    if (value.startsWith('/')) {
      (async () => {
        try {
          const r = await fetch(value);
          if (!r.ok) return;
          const blob = await r.blob();
          const key = await computeBlobKey(blob);
          await idbPutFile(key, blob);
          onChange(`idb:${key}`);
        } catch {}
      })();
    }
  }, [value, onChange]);

  return (
    <div className="flex items-center gap-2">
      <Input
        value={value}
        placeholder={placeholder ?? '/path/to/file.ext or https://.../file.ext'}
        onChange={(e) => onChange(e.target.value)}
      />
      <input
        ref={fileRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const key = await computeBlobKey(file);
          await idbPutFile(key, file);
          onChange(`idb:${key}`);
        }}
      />
      <Button
        type="button"
        variant="outline"
        size="xs"
        onClick={() => fileRef.current?.click()}>
        Browse
      </Button>
      {value && (
        <Button
          type="button"
          variant="ghost"
          size="xs"
          onClick={() => onChange('')}>
          Clear
        </Button>
      )}
    </div>
  );
}

async function computeBlobKey(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer();
  const hashBuf = await crypto.subtle.digest('SHA-256', buf);
  const hashArray = Array.from(new Uint8Array(hashBuf));
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  // Try to infer extension from blob type; fallback to empty
  let ext = '';
  switch (blob.type) {
    case 'model/gltf-binary':
      ext = '.glb';
      break;
    case 'model/gltf+json':
      ext = '.gltf';
      break;
    default:
      ext = '';
  }
  return `file:${hashHex}${ext}`;
}

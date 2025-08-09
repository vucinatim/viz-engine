import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Convert arbitrary values to a readable, multi-line string for debug output
// Handles undefined, null, Uint8Array, other TypedArrays and falls back safely
export function debugStringify(value: any): string {
  try {
    if (value === undefined) return 'undefined';
    if (value === null) return 'null';

    if (value instanceof Uint8Array) {
      const previewCount = Math.min(8, value.length);
      const preview = Array.from(value.slice(0, previewCount)).join(', ');
      return `Uint8Array(len=${value.length}) [${preview}${
        value.length > previewCount ? ', ...' : ''
      }]`;
    }

    if (
      typeof value === 'object' &&
      value &&
      ArrayBuffer.isView(value) &&
      // Exclude DataView which is also a view
      (value as any).BYTES_PER_ELEMENT
    ) {
      const anyView = value as unknown as {
        length: number;
        [k: number]: number;
      };
      const previewCount = Math.min(8, anyView.length || 0);
      const preview = Array.from({ length: previewCount })
        .map((_, i) => anyView[i])
        .join(', ');
      const ctor = (value as any).constructor?.name || 'TypedArray';
      return `${ctor}(len=${anyView.length || 0}) [${preview}${
        (anyView.length || 0) > previewCount ? ', ...' : ''
      }]`;
    }

    const json = JSON.stringify(value, null, 2);
    return typeof json === 'string' ? json : String(value);
  } catch {
    return String(value);
  }
}

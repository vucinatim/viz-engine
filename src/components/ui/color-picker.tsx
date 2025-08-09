import Color from 'color';
import { debounce } from 'lodash';
import { Clipboard } from 'lucide-react';
import { forwardRef, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from './button';
import { Popover, PopoverContent, PopoverTrigger } from './popover';

interface ColorPickerPopoverProps {
  value: string;
  onChange: (value: string) => void;
}

const ColorPickerPopover = forwardRef<
  HTMLButtonElement,
  ColorPickerPopoverProps
>(({ value, onChange }, ref) => {
  const [open, setOpen] = useState(false);
  const [localValue, setLocalValue] = useState<string>(value);
  const [inputValue, setInputValue] = useState<string>(value);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [inputError, setInputError] = useState<string | null>(null);

  // HSV + A in refs to avoid re-renders during drags
  const hueRef = useRef<number>(0); // [0..360)
  const satRef = useRef<number>(1); // [0..1]
  const valRef = useRef<number>(1); // [0..1]
  const alphaRef = useRef<number>(1); // [0..1]
  const ALPHA_PRECISION = 2; // round alpha to 2 decimals

  const svCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const hueCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const alphaCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const svDraggingRef = useRef<boolean>(false);
  const hueDraggingRef = useRef<boolean>(false);
  const alphaDraggingRef = useRef<boolean>(false);

  // Initialize canvases and refs only when opening; avoid re-parsing during drags
  useEffect(() => {
    if (!open) return;
    const parsed = parseColorString(localValue);
    hueRef.current = parsed.h;
    satRef.current = parsed.s;
    valRef.current = parsed.v;
    alphaRef.current = parsed.a;
    requestAnimationFrame(() => {
      drawHueCanvas(hueCanvasRef.current);
      drawSVCanvas(
        svCanvasRef.current,
        hueRef.current,
        satRef.current,
        valRef.current,
      );
      drawSVThumb(svCanvasRef.current, satRef.current, valRef.current);
      drawHueThumb(hueCanvasRef.current, hueRef.current);
      drawAlphaCanvas(
        alphaCanvasRef.current,
        hueRef.current,
        satRef.current,
        valRef.current,
      );
      drawAlphaThumb(alphaCanvasRef.current, alphaRef.current);
    });
    // Intentionally ignore canvas helpers to keep effect stable while open
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Sync from prop when closed so external changes reflect in the chip
  useEffect(() => {
    if (open) return;
    setLocalValue(value);
    setInputValue(value);
  }, [value, open]);

  // Keep input in sync with current color while not actively editing
  useEffect(() => {
    if (!isEditing) setInputValue(localValue);
  }, [localValue, isEditing]);

  const debouncedOnChange = useMemo(
    () =>
      debounce((next: string) => {
        onChange(next);
      }, 120),
    [onChange],
  );

  // Canvas drawing helpers (devicePixelRatio aware)
  const withCanvas = (
    canvas: HTMLCanvasElement | null,
    draw: (
      ctx: CanvasRenderingContext2D,
      cssW: number,
      cssH: number,
      dpr: number,
    ) => void,
  ) => {
    if (!canvas) return;
    const dpr =
      typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    const rect = canvas.getBoundingClientRect();
    const cssW = Math.max(1, Math.floor(rect.width));
    const cssH = Math.max(1, Math.floor(rect.height));
    const w = Math.floor(cssW * dpr);
    const h = Math.floor(cssH * dpr);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    (ctx as any).imageSmoothingEnabled = false;
    draw(ctx, cssW, cssH, dpr);
  };

  const drawSVCanvas = (
    canvas: HTMLCanvasElement | null,
    hue: number,
    sat: number,
    val: number,
  ) => {
    withCanvas(canvas, (ctx, cssW, cssH) => {
      // Base: white -> hue color horizontally
      const hueColor = hsvToRgbaString(hue, 1, 1, 1);
      const gradX = ctx.createLinearGradient(0, 0, cssW, 0);
      gradX.addColorStop(0, 'rgba(255,255,255,1)');
      gradX.addColorStop(1, hueColor);
      ctx.fillStyle = gradX;
      ctx.fillRect(0, 0, cssW, cssH);
      // Overlay: transparent -> black vertically
      const gradY = ctx.createLinearGradient(0, 0, 0, cssH);
      gradY.addColorStop(0, 'rgba(0,0,0,0)');
      gradY.addColorStop(1, 'rgba(0,0,0,1)');
      ctx.fillStyle = gradY;
      ctx.fillRect(0, 0, cssW, cssH);
    });
  };

  const drawSVThumb = (
    canvas: HTMLCanvasElement | null,
    s: number,
    v: number,
  ) => {
    withCanvas(canvas, (ctx, cssW, cssH) => {
      const x = s * cssW;
      const y = (1 - v) * cssH;
      ctx.save();
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'white';
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x, y, 7, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(0,0,0,0.6)';
      ctx.stroke();
      ctx.restore();
    });
  };

  const drawHueCanvas = (canvas: HTMLCanvasElement | null) => {
    withCanvas(canvas, (ctx, cssW, cssH) => {
      const grad = ctx.createLinearGradient(0, 0, cssW, 0);
      const stops = [0, 60, 120, 180, 240, 300, 360];
      for (const deg of stops) {
        const c = hsvToRgbaString(deg, 1, 1, 1);
        grad.addColorStop(deg / 360, c);
      }
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, cssW, cssH);
    });
  };

  const drawAlphaCanvas = (
    canvas: HTMLCanvasElement | null,
    hue: number,
    sat: number,
    val: number,
  ) => {
    withCanvas(canvas, (ctx, cssW, cssH) => {
      // Checkerboard background
      const square = 6;
      for (let y = 0; y < cssH; y += square) {
        for (let x = 0; x < cssW; x += square) {
          const isDark = (x / square + y / square) % 2 === 0;
          ctx.fillStyle = isDark ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.6)';
          ctx.fillRect(x, y, square, square);
        }
      }
      // Alpha gradient from 0 -> 1 for current color
      const left = hsvToRgbaString(hue, sat, val, 0);
      const right = hsvToRgbaString(hue, sat, val, 1);
      const grad = ctx.createLinearGradient(0, 0, cssW, 0);
      grad.addColorStop(0, left);
      grad.addColorStop(1, right);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, cssW, cssH);
    });
  };

  const drawHueThumb = (canvas: HTMLCanvasElement | null, hue: number) => {
    withCanvas(canvas, (ctx, cssW) => {
      const x = (hue / 360) * cssW;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 12);
      // Black outline underlay for visibility
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(0,0,0,0.6)';
      ctx.stroke();
      // Foreground white line
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'white';
      ctx.stroke();
      ctx.restore();
    });
  };

  const drawAlphaThumb = (canvas: HTMLCanvasElement | null, a: number) => {
    withCanvas(canvas, (ctx, cssW, cssH) => {
      const x = a * cssW;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, cssH);
      // Black outline underlay for visibility
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(0,0,0,0.6)';
      ctx.stroke();
      // Foreground white line
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'white';
      ctx.stroke();
      ctx.restore();
    });
  };

  const commitColor = () => {
    const factor = 10 ** ALPHA_PRECISION;
    const roundedAlpha = Math.max(
      0,
      Math.min(1, Math.round(alphaRef.current * factor) / factor),
    );
    alphaRef.current = roundedAlpha;
    const rgba = hsvToRgbaString(
      hueRef.current,
      satRef.current,
      valRef.current,
      roundedAlpha,
    );
    setLocalValue(rgba);
    debouncedOnChange(rgba);
    // Ensure the alpha thumb remains visible after any commit
    requestAnimationFrame(() => {
      drawAlphaThumb(alphaCanvasRef.current, alphaRef.current);
    });
  };

  const applyParsedColor = (str: string) => {
    try {
      const parsed = parseColorString(str);
      hueRef.current = parsed.h;
      satRef.current = parsed.s;
      valRef.current = parsed.v;
      alphaRef.current = parsed.a;
      const rgba = hsvToRgbaString(parsed.h, parsed.s, parsed.v, parsed.a);
      setLocalValue(rgba);
      setInputError(null);
      requestAnimationFrame(() => {
        drawHueCanvas(hueCanvasRef.current);
        drawHueThumb(hueCanvasRef.current, hueRef.current);
        drawSVCanvas(svCanvasRef.current, parsed.h, parsed.s, parsed.v);
        drawSVThumb(svCanvasRef.current, parsed.s, parsed.v);
        drawAlphaCanvas(alphaCanvasRef.current, parsed.h, parsed.s, parsed.v);
        drawAlphaThumb(alphaCanvasRef.current, parsed.a);
      });
      debouncedOnChange(rgba);
    } catch {
      setInputError('Invalid color');
    }
  };

  const handleSVPointer = (evt: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = svCanvasRef.current;
    if (!canvas) return;
    svDraggingRef.current = true;
    canvas.setPointerCapture(evt.pointerId);
    const update = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
      const y = Math.max(0, Math.min(rect.height, clientY - rect.top));
      satRef.current = x / rect.width;
      valRef.current = 1 - y / rect.height;
      drawSVCanvas(canvas, hueRef.current, satRef.current, valRef.current);
      drawSVThumb(canvas, satRef.current, valRef.current);
      drawAlphaCanvas(
        alphaCanvasRef.current,
        hueRef.current,
        satRef.current,
        valRef.current,
      );
      drawAlphaThumb(alphaCanvasRef.current, alphaRef.current);
      commitColor();
    };
    update(evt.clientX, evt.clientY);
    const onMove = (e: PointerEvent) => update(e.clientX, e.clientY);
    const onUp = () => {
      svDraggingRef.current = false;
      canvas.releasePointerCapture(evt.pointerId);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const handleHuePointer = (evt: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = hueCanvasRef.current;
    if (!canvas) return;
    hueDraggingRef.current = true;
    canvas.setPointerCapture(evt.pointerId);
    const update = (clientX: number) => {
      const rect = canvas.getBoundingClientRect();
      const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
      hueRef.current = (x / rect.width) * 360;
      drawHueCanvas(canvas);
      drawHueThumb(canvas, hueRef.current);
      // redraw SV with new hue
      drawSVCanvas(
        svCanvasRef.current,
        hueRef.current,
        satRef.current,
        valRef.current,
      );
      drawSVThumb(svCanvasRef.current, satRef.current, valRef.current);
      drawAlphaCanvas(
        alphaCanvasRef.current,
        hueRef.current,
        satRef.current,
        valRef.current,
      );
      commitColor();
    };
    update(evt.clientX);
    const onMove = (e: PointerEvent) => update(e.clientX);
    const onUp = () => {
      hueDraggingRef.current = false;
      canvas.releasePointerCapture(evt.pointerId);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const handleAlphaPointer = (evt: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = alphaCanvasRef.current;
    if (!canvas) return;
    alphaDraggingRef.current = true;
    canvas.setPointerCapture(evt.pointerId);
    const update = (clientX: number) => {
      const rect = canvas.getBoundingClientRect();
      const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
      const factor = 10 ** ALPHA_PRECISION;
      alphaRef.current = Math.round((x / rect.width) * factor) / factor;
      drawAlphaCanvas(canvas, hueRef.current, satRef.current, valRef.current);
      drawAlphaThumb(canvas, alphaRef.current);
      commitColor();
    };
    update(evt.clientX);
    const onMove = (e: PointerEvent) => update(e.clientX);
    const onUp = () => {
      alphaDraggingRef.current = false;
      canvas.releasePointerCapture(evt.pointerId);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          ref={ref}
          variant="outline"
          className="relative h-8 w-full text-xs">
          <div className="absolute inset-0 flex items-center justify-between gap-x-4 px-2">
            <div className="grow truncate">{localValue}</div>
            <div
              className="h-5 w-5 shrink-0 rounded-md border border-input"
              style={{ backgroundColor: localValue }}
            />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent forceMount side="right" className="p-2">
        <div className="flex flex-col gap-3 p-1">
          <div className="relative" style={{ width: '100%', height: 160 }}>
            <canvas
              ref={svCanvasRef}
              className="h-full w-full rounded-sm border border-border"
              onPointerDown={handleSVPointer}
            />
          </div>
          <div className="relative" style={{ width: '100%', height: 12 }}>
            <canvas
              ref={hueCanvasRef}
              className="h-3 w-full rounded-sm border border-border"
              onPointerDown={handleHuePointer}
            />
          </div>
          <div className="relative" style={{ width: '100%', height: 12 }}>
            <canvas
              ref={alphaCanvasRef}
              className="h-3 w-full rounded-sm border border-border"
              onPointerDown={handleAlphaPointer}
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              value={inputValue}
              onFocus={() => setIsEditing(true)}
              onBlur={(e) => {
                setIsEditing(false);
                applyParsedColor(e.currentTarget.value);
              }}
              onChange={(e) => {
                setInputValue(e.target.value);
                setInputError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  (e.target as HTMLInputElement).blur();
                }
              }}
              placeholder="#RRGGBB or rgba(...)"
              className={`h-8 flex-1 rounded border bg-black px-2 font-mono text-xs outline-none ${
                inputError ? 'border-red-500' : 'border-input'
              }`}
            />
            <Button
              type="button"
              variant="outline"
              className="h-8 px-2 text-xs"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(localValue);
                } catch {
                  // no-op
                }
              }}>
              <Clipboard className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
});

ColorPickerPopover.displayName = 'ColorPickerPopover';

export { ColorPickerPopover };

// -------- Helpers (via `color` lib) --------
function hsvToRgbaString(h: number, s: number, v: number, a: number): string {
  // The `color` package expects s/v in [0..100]
  const c = Color.hsv(h, s * 100, v * 100).alpha(a);
  return c.rgb().string();
}

function parseColorString(input: string): {
  h: number;
  s: number;
  v: number;
  a: number;
} {
  try {
    const c = Color(input);
    const hsv = c.hsv().object() as { h: number; s: number; v: number };
    const a = c.alpha();
    return { h: hsv.h || 0, s: (hsv.s || 0) / 100, v: (hsv.v || 0) / 100, a };
  } catch {
    return { h: 0, s: 0, v: 1, a: 1 };
  }
}

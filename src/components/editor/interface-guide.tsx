'use client';

import { Info } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface PanelHighlight {
  id: string;
  name: string;
  description: string;
  color: string;
  panelId: string;
}

const panelHighlights: PanelHighlight[] = [
  {
    id: 'layers-panel',
    name: 'Layers Panel',
    description:
      'Manage and configure visual layers, blend modes, and layer properties',
    color: 'rgba(59, 130, 246, 0.3)', // blue-500
    panelId: 'left-panel',
  },
  {
    id: 'preview-panel',
    name: 'Preview & Node Editor',
    description:
      'Real-time visualization preview, timeline controls, and node network editor for automations',
    color: 'rgba(168, 85, 247, 0.3)', // purple-500
    panelId: 'top-right-panel',
  },
  {
    id: 'audio-panel',
    name: 'Audio Panel',
    description:
      'Audio controls, waveform visualization, and frequency analysis',
    color: 'rgba(34, 197, 94, 0.3)', // green-500
    panelId: 'bottom-right-panel',
  },
];

export function InterfaceGuide() {
  const [showGuide, setShowGuide] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const overlayContent = showGuide && (
    <div className="pointer-events-none fixed inset-0 z-[999999999999999]">
      {panelHighlights.map((highlight) => {
        const panelElement = document.getElementById(highlight.panelId);
        if (!panelElement) return null;

        const rect = panelElement.getBoundingClientRect();

        return (
          <div
            key={highlight.id}
            className="absolute transition-all duration-200"
            style={{
              left: `${rect.left}px`,
              top: `${rect.top}px`,
              width: `${rect.width}px`,
              height: `${rect.height}px`,
              backgroundColor: highlight.color,
              border: `2px solid ${highlight.color.replace('0.3', '0.8')}`,
              borderRadius: '0.375rem',
            }}>
            <div className="flex h-full w-full items-center justify-center">
              <div className="rounded-lg bg-black/80 px-6 py-4 text-center backdrop-blur-sm">
                <h3 className="mb-2 text-xl font-bold text-white">
                  {highlight.name}
                </h3>
                <p className="max-w-xs text-sm text-white/70">
                  {highlight.description}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <>
      <button
        onMouseEnter={() => setShowGuide(true)}
        onMouseLeave={() => setShowGuide(false)}
        className="flex items-center gap-2 py-2 text-sm text-zinc-500 transition-colors hover:text-white"
        title="Interface Guide">
        <Info className="h-5 w-5" />
      </button>

      {mounted && overlayContent && createPortal(overlayContent, document.body)}
    </>
  );
}

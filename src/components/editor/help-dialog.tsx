import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { ChevronLeft, ChevronRight, Chrome, HelpCircle } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';

const TUTORIAL_VIDEO_BASE_URL =
  'https://pub-be7604c8da4746a0b975f22941f5e03c.r2.dev/tutorials';
const HAS_SEEN_TUTORIAL_KEY = 'vizengine-has-seen-tutorial';

// Detect if the browser is Chromium-based
const isChromiumBrowser = () => {
  if (typeof window === 'undefined') return true; // SSR safe default

  const userAgent = navigator.userAgent.toLowerCase();

  // Check for Chrome, Chromium, Edge (Chromium-based), Opera (Chromium-based), Brave
  const isChromium =
    userAgent.includes('chrome') ||
    userAgent.includes('chromium') ||
    userAgent.includes('edg/') || // New Edge
    userAgent.includes('opr/') || // Opera
    // @ts-ignore - Brave specific API
    (navigator.brave && typeof navigator.brave.isBrave === 'function');

  // Exclude Firefox which sometimes has chrome in user agent
  const isFirefox = userAgent.includes('firefox');

  return isChromium && !isFirefox;
};

interface TutorialSlide {
  title: string;
  description: string;
  videoUrl?: string;
  imageUrl?: string;
  category: 'getting-started' | 'tips' | 'important';
  customContent?: boolean;
}

const tutorials: TutorialSlide[] = [
  {
    title: 'Browser Recommendation',
    description:
      'For the best experience with VizEngine, we highly recommend using Google Chrome or Chromium-based browsers. These browsers provide optimal performance and compatibility with our advanced visualization features.',
    category: 'important',
    customContent: true,
  },
  {
    title: 'Your first time?',
    description:
      "Try playing around with an example first :) Click 'Examples' in the toolbar to get started with pre-made visualizations.",
    category: 'getting-started',
    videoUrl: `${TUTORIAL_VIDEO_BASE_URL}/load-examples.mp4`,
  },
  {
    title: 'Adding layers?',
    description:
      "Click the 'Add New Layer' button in the layers panel to add components. Stack multiple layers and control their blending modes for complex effects.",
    category: 'getting-started',
    videoUrl: `${TUTORIAL_VIDEO_BASE_URL}/add-layers.mp4`,
  },
  {
    title: 'Play your own audio?',
    description:
      "Stream directly from a chrome tab or click the 'Folder' icon in the audio panel to upload your track. The visualizer will automatically analyze and react to your music.",
    category: 'getting-started',
    videoUrl: `${TUTORIAL_VIDEO_BASE_URL}/play-audio.mp4`,
  },
  {
    title: 'Animate a parameter?',
    description:
      "Click the 'Target' icon next to any parameter to create animations. Connect nodes to extract a value from the signal and bring it to life.",
    category: 'getting-started',
    videoUrl: `${TUTORIAL_VIDEO_BASE_URL}/animate-parameter.mp4`,
  },
  {
    title: 'Quality settings',
    description:
      "Adjust the 'Quality' setting in the toolbar to control render resolution. It auto-adapts to your screen. Lower for performance, higher for better.",
    category: 'tips',
    imageUrl: '/tutorials/quality-settings.png',
  },
  {
    title: 'Export tips',
    description:
      'Export a short 5-second test clip first to check quality and performance before committing to a full-length export.',
    category: 'tips',
    imageUrl: '/tutorials/export.png',
  },
  {
    title: 'Layer blending modes',
    description:
      'Experiment with blend modes (Add, Screen, Multiply, etc.) to combine layers creatively. Try the layer blending showcase example!',
    category: 'tips',
    imageUrl: '/tutorials/blending-modes.png',
  },
  {
    title: 'Saving & loading projects',
    description:
      'Use Save/Load buttons in the toolbar to export as .vizengine.json files. Share these or load them later to continue working.',
    category: 'tips',
    imageUrl: '/tutorials/save-load.png',
  },
];

export function HelpDialog() {
  const [open, setOpen] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

  // Filter tutorials based on browser type
  const filteredTutorials = useMemo(() => {
    // Only show Chrome recommendation for non-Chromium browsers
    if (isChromiumBrowser()) {
      return tutorials.filter((tutorial) => tutorial.category !== 'important');
    }
    return tutorials;
  }, []);

  // Check if user is new and open dialog automatically
  useEffect(() => {
    const hasSeenTutorial = localStorage.getItem(HAS_SEEN_TUTORIAL_KEY);
    if (!hasSeenTutorial) {
      setOpen(true);
      localStorage.setItem(HAS_SEEN_TUTORIAL_KEY, 'true');
    }
  }, []);

  const handlePrevious = () => {
    setCurrentSlide((prev) =>
      prev === 0 ? filteredTutorials.length - 1 : prev - 1,
    );
  };

  const handleNext = () => {
    setCurrentSlide((prev) =>
      prev === filteredTutorials.length - 1 ? 0 : prev + 1,
    );
  };

  const currentTutorial = filteredTutorials[currentSlide];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          className="flex items-center gap-2 py-2 text-sm text-zinc-500 transition-colors hover:text-white"
          title="Help & Tutorials">
          <HelpCircle className="h-5 w-5" />
        </button>
      </DialogTrigger>
      <DialogContent className="min-h-[600px] max-w-2xl">
        {/* <DialogHeader>
          <DialogTitle className="text-xl">
            Welcome to VizEngine! 👋
          </DialogTitle>
        </DialogHeader> */}

        <div className="flex flex-col gap-y-4">
          {/* Category badge */}
          <div className="flex items-center gap-2">
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                currentTutorial.category === 'getting-started'
                  ? 'bg-animation-blue/20 text-animation-blue/80'
                  : currentTutorial.category === 'important'
                    ? 'bg-orange-500/20 text-orange-300'
                    : 'bg-animation-purple/20 text-animation-purple/80'
              }`}>
              {currentTutorial.category === 'getting-started'
                ? 'Getting Started'
                : currentTutorial.category === 'important'
                  ? 'Important'
                  : 'Tips & Tricks'}
            </span>
            <span className="text-sm text-zinc-500">
              {currentSlide + 1} of {filteredTutorials.length}
            </span>
          </div>

          {/* Tutorial content */}
          <div className="relative flex flex-1 flex-col gap-y-3">
            <h3 className="text-lg font-semibold text-white">
              {currentTutorial.title}
            </h3>
            <p className="min-h-[3rem] text-sm leading-relaxed text-zinc-300">
              {currentTutorial.description}
            </p>

            {/* Video, Screenshot or custom content */}
            {currentTutorial.customContent &&
            currentTutorial.category === 'important' ? (
              <div className="relative w-full flex-1 overflow-hidden rounded-lg border border-orange-500/30 bg-gradient-to-br from-orange-500/10 to-orange-600/5 p-8">
                <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
                  <Chrome className="h-16 w-16 text-orange-400" />
                  <div className="space-y-2">
                    <p className="text-sm leading-relaxed text-zinc-200">
                      VizEngine works best with{' '}
                      <strong className="text-orange-300">Google Chrome</strong>{' '}
                      or other Chromium-based browsers.
                    </p>
                    <p className="text-xs text-zinc-400">
                      Features like audio streaming and WebGL optimizations are
                      designed for Chrome.
                    </p>
                  </div>
                  <a
                    href="https://www.google.com/chrome/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-orange-600">
                    <Chrome className="h-4 w-4" />
                    Download Chrome
                  </a>
                </div>
              </div>
            ) : currentTutorial.category === 'tips' &&
              currentTutorial.imageUrl ? (
              <div className="aspect-video-custom relative w-full overflow-hidden rounded-lg border border-white/10 bg-zinc-900">
                <Image
                  src={currentTutorial.imageUrl}
                  alt={currentTutorial.title}
                  fill
                  className="object-cover"
                />
              </div>
            ) : currentTutorial.category === 'getting-started' &&
              currentTutorial.videoUrl ? (
              <div className="aspect-video-custom relative w-full overflow-hidden rounded-lg border border-white/10 bg-zinc-900">
                <video
                  src={currentTutorial.videoUrl}
                  loop
                  muted
                  autoPlay
                  className="h-full w-full">
                  Your browser does not support the video tag.
                </video>
              </div>
            ) : currentTutorial.category === 'getting-started' ? (
              <div className="aspect-video-custom relative w-full overflow-hidden rounded-lg border border-white/10 bg-zinc-900">
                <div className="flex h-full items-center justify-center">
                  <div className="text-center">
                    <div className="mb-1 text-3xl">🎬</div>
                    <p className="text-xs text-zinc-500">
                      Video tutorial coming soon
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="aspect-video-custom relative w-full overflow-hidden rounded-lg border border-white/10 bg-zinc-900">
                <div className="flex h-full items-center justify-center">
                  <div className="text-center">
                    <div className="mb-1 text-3xl">📸</div>
                    <p className="text-xs text-zinc-500">
                      Screenshot coming soon
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between pt-1">
            <Button
              variant="ghostly"
              onClick={handlePrevious}
              className="flex items-center gap-2">
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>

            {/* Dot indicators */}
            <div className="flex gap-2">
              {filteredTutorials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentSlide(index)}
                  className={`h-2 w-2 rounded-full transition-all ${
                    index === currentSlide
                      ? 'w-6 bg-white'
                      : 'bg-white/30 hover:bg-white/50'
                  }`}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>

            <Button
              variant="ghostly"
              onClick={handleNext}
              className="flex items-center gap-2">
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

import { Monitor } from 'lucide-react';

// Shows on screens smaller than lg (1024px)
export default function ScreenSizeGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* Main app - always rendered */}
      {children}

      {/* Overlay - shown/hidden with pure CSS media queries */}
      {/* Hidden on lg+ screens, visible on smaller screens */}
      <div className="pointer-events-none fixed inset-0 z-[9999] flex items-center justify-center bg-background opacity-0 transition-opacity duration-300 max-lg:pointer-events-auto max-lg:opacity-100">
        <div className="mx-4 max-w-md space-y-6 text-center">
          <div className="flex justify-center">
            <div className="rounded-full bg-primary/10 p-6">
              <Monitor className="h-12 w-12 text-primary" />
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">Screen Too Small</h1>
            <p className="text-muted-foreground">
              VizEngine requires a larger screen to provide the best experience.
              Please use a desktop or laptop computer with a minimum resolution
              of 1024x600px or larger.
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground">
              Please resize your browser window or switch to a larger device.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

import useNodeNetworkStore from '@/components/node-network/node-network-store';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { destructureParameterId } from '@/lib/id-utils';
import useLayerStore from '@/lib/stores/layer-store';
import { Bug, Check, Copy, ExternalLink } from 'lucide-react';
import { useState } from 'react';

export function DebugInfoDialog() {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const getDebugInfo = () => {
    // Check if we're on the client side
    if (typeof window === 'undefined') {
      return JSON.stringify(
        { error: 'Debug info only available on client side' },
        null,
        2,
      );
    }

    // Read store state directly instead of subscribing (only when function is called)
    const layers = useLayerStore.getState().layers;
    const networks = useNodeNetworkStore.getState().networks;

    const info = {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
        devicePixelRatio: window.devicePixelRatio,
      },
      project: {
        layersCount: layers.length,
        visibleLayers: layers.filter((l) => l.layerSettings.visible).length,
        layers: layers.map((layer) => ({
          id: layer.id,
          name: layer.comp.name,
          visible: layer.layerSettings.visible,
          expanded: layer.isExpanded,
          debugEnabled: layer.isDebugEnabled,
        })),
        animations: {
          totalNetworks: Object.keys(networks).length,
          enabledAnimations: Object.entries(networks)
            .filter(([_, network]) => network.isEnabled)
            .map(([parameterId, network]) => {
              const info = destructureParameterId(parameterId);
              const layer = layers.find((l) => l.id === info.layerId);
              return {
                parameterId,
                layerName: layer?.comp.name || info.componentName,
                parameterName: info.parameterName,
                groupPath: info.groupPath,
                nodeCount: network.nodes.length,
                edgeCount: network.edges.length,
              };
            }),
        },
      },
      webGL: (() => {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
        if (!gl) return 'Not supported';
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        return debugInfo
          ? {
              vendor: gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL),
              renderer: gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL),
            }
          : 'Available (no debug info)';
      })(),
      // You could add console errors here if you track them
    };

    return JSON.stringify(info, null, 2);
  };

  const handleCopy = async () => {
    if (typeof window === 'undefined') return;
    const debugInfo = getDebugInfo();
    await navigator.clipboard.writeText(debugInfo);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenGitHubIssue = () => {
    if (typeof window === 'undefined') return;
    const debugInfo = getDebugInfo();
    const issueBody = encodeURIComponent(
      `## Bug Description\n\n[Describe the bug here]\n\n## Steps to Reproduce\n\n1. [Step 1]\n2. [Step 2]\n3. [Step 3]\n\n## Expected Behavior\n\n[What you expected to happen]\n\n## Actual Behavior\n\n[What actually happened]\n\n## Debug Information\n\n\`\`\`json\n${debugInfo}\n\`\`\``,
    );

    const issueUrl = `https://github.com/vucinatim/viz-engine/issues/new?title=${encodeURIComponent('[Bug] ')}&body=${issueBody}`;
    window.open(issueUrl, '_blank');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          className="flex items-center gap-2 py-2 text-sm text-zinc-500 transition-colors hover:text-white"
          title="Report a Bug">
          <Bug className="h-5 w-5" />
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Report a Bug</DialogTitle>
          <DialogDescription>
            Copy the debug information below and include it in your bug report
            on GitHub.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-md bg-zinc-900 p-4">
            <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words text-xs">
              <code>{getDebugInfo()}</code>
            </pre>
          </div>
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleCopy}
              className="flex items-center gap-2">
              {copied ? (
                <>
                  <Check className="h-4 w-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy Debug Info
                </>
              )}
            </Button>
            <Button
              onClick={handleOpenGitHubIssue}
              className="flex items-center gap-2">
              <ExternalLink className="h-4 w-4" />
              Create GitHub Issue
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

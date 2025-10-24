import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarShortcut,
  MenubarTrigger,
} from '@/components/ui/menubar';
import { useKeyboardShortcuts } from '@/lib/hooks/use-keyboard-shortcuts';
import {
  loadProject,
  loadProjectFromUrl,
  resetProject,
  saveProject,
} from '@/lib/project-persistence';
import { useHistoryStore } from '@/lib/stores/history-store';
import useProfilerStore from '@/lib/stores/profiler-store';
import {
  SHORTCUTS,
  formatShortcut,
  toShortcutDefinition,
} from '@/lib/utils/keyboard-shortcuts';
import { memo, useEffect, useRef, useState } from 'react';
import EnabledAnimationsDropdown from './enabled-animations-dropdown';
import ExportImageDialog from './export-image-dialog';
import HistoryContextIndicator from './history-context-indicator';

interface SampleProject {
  name: string;
  filename: string;
  url: string;
}

const EditorToolbar = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [sampleProjects, setSampleProjects] = useState<SampleProject[]>([]);
  const [isLoadingSamples, setIsLoadingSamples] = useState(false);
  const [isExportImageDialogOpen, setIsExportImageDialogOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [projectName, setProjectName] = useState('my-viz-project');

  // Use unified history for context-aware undo/redo
  const undo = useHistoryStore((state) => state.undo);
  const redo = useHistoryStore((state) => state.redo);
  const canUndo = useHistoryStore((state) => state.canUndo());
  const canRedo = useHistoryStore((state) => state.canRedo());
  const activeContext = useHistoryStore((state) => state.activeContext);

  // Profiler controls
  const profilerEnabled = useProfilerStore((s) => s.enabled);
  const profilerVisible = useProfilerStore((s) => s.visible);
  const setProfilerEnabled = useProfilerStore((s) => s.setEnabled);
  const setProfilerVisible = useProfilerStore((s) => s.setVisible);

  const toggleProfiler = () => {
    if (!profilerEnabled) {
      // If enabling for the first time, enable and show
      setProfilerEnabled(true);
      setProfilerVisible(true);
    } else {
      // If already enabled, just toggle visibility
      setProfilerVisible(!profilerVisible);
    }
  };

  // Track fullscreen state changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Toggle fullscreen handler
  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (error) {
      console.error('Error toggling fullscreen:', error);
    }
  };

  // Add keyboard shortcuts for undo/redo and fullscreen
  useKeyboardShortcuts({
    shortcuts: [
      toShortcutDefinition(SHORTCUTS.undo, undo, canUndo),
      toShortcutDefinition(SHORTCUTS.redo, redo, canRedo),
      toShortcutDefinition(SHORTCUTS.redoAlt, redo, canRedo),
      toShortcutDefinition(SHORTCUTS.fullscreen, toggleFullscreen, true),
    ],
  });

  // Fetch available sample projects
  useEffect(() => {
    const fetchSampleProjects = async () => {
      try {
        setIsLoadingSamples(true);
        const response = await fetch('/api/sample-projects');
        const projects = await response.json();
        setSampleProjects(projects);
      } catch (error) {
        console.error('Failed to fetch sample projects:', error);
      } finally {
        setIsLoadingSamples(false);
      }
    };

    fetchSampleProjects();
  }, []);

  const handleSaveProject = () => {
    setIsSaveDialogOpen(true);
  };

  const handleConfirmSave = () => {
    if (projectName.trim()) {
      saveProject(projectName.trim());
      setIsSaveDialogOpen(false);
    }
  };

  const handleLoadProject = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      loadProject(file);
    }
  };

  const handleLoadSampleProject = (url: string) => {
    loadProjectFromUrl(url);
  };

  const handleResetProject = () => {
    console.log('[EditorToolbar] Opening reset dialog...');
    setIsResetDialogOpen(true);
  };

  const handleConfirmReset = async () => {
    console.log(
      '[EditorToolbar] User confirmed reset, calling resetProject()...',
    );
    setIsResetDialogOpen(false);
    await resetProject();
  };

  return (
    <>
      <Menubar>
        <MenubarMenu>
          <MenubarTrigger>File</MenubarTrigger>
          <MenubarContent>
            <MenubarItem onClick={handleResetProject}>New Project</MenubarItem>
            <MenubarSeparator />
            <MenubarItem onClick={handleSaveProject}>
              Save As...{' '}
              <MenubarShortcut>
                {formatShortcut(SHORTCUTS.saveAs)}
              </MenubarShortcut>
            </MenubarItem>
            <MenubarItem onClick={handleLoadProject}>Open...</MenubarItem>
            <MenubarSeparator />
            <MenubarItem onClick={() => setIsExportImageDialogOpen(true)}>
              Export Image...
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>

        <MenubarMenu>
          <MenubarTrigger>Edit</MenubarTrigger>
          <MenubarContent>
            <MenubarItem onClick={undo} disabled={!canUndo}>
              Undo{' '}
              <MenubarShortcut>
                {formatShortcut(SHORTCUTS.undo)}
              </MenubarShortcut>
            </MenubarItem>
            <MenubarItem onClick={redo} disabled={!canRedo}>
              Redo{' '}
              <MenubarShortcut>
                {formatShortcut(SHORTCUTS.redo)}
              </MenubarShortcut>
            </MenubarItem>
            <MenubarSeparator />
            <MenubarItem disabled>Cut</MenubarItem>
            <MenubarItem disabled>Copy</MenubarItem>
            <MenubarItem disabled>Paste</MenubarItem>
          </MenubarContent>
        </MenubarMenu>
        <MenubarMenu>
          <MenubarTrigger>View</MenubarTrigger>
          <MenubarContent>
            <MenubarItem onClick={toggleFullscreen}>
              {isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}{' '}
              <MenubarShortcut>
                {formatShortcut(SHORTCUTS.fullscreen)}
              </MenubarShortcut>
            </MenubarItem>
            <MenubarSeparator />
            <MenubarItem onClick={toggleProfiler}>
              {profilerVisible ? '✓ ' : ''}Performance Profiler
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>
        {/* <div className="px-1">
          <div className="h-6 w-px self-center bg-white/10" />
        </div> */}
        <MenubarMenu>
          <MenubarTrigger>Examples</MenubarTrigger>
          <MenubarContent>
            {isLoadingSamples ? (
              <MenubarItem disabled>Loading...</MenubarItem>
            ) : sampleProjects.length > 0 ? (
              sampleProjects.map((project) => (
                <MenubarItem
                  key={project.filename}
                  onClick={() => handleLoadSampleProject(project.url)}>
                  {project.name}
                </MenubarItem>
              ))
            ) : (
              <MenubarItem disabled>No sample projects available</MenubarItem>
            )}
            <MenubarSeparator />
            <MenubarItem
              disabled
              className="text-xs text-muted-foreground opacity-50">
              Place .vizengine.json files in /public/projects/
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>
        <EnabledAnimationsDropdown />
        <HistoryContextIndicator />
      </Menubar>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        style={{ display: 'none' }}
        accept=".vizengine.json"
      />
      <ExportImageDialog
        open={isExportImageDialogOpen}
        onOpenChange={setIsExportImageDialogOpen}
      />

      {/* Save Project Dialog */}
      <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Project</DialogTitle>
            <DialogDescription>
              Enter a name for your project. This will download a
              .vizengine.json file.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="project-name">Project Name</Label>
            <Input
              id="project-name"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleConfirmSave();
                }
              }}
              placeholder="my-viz-project"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsSaveDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmSave} disabled={!projectName.trim()}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Project Dialog */}
      <Dialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Project</DialogTitle>
            <DialogDescription>
              Are you sure you want to reset the project? All unsaved changes
              will be lost.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsResetDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmReset}>
              Reset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default memo(EditorToolbar);

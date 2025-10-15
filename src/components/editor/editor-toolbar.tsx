import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarShortcut,
  MenubarTrigger,
} from '@/components/ui/menubar';
import { useEditorHistory } from '@/lib/hooks/use-editor-history';
import { useKeyboardShortcuts } from '@/lib/hooks/use-keyboard-shortcuts';
import {
  loadProject,
  loadProjectFromUrl,
  resetProject,
  saveProject,
} from '@/lib/project-persistence';
import { useEffect, useRef, useState } from 'react';

interface SampleProject {
  name: string;
  filename: string;
  url: string;
}

const EditorToolbar = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [sampleProjects, setSampleProjects] = useState<SampleProject[]>([]);
  const [isLoadingSamples, setIsLoadingSamples] = useState(false);

  // Use editor history for undo/redo
  const { undo, redo, canUndo, canRedo } = useEditorHistory();

  // Add keyboard shortcuts for undo/redo
  useKeyboardShortcuts({
    shortcuts: [
      {
        key: 'z',
        ctrl: true,
        callback: undo,
        enabled: canUndo,
      },
      {
        key: 'z',
        ctrl: true,
        shift: true,
        callback: redo,
        enabled: canRedo,
      },
      {
        key: 'y',
        ctrl: true,
        callback: redo,
        enabled: canRedo,
      },
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
    const projectName = prompt('Enter project name:', 'my-viz-project');
    if (projectName) {
      saveProject(projectName);
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
    const confirmed = confirm(
      'Are you sure you want to reset the project? All unsaved changes will be lost.',
    );
    if (confirmed) {
      resetProject();
    }
  };

  return (
    <>
      <Menubar>
        <MenubarMenu>
          <MenubarTrigger>File</MenubarTrigger>
          <MenubarContent>
            <MenubarItem onClick={handleResetProject}>Init</MenubarItem>
            <MenubarSeparator />
            <MenubarItem onClick={handleSaveProject}>
              Save As... <MenubarShortcut>⇧⌘S</MenubarShortcut>
            </MenubarItem>
            <MenubarItem onClick={handleLoadProject}>Open...</MenubarItem>
            <MenubarSeparator />
            <MenubarItem>
              Print... <MenubarShortcut>⌘P</MenubarShortcut>
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>

        <MenubarMenu>
          <MenubarTrigger>Edit</MenubarTrigger>
          <MenubarContent>
            <MenubarItem onClick={undo} disabled={!canUndo}>
              Undo <MenubarShortcut>⌘Z</MenubarShortcut>
            </MenubarItem>
            <MenubarItem onClick={redo} disabled={!canRedo}>
              Redo <MenubarShortcut>⇧⌘Z</MenubarShortcut>
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
            <MenubarItem inset>Toggle Fullscreen</MenubarItem>
          </MenubarContent>
        </MenubarMenu>
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
      </Menubar>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        style={{ display: 'none' }}
        accept=".vizengine.json"
      />
    </>
  );
};

export default EditorToolbar;

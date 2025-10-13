import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarShortcut,
  MenubarTrigger,
} from '@/components/ui/menubar';
import {
  loadProject,
  loadProjectFromUrl,
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

  return (
    <>
      <Menubar>
        <MenubarMenu>
          <MenubarTrigger>File</MenubarTrigger>
          <MenubarContent>
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
            <MenubarItem>
              Undo <MenubarShortcut>⌘Z</MenubarShortcut>
            </MenubarItem>
            <MenubarItem>
              Redo <MenubarShortcut>⇧⌘Z</MenubarShortcut>
            </MenubarItem>
            <MenubarSeparator />
            <MenubarItem>Cut</MenubarItem>
            <MenubarItem>Copy</MenubarItem>
            <MenubarItem>Paste</MenubarItem>
          </MenubarContent>
        </MenubarMenu>
        <MenubarMenu>
          <MenubarTrigger>View</MenubarTrigger>
          <MenubarContent>
            <MenubarItem inset>Toggle Fullscreen</MenubarItem>
          </MenubarContent>
        </MenubarMenu>
        <MenubarMenu>
          <MenubarTrigger>Sample Projects</MenubarTrigger>
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

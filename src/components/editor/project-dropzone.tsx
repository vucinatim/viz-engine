'use client';

import { loadProject } from '@/lib/project-persistence';
import { cn } from '@/lib/utils';
import { FileJson } from 'lucide-react';
import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';

export const DROPZONE_ACCEPTED_PROJECT_TYPES = {
  'application/json': ['.vizengine'],
};

const ProjectDropzone = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      loadProject(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps, isDragActive, isDragAccept, isDragReject } =
    useDropzone({
      onDrop,
      accept: DROPZONE_ACCEPTED_PROJECT_TYPES,
      noClick: true,
      noKeyboard: true,
      maxFiles: 1,
    });

  return (
    <div {...getRootProps()} className={cn('absolute inset-0', className)}>
      {children}
      {isDragActive && isDragActive && (
        <div
          className={cn(
            'absolute inset-0 z-50 flex flex-col items-center justify-center gap-y-2 bg-white/20 backdrop-blur-sm',
            // If the file is not a vizengine file, let the events pass through to the audio dropzone.
            isDragReject &&
              'pointer-events-none bg-transparent backdrop-blur-0',
          )}>
          {isDragAccept && (
            <div className="z-50 flex flex-col items-center justify-center gap-2">
              <div>
                <FileJson className="h-8 w-8 text-white" />
              </div>
              <p className="text-white">
                Drop to load <b>.vizengine.json</b> project
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ProjectDropzone;

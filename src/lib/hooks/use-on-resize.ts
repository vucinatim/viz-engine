import { useEffect } from 'react';
import { workspaceResizeCoordinator } from '../workspace-resize-coordinator';

const useOnResize = (
  elementRef: React.RefObject<Element>,
  callback: (entries: ResizeObserverEntry[], element: Element) => void,
) => {
  useEffect(() => {
    if (!elementRef.current) return;

    let latestEntries: ResizeObserverEntry[] = [];
    const publishResize = () => {
      if (!elementRef.current || latestEntries.length === 0) {
        return;
      }
      callback(latestEntries, elementRef.current);
    };

    const resizeObserver = new ResizeObserver((entries) => {
      latestEntries = entries;
      workspaceResizeCoordinator.schedule(publishResize);
    });
    resizeObserver.observe(elementRef.current);
    return () => {
      workspaceResizeCoordinator.cancel(publishResize);
      resizeObserver.disconnect();
    };
  }, [callback, elementRef]);
};

export default useOnResize;

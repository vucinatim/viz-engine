import { useEffect } from "react";

const useOnResize = (
  elementRef: React.RefObject<Element>,
  callback: (entries: ResizeObserverEntry[], element: Element) => void
) => {
  useEffect(() => {
    if (!elementRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      if (!elementRef.current) return;

      callback(entries, elementRef.current);
    });
    resizeObserver.observe(elementRef.current);
    return () => {
      resizeObserver.disconnect();
    };
  }, [callback, elementRef]);
};

export default useOnResize;

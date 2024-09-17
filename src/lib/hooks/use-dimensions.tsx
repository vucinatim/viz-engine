import { useCallback, useState, useEffect } from "react";
import useOnResize from "./use-on-resize";

type Size = {
  width: number | undefined;
  height: number | undefined;
};

// Use generics for more flexible ref types
function useDimensions<T extends HTMLElement>(ref: React.RefObject<T>): Size {
  // Initial state
  const [size, setSize] = useState<Size>({
    width: undefined,
    height: undefined,
  });

  // Use useCallback to create a stable function
  const handleResize = useCallback(() => {
    console.log("handleResize");
    if (ref.current) {
      setSize({
        width: ref.current.offsetWidth,
        height: ref.current.offsetHeight,
      });
    }
  }, [ref]);

  useOnResize(ref, handleResize);

  return size;
}

export default useDimensions;

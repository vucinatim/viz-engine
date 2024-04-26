import { useMemo } from "react";

const useDimensions = (ref: React.RefObject<HTMLElement>) => {
  return useMemo(() => {
    if (!ref.current) {
      return {
        width: 0,
        height: 0,
      };
    }

    const { width, height } = ref.current.getBoundingClientRect();

    return {
      width,
      height,
    };
  }, [ref]);
};

export default useDimensions;

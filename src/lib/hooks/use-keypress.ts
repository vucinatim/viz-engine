import { useEffect } from "react";

const useKeypress = (key: string, callback: () => void) => {
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.code === key && document?.activeElement?.tagName !== "INPUT") {
        event.preventDefault(); // Prevent default to stop scrolling when space is pressed
        callback();
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [key, callback]);
};

export default useKeypress;

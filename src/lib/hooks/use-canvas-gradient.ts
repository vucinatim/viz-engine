import { useState, useEffect } from "react";

function useCanvasGradient() {
  const [gradient, setGradient] = useState<CanvasGradient | null>(null);

  useEffect(() => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const grad = ctx.createLinearGradient(0, 0, 0, 100);
    grad.addColorStop(0, "rgb(242, 56, 180)");
    grad.addColorStop(1, "rgb(22, 44, 168)");

    setGradient(grad);
  }, []);

  return gradient;
}

export default useCanvasGradient;

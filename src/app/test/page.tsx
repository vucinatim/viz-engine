'use client';

import { testComp } from '@/components/config/create-component';
import DynamicForm from '@/components/config/dynamic-form';
import { useEffect, useRef } from 'react';

export default function Test() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null); // Reference to the canvas element

  // Function to render the canvas
  const renderCanvas = (ctx: CanvasRenderingContext2D, color: string) => {
    // Set the canvas color and fill the background
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return; // Exit if canvas is not available

    const ctx = canvas.getContext('2d');
    if (!ctx) return; // Exit if context is not available

    // Set canvas dimensions to the window size
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Animation frame loop to continuously update the canvas
    const updateCanvas = () => {
      // const values = valuesRef.current as { appearance: { color: string } };
      // const color = values.appearance.color || '#000000'; // Default to black if color is not set
      const nColor = testComp.config.getValues();
      renderCanvas(ctx, nColor.appearance.color);
      requestAnimationFrame(updateCanvas); // Continuously update
    };

    updateCanvas(); // Start the animation loop
  }, []); // Empty dependency array ensures the effect runs once on mount

  return (
    <div className="flex h-screen w-screen items-center justify-center">
      <canvas ref={canvasRef} className="absolute -z-10 h-full w-full" />
      <DynamicForm config={testComp.config} />
    </div>
  );
}

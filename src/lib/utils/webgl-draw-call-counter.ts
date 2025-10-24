/**
 * WebGL Draw Call Counter
 * Wraps WebGL context methods to count draw calls without modifying components
 */

export interface DrawCallCounter {
  getCount: () => number;
  reset: () => void;
  cleanup: () => void;
}

/**
 * Wraps a WebGL context to count draw calls
 * Works with both WebGL and WebGL2 contexts
 * Does not modify the behavior, only counts calls
 */
export function createDrawCallCounter(
  gl: WebGLRenderingContext | WebGL2RenderingContext,
): DrawCallCounter {
  let drawCallCount = 0;

  // Store original methods
  const originalDrawArrays = gl.drawArrays.bind(gl);
  const originalDrawElements = gl.drawElements.bind(gl);

  // WebGL2-specific methods
  let originalDrawArraysInstanced: any = null;
  let originalDrawElementsInstanced: any = null;
  let originalDrawRangeElements: any = null;

  // Check if WebGL2 methods exist
  if ('drawArraysInstanced' in gl) {
    originalDrawArraysInstanced = (
      gl as WebGL2RenderingContext
    ).drawArraysInstanced.bind(gl);
    originalDrawElementsInstanced = (
      gl as WebGL2RenderingContext
    ).drawElementsInstanced.bind(gl);
    originalDrawRangeElements = (
      gl as WebGL2RenderingContext
    ).drawRangeElements.bind(gl);
  }

  // Wrap drawArrays
  gl.drawArrays = function (mode: number, first: number, count: number) {
    drawCallCount++;
    return originalDrawArrays(mode, first, count);
  };

  // Wrap drawElements
  gl.drawElements = function (
    mode: number,
    count: number,
    type: number,
    offset: number,
  ) {
    drawCallCount++;
    return originalDrawElements(mode, count, type, offset);
  };

  // Wrap WebGL2 methods if available
  if (originalDrawArraysInstanced) {
    (gl as WebGL2RenderingContext).drawArraysInstanced = function (
      mode: number,
      first: number,
      count: number,
      instanceCount: number,
    ) {
      drawCallCount++;
      return originalDrawArraysInstanced(mode, first, count, instanceCount);
    };
  }

  if (originalDrawElementsInstanced) {
    (gl as WebGL2RenderingContext).drawElementsInstanced = function (
      mode: number,
      count: number,
      type: number,
      offset: number,
      instanceCount: number,
    ) {
      drawCallCount++;
      return originalDrawElementsInstanced(
        mode,
        count,
        type,
        offset,
        instanceCount,
      );
    };
  }

  if (originalDrawRangeElements) {
    (gl as WebGL2RenderingContext).drawRangeElements = function (
      mode: number,
      start: number,
      end: number,
      count: number,
      type: number,
      offset: number,
    ) {
      drawCallCount++;
      return originalDrawRangeElements(mode, start, end, count, type, offset);
    };
  }

  return {
    getCount: () => drawCallCount,
    reset: () => {
      drawCallCount = 0;
    },
    cleanup: () => {
      // Restore original methods
      gl.drawArrays = originalDrawArrays;
      gl.drawElements = originalDrawElements;

      if (originalDrawArraysInstanced) {
        (gl as WebGL2RenderingContext).drawArraysInstanced =
          originalDrawArraysInstanced;
      }
      if (originalDrawElementsInstanced) {
        (gl as WebGL2RenderingContext).drawElementsInstanced =
          originalDrawElementsInstanced;
      }
      if (originalDrawRangeElements) {
        (gl as WebGL2RenderingContext).drawRangeElements =
          originalDrawRangeElements;
      }
    },
  };
}

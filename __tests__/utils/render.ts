import { Canvas } from '@antv/g';
import { Renderer as CanvasRenderer } from '@antv/g-canvas';
import { Renderer as SvgRenderer } from '@antv/g-svg';
import { createDiv } from './dom';

const canvasRenderer = new CanvasRenderer({
  enableDirtyRectangleRenderingDebug: false,
  enableAutoRendering: true,
  enableDirtyRectangleRendering: true,
});

const svgRenderer = new SvgRenderer({
  enableDirtyRectangleRenderingDebug: false,
  enableAutoRendering: true,
  enableDirtyRectangleRendering: true,
});

export function createCanvas(size = 300, renderer = 'canvas') {
  return new Canvas({
    container: createDiv(),
    width: size,
    height: size,
    renderer: renderer === 'svg' ? svgRenderer : canvasRenderer,
  });
}
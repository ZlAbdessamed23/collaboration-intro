import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { useGesture } from '@use-gesture/react';
import { FaPlus, FaMinus } from 'react-icons/fa6';

interface Point {
  x: number;
  y: number;
}

interface Position {
  x: number;
  y: number;
}

interface Viewport {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

const PanExample: React.FC = () => {
  const [position, setPosition] = useState<Position>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState<number>(1);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [viewport, setViewport] = useState<Viewport>({ left: 0, top: 0, right: 0, bottom: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const MIN_ZOOM = 0.3;
  const MAX_ZOOM = 1.8;
  const ZOOM_STEP = 0.05;
  const SPACING = 50;
  const DOT_SIZE = 2;
  const BUFFER_FACTOR = 1.5;
  
  // Define the world boundaries (huge canvas)
  const WORLD_SIZE = 10000; // 10000x10000 pixels
  const WORLD_BOUNDS = {
    left: -WORLD_SIZE / 2,
    right: WORLD_SIZE / 2,
    top: -WORLD_SIZE / 2,
    bottom: WORLD_SIZE / 2
  };

  // Clamp position within bounds
  const clampPosition = useCallback((pos: Position, containerWidth: number, containerHeight: number): Position => {
    const scaledWidth = WORLD_SIZE * zoom;
    const scaledHeight = WORLD_SIZE * zoom;
    
    return {
      x: Math.min(WORLD_SIZE/4, Math.max(-scaledWidth + containerWidth - WORLD_SIZE/4, pos.x)),
      y: Math.min(WORLD_SIZE/4, Math.max(-scaledHeight + containerHeight - WORLD_SIZE/4, pos.y))
    };
  }, [zoom]);

  // Calculate viewport boundaries in world coordinates
  const updateViewport = useCallback(() => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const viewportLeft = -position.x / zoom;
    const viewportTop = -position.y / zoom;
    const viewportRight = (rect.width - position.x) / zoom;
    const viewportBottom = (rect.height - position.y) / zoom;

    const bufferX = (viewportRight - viewportLeft) * (BUFFER_FACTOR - 1) / 2;
    const bufferY = (viewportBottom - viewportTop) * (BUFFER_FACTOR - 1) / 2;

    setViewport({
      left: Math.max(WORLD_BOUNDS.left, viewportLeft - bufferX),
      top: Math.max(WORLD_BOUNDS.top, viewportTop - bufferY),
      right: Math.min(WORLD_BOUNDS.right, viewportRight + bufferX),
      bottom: Math.min(WORLD_BOUNDS.bottom, viewportBottom + bufferY)
    });
  }, [position.x, position.y, zoom]);

  useEffect(() => {

    updateViewport();
    window.addEventListener('resize', updateViewport);
    return () => window.removeEventListener('resize', updateViewport);
    
  }, [updateViewport]);

  const points = useMemo<Point[]>(() => {
    const pointsArray: Point[] = [];
    const startX = Math.floor(viewport.left / SPACING) * SPACING;
    const startY = Math.floor(viewport.top / SPACING) * SPACING;
    const endX = Math.ceil(viewport.right / SPACING) * SPACING;
    const endY = Math.ceil(viewport.bottom / SPACING) * SPACING;

    for (let x = startX; x <= endX; x += SPACING) {
      for (let y = startY; y <= endY; y += SPACING) {
        pointsArray.push({ x, y });
      }
    }
    return pointsArray;
  }, [viewport]);

  const drawPoints = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, rect.width, rect.height);
    
    ctx.save();
    ctx.translate(position.x, position.y);
    ctx.scale(zoom, zoom);
    
    ctx.fillStyle = '#ef4444';
    points.forEach(point => {
      ctx.beginPath();
      ctx.arc(point.x, point.y, DOT_SIZE / zoom, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.restore();
  }, [points, position.x, position.y, zoom]);

  useEffect(() => {
    drawPoints();
  }, [drawPoints]);

  const handleZoom = (delta: number) => {
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const x = window.innerWidth / 2 - rect.left;
    const y = window.innerHeight / 2 - rect.top;

    const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom + delta));

    const zoomPoint = {
      x: (x - position.x) / zoom,
      y: (y - position.y) / zoom
    };

    const newPosition = {
      x: x - zoomPoint.x * newZoom,
      y: y - zoomPoint.y * newZoom
    };

    const clampedPosition = clampPosition(newPosition, rect.width, rect.height);
    setZoom(newZoom);
    setPosition(clampedPosition);
  };

  const bind = useGesture({
    onDrag: ({ delta: [dx, dy], event, down }) => {
      if (event instanceof KeyboardEvent || !event.ctrlKey) return;

      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      setPosition(prev => {
        const newPos = {
          x: prev.x + dx,
          y: prev.y + dy
        };
        return clampPosition(newPos, rect.width, rect.height);
      });
      setIsDragging(down);
    },
    onDragStart: ({ event }) => {
      if (event instanceof KeyboardEvent || !event.ctrlKey) return;
      setIsDragging(true);
    },
    onDragEnd: () => {
      setIsDragging(false);
    },
    onWheel: ({ event }) => {
      if (!event.ctrlKey || !(event instanceof WheelEvent)) return;
      event.preventDefault();

      const container = containerRef.current;
      if (!container) return;

      const delta = event.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP;

      const rect = container.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom + delta));

      const zoomPoint = {
        x: (x - position.x) / zoom,
        y: (y - position.y) / zoom
      };

      const newPosition = {
        x: x - zoomPoint.x * newZoom,
        y: y - zoomPoint.y * newZoom
      };

      const clampedPosition = clampPosition(newPosition, rect.width, rect.height);
      setZoom(newZoom);
      setPosition(clampedPosition);
    }
  });

  return (
    <div className="fixed inset-0 h-screen w-screen overflow-hidden">
      <div className="fixed top-4 right-4 flex gap-2 bg-white z-50">
        <button
          onClick={() => handleZoom(ZOOM_STEP)}
          className="bg-white p-2 rounded-lg shadow-lg hover:bg-gray-100 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={zoom >= MAX_ZOOM}
        >
          <FaPlus size={24} />
        </button>
        <span className='flex justify-center items-center text-black'>
          Zoom: {(zoom * 100).toFixed(0)}%
        </span>
        <button
          onClick={() => handleZoom(-ZOOM_STEP)}
          className="bg-white p-2 rounded-lg shadow-lg hover:bg-gray-100 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={zoom <= MIN_ZOOM}
        >
          <FaMinus size={24} />
        </button>
      </div>
      <div
        {...bind()}
        ref={containerRef}
        className="relative bg-white w-full h-full"
      >
        <canvas
          ref={canvasRef}
          className="absolute inset-0"
        />
         <div>
         </div>
      </div>
    </div>
  );
};

export default PanExample;
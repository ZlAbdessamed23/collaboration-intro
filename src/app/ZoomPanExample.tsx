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

interface Shape {
  id: string;
  type: 'rectangle' | 'circle' | 'text' | 'image' | 'pen' | 'arrow';
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  image?: HTMLImageElement;
  points?: Array<{ x: number; y: number }>;
}

const PanExample: React.FC = () => {
  const [position, setPosition] = useState<Position>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState<number>(1);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [viewport, setViewport] = useState<Viewport>({ left: 0, top: 0, right: 0, bottom: 0 });
  const [tool, setTool] = useState<'cursor' | 'draw' | 'eraser' | 'rectangle' | 'circle' | 'text' | 'image' | 'pen' | 'arrow'>('cursor');
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [fillColor, setFillColor] = useState('#FFFFFF');
  const [strokeColor, setStrokeColor] = useState('#000000');
  const [textInput, setTextInput] = useState('');
  const [isTextInputVisible, setIsTextInputVisible] = useState(false);
  const [textInputPosition, setTextInputPosition] = useState({ x: 0, y: 0 });
  const [currentPenPath, setCurrentPenPath] = useState<Array<{ x: number; y: number }>>([]);
  const [isShiftPressed, setIsShiftPressed] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const MIN_ZOOM = 0.3;
  const MAX_ZOOM = 1.8;
  const ZOOM_STEP = 0.05;
  const SPACING = 50;
  const DOT_SIZE = 2;
  const BUFFER_FACTOR = 1.5;

  const WORLD_SIZE = 10000;
  const WORLD_BOUNDS = {
    left: -WORLD_SIZE / 2,
    right: WORLD_SIZE / 2,
    top: -WORLD_SIZE / 2,
    bottom: WORLD_SIZE / 2
  };

  const clampPosition = useCallback((pos: Position, containerWidth: number, containerHeight: number): Position => {
    const scaledWidth = WORLD_SIZE * zoom;
    const scaledHeight = WORLD_SIZE * zoom;

    return {
      x: Math.min(WORLD_SIZE / 4, Math.max(-scaledWidth + containerWidth - WORLD_SIZE / 4, pos.x)),
      y: Math.min(WORLD_SIZE / 4, Math.max(-scaledHeight + containerHeight - WORLD_SIZE / 4, pos.y))
    };
  }, [zoom]);

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

    shapes.forEach(shape => {
      if (shape.type === 'rectangle') {
        ctx.fillStyle = shape.fill;
        ctx.strokeStyle = shape.stroke;
        ctx.lineWidth = shape.strokeWidth;
        ctx.fillRect(shape.x, shape.y, shape.width, shape.height);
        ctx.strokeRect(shape.x, shape.y, shape.width, shape.height);
      } else if (shape.type === 'circle') {
        ctx.beginPath();
        ctx.arc(shape.x + shape.width / 2, shape.y + shape.height / 2, Math.abs(shape.width) / 2, 0, Math.PI * 2);
        ctx.fillStyle = shape.fill;
        ctx.strokeStyle = shape.stroke;
        ctx.lineWidth = shape.strokeWidth;
        ctx.fill();
        ctx.stroke();
      } else if (shape.type === 'text') {
        ctx.font = `${shape.fontSize}px ${shape.fontFamily}`;
        ctx.fillStyle = shape.fill;
        ctx.fillText(shape.text || '', shape.x, shape.y);
      } else if (shape.type === 'image' && shape.image) {
        ctx.drawImage(shape.image, shape.x, shape.y, shape.width, shape.height);
      } else if (shape.type === 'pen' && shape.points) {
        ctx.beginPath();
        ctx.moveTo(shape.points[0].x, shape.points[0].y);
        shape.points.forEach(point => {
          ctx.lineTo(point.x, point.y);
        });
        ctx.strokeStyle = shape.stroke;
        ctx.lineWidth = shape.strokeWidth;
        ctx.stroke();
      } else if (shape.type === 'arrow' && shape.points) {
        ctx.beginPath();
        ctx.moveTo(shape.points[0].x, shape.points[0].y);
        ctx.lineTo(shape.points[1].x, shape.points[1].y);
        ctx.strokeStyle = shape.stroke;
        ctx.lineWidth = shape.strokeWidth;
        ctx.stroke();
      }
    });

    ctx.restore();
  }, [points, position.x, position.y, zoom, shapes]);

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

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left - position.x) / zoom;
    const y = (e.clientY - rect.top - position.y) / zoom;

    if (tool === 'rectangle' || tool === 'circle') {
      const newShape: Shape = {
        id: `shape-${Date.now()}`,
        type: tool,
        x,
        y,
        width: 0,
        height: 0,
        fill: fillColor,
        stroke: strokeColor,
        strokeWidth: 2,
      };
      setShapes([...shapes, newShape]);
      setIsDrawing(true);
    } else if (tool === 'pen') {
      setCurrentPenPath([{ x, y }]);
      setIsDrawing(true);
    } else if (tool === 'arrow') {
      const newShape: Shape = {
        id: `arrow-${Date.now()}`,
        type: 'arrow',
        x,
        y,
        width: 0,
        height: 0,
        fill: strokeColor,
        stroke: strokeColor,
        strokeWidth: 2,
        points: [{ x, y }, { x, y }],
      };
      setShapes([...shapes, newShape]);
      setIsDrawing(true);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left - position.x) / zoom;
    const y = (e.clientY - rect.top - position.y) / zoom;

    if (tool === 'rectangle' || tool === 'circle') {
      const lastShape = shapes[shapes.length - 1];
      if (lastShape) {
        const newWidth = x - lastShape.x;
        const newHeight = y - lastShape.y;
        const updatedShapes = [...shapes];
        updatedShapes[shapes.length - 1] = {
          ...lastShape,
          width: newWidth,
          height: newHeight,
        };
        setShapes(updatedShapes);
      }
    } else if (tool === 'pen') {
      setCurrentPenPath(prev => [...prev, { x, y }]);
    } else if (tool === 'arrow') {
      const lastShape = shapes[shapes.length - 1];
      if (lastShape && lastShape.points) {
        const updatedShapes = [...shapes];
        updatedShapes[shapes.length - 1] = {
          ...lastShape,
          points: [lastShape.points[0], { x, y }],
        };
        setShapes(updatedShapes);
      }
    }
  };

  const handleMouseUp = () => {
    if (tool === 'pen' && currentPenPath.length > 0) {
      const newShape: Shape = {
        id: `pen-${Date.now()}`,
        type: 'pen',
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        fill: fillColor,
        stroke: strokeColor,
        strokeWidth: 2,
        points: [...currentPenPath],
      };
      setShapes([...shapes, newShape]);
      setCurrentPenPath([]);
    }
    setIsDrawing(false);
  };

  const handleTextInputConfirm = () => {
    if (textInput.trim()) {
      const newShape: Shape = {
        id: `text-${Date.now()}`,
        type: 'text',
        x: textInputPosition.x,
        y: textInputPosition.y,
        width: 100,
        height: 40,
        fill: fillColor,
        stroke: strokeColor,
        strokeWidth: 0,
        text: textInput,
        fontSize: 20,
        fontFamily: 'Arial',
      };
      setShapes([...shapes, newShape]);
    }
    setIsTextInputVisible(false);
    setTextInput('');
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const imageUrl = event.target?.result as string;
        const img = new window.Image();
        img.src = imageUrl;
        img.onload = () => {
          const newShape: Shape = {
            id: `image-${Date.now()}`,
            type: 'image',
            x: 0,
            y: 0,
            width: img.width,
            height: img.height,
            fill: imageUrl,
            stroke: '#000000',
            strokeWidth: 0,
            image: img,
          };
          setShapes([...shapes, newShape]);
        };
      };
      reader.readAsDataURL(file);
    }
  };

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
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        />
        {isTextInputVisible && (
          <div
            style={{
              position: 'absolute',
              left: textInputPosition.x,
              top: textInputPosition.y,
            }}
          >
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onBlur={handleTextInputConfirm}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleTextInputConfirm();
                }
              }}
              autoFocus
              className="w-96 h-40 border border-black p-4 text-black bg-white"
            />
          </div>
        )}
        <input
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          style={{ display: 'none' }}
          ref={fileInputRef}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="fixed top-20 right-4 bg-white p-2 rounded-lg shadow-lg hover:bg-gray-100 transition-colors duration-200"
        >
          Upload Image
        </button>
      </div>
    </div>
  );
};

export default PanExample;
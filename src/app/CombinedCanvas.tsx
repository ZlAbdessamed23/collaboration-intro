import React, { useState, useRef, useEffect } from 'react';
import { Stage, Layer, Line, Circle } from 'react-konva';
import { useGesture } from '@use-gesture/react';

interface LineProps {
  points: number[];
}

const CombinedCanvas: React.FC = () => {
  const [isDrawing, setIsDrawing] = useState(false);
  const [lines, setLines] = useState<LineProps[]>([]);
  const stageRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const MIN_ZOOM = 0.3;
  const MAX_ZOOM = 1.8;
  const ZOOM_STEP = 0.05;
  const SPACING = 50;
  const DOT_SIZE = 2;

  const handleMouseDown = (e: any) => {
    setIsDrawing(true);
    const pos = stageRef.current.getPointerPosition();
    const adjustedPos = {
      x: (pos.x - position.x) / zoom,
      y: (pos.y - position.y) / zoom
    };
    setLines([...lines, { points: [adjustedPos.x, adjustedPos.y] }]);
  };

  const handleMouseMove = (e: any) => {
    if (!isDrawing) return;
    const stage = stageRef.current;
    const pos = stage.getPointerPosition();
    const adjustedPos = {
      x: (pos.x - position.x) / zoom,
      y: (pos.y - position.y) / zoom
    };
    let lastLine = lines[lines.length - 1];
    lastLine.points = lastLine.points.concat([adjustedPos.x, adjustedPos.y]);
    lines.splice(lines.length - 1, 1, lastLine);
    setLines(lines.concat());
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
  };

  const generateDots = () => {
    const dots = [];
    for (let x = 0; x < window.innerWidth / zoom; x += SPACING) {
      for (let y = 0; y < window.innerHeight / zoom; y += SPACING) {
        dots.push(
          <Circle
            key={`${x}-${y}`}
            x={x}
            y={y}
            radius={DOT_SIZE}
            fill="red"
            listening={false}
          />
        );
      }
    }
    return dots;
  };

  const handleZoom = (delta: number) => {
    const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom + delta));
    setZoom(newZoom);
  };

  const bind = useGesture({
    onDrag: ({ delta: [dx, dy], event, down }) => {
      if (!(event.ctrlKey && down)) return;

      setPosition(prev => ({
        x: prev.x + dx,
        y: prev.y + dy
      }));
    },
    onWheel: ({ event }) => {
      if (!event.ctrlKey || !(event instanceof WheelEvent)) return;
      event.preventDefault();
      const delta = event.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP;
      handleZoom(delta);
    }
  });

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      const handleResize = () => {
        const rect = container.getBoundingClientRect();
        setPosition({ x: rect.width / 2, y: rect.height / 2 });
      };
      window.addEventListener('resize', handleResize);
      handleResize();
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);

  return (
    <div ref={containerRef} className="relative w-full h-full" {...bind()}>
      <div className="fixed top-4 right-4 flex gap-2 bg-white z-50 p-2 rounded shadow-lg">
        <button
          onClick={() => handleZoom(ZOOM_STEP)}
          className="p-2 rounded bg-gray-100 hover:bg-gray-200 transition duration-200"
          disabled={zoom >= MAX_ZOOM}
        >
          Zoom In
        </button>
        <button
          onClick={() => handleZoom(-ZOOM_STEP)}
          className="p-2 rounded bg-gray-100 hover:bg-gray-200 transition duration-200"
          disabled={zoom <= MIN_ZOOM}
        >
          Zoom Out
        </button>
      </div>
      <Stage
        ref={stageRef}
        width={window.innerWidth}
        height={window.innerHeight}
        scaleX={zoom}
        scaleY={zoom}
        x={position.x}
        y={position.y}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        <Layer>
          {generateDots()}
          {lines.map((line, i) => (
            <Line
              key={i}
              points={line.points}
              stroke="black"
              strokeWidth={5}
              tension={0.5}
              lineCap="round"
            />
          ))}
        </Layer>
      </Stage>
    </div>
  );
};

export default CombinedCanvas;

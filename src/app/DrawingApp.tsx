'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Stage, Layer, Line, Rect, Circle, Text, Transformer, Image as KonvaImage, Arrow, Group } from 'react-konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import { useGesture } from '@use-gesture/react';
import { FaPlus, FaMinus } from 'react-icons/fa';

type ToolType = 'cursor' | 'draw' | 'eraser' | 'rectangle' | 'circle' | 'text' | 'image' | 'pen';

interface Tool {
    name: ToolType;
    icon: string;
}

interface DrawLine {
    tool: ToolType;
    points: number[];
    color: string;
}

interface Shape {
    id: string;
    type: 'rectangle' | 'circle' | 'text' | 'image' | 'pen';
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
    image?: HTMLImageElement; // For image shapes
    points?: Array<{ x: number; y: number }>;
};

const DrawingApp = () => {
    const [tool, setTool] = useState<ToolType>('cursor');
    const [lines, setLines] = useState<DrawLine[]>([]);
    const [shapes, setShapes] = useState<Shape[]>([]);
    const [isDrawing, setIsDrawing] = useState(false);
    const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null);
    const [fillColor, setFillColor] = useState('#FFFFFF');
    const [strokeColor, setStrokeColor] = useState('#000000');
    const [textInput, setTextInput] = useState('');
    const [isTextInputVisible, setIsTextInputVisible] = useState(false);
    const [textInputPosition, setTextInputPosition] = useState({ x: 0, y: 0 });
    const [isEditingText, setIsEditingText] = useState(false);
    const [currentText, setCurrentText] = useState('');
    const [textProps, setTextProps] = useState({
        fontSize: 20,
        fontFamily: 'Arial',
        fill: '#000000',
    });
    const [currentPenPath, setCurrentPenPath] = useState<Array<{ x: number; y: number }>>([]);
    const [mousePosition, setMousePosition] = useState<{ x: number; y: number } | null>(null);
    const [isShiftPressed, setIsShiftPressed] = useState(false);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const stageRef = useRef<any>(null);
    const transformerRef = useRef<any>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const isCtrlPressed = useRef(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const MIN_ZOOM = 0.3;
    const MAX_ZOOM = 1.8;
    const ZOOM_STEP = 0.05;
    const SPACING = 50;
    const DOT_SIZE = 2;


    const generateDots = () => {
        const dots = [];
        const CANVAS_WIDTH = 2000;
        const CANVAS_HEIGHT = 2000;

        // Calculate the starting positions by negating the stage position
        const startX = -position.x / zoom;
        const startY = -position.y / zoom;

        // Calculate how many dots we need in each direction
        const dotsX = Math.ceil(CANVAS_WIDTH / SPACING);
        const dotsY = Math.ceil(CANVAS_HEIGHT / SPACING);

        for (let i = 0; i <= dotsX; i++) {
            for (let j = 0; j <= dotsY; j++) {
                const x = startX + (i * SPACING);
                const y = startY + (j * SPACING);

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

    const adjustCoordinates = (stage: any, x: number, y: number) => {
        const scaleX = stage.scaleX();
        const scaleY = stage.scaleY();
        const offsetX = stage.x();
        const offsetY = stage.y();

        return {
            x: (x - offsetX) / scaleX,
            y: (y - offsetY) / scaleY,
        };
    };

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




    const tools: Tool[] = [
        { name: 'cursor', icon: '👆' },
        { name: 'draw', icon: '✏️' },
        { name: 'eraser', icon: '🧹' },
        { name: 'rectangle', icon: '⬜' },
        { name: 'circle', icon: '⭕' },
        { name: 'text', icon: 'T' },
        { name: 'image', icon: '🖼️' }, // New image tool
        { name: 'pen', icon: '🖋️' },
    ];

    const selectTool = (newTool: ToolType) => {
        if (tool === 'pen' && currentPenPath.length > 0) {
            commitPenPath();
        }
        setTool(newTool);
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && tool === 'pen' && currentPenPath.length > 0) {
                commitPenPath();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [tool, currentPenPath, shapes, fillColor, strokeColor]);

    const commitPenPath = () => {
        if (currentPenPath.length > 0) {
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
    };

    // Handle mouse down for drawing, shapes, and text
    const handleMouseDown = (e: KonvaEventObject<MouseEvent>) => {
        const stage = e.target.getStage();
        const pos = stage?.getPointerPosition();
        if (pos) {
            const adjustedPos = adjustCoordinates(stage, pos.x, pos.y);

            if (tool === 'draw') {
                setIsDrawing(true);
                setLines([...lines, { tool, points: [adjustedPos.x, adjustedPos.y], color: strokeColor }]);
            } else if (['rectangle', 'circle'].includes(tool)) {
                const newShape: Shape = {
                    id: `shape-${Date.now()}`,
                    type: tool as Shape['type'],
                    x: adjustedPos.x,
                    y: adjustedPos.y,
                    width: 0,
                    height: 0,
                    fill: fillColor,
                    stroke: strokeColor,
                    strokeWidth: 2,
                };
                setShapes([...shapes, newShape]);
                setIsDrawing(true);
            } else if (tool === 'text') {
                setTextInputPosition({ x: adjustedPos.x, y: adjustedPos.y });
                setIsTextInputVisible(true);
            } else if (tool === 'eraser') {
                const newLines = lines.filter((line) => {
                    return !line.points.some((point, index) => {
                        const x = line.points[index];
                        const y = line.points[index + 1];
                        return Math.abs(x - adjustedPos.x) < 10 && Math.abs(y - adjustedPos.y) < 10;
                    });
                });
                setLines(newLines);

                const newShapes = shapes.filter((shape) => {
                    return !(
                        adjustedPos.x >= shape.x &&
                        adjustedPos.x <= shape.x + shape.width &&
                        adjustedPos.y >= shape.y &&
                        adjustedPos.y <= shape.y + shape.height
                    );
                });
                setShapes(newShapes);
            } else if (tool === 'pen') {
                setCurrentPenPath([...currentPenPath, { x: adjustedPos.x, y: adjustedPos.y }]);
            }
        }
    };

    // Handle mouse move for drawing and resizing shapes
    const handleMouseMove = (e: KonvaEventObject<MouseEvent>) => {
        if (!isDrawing) return;

        const stage = e.target.getStage();
        const pos = stage?.getPointerPosition();
        if (pos) {
            const adjustedPos = adjustCoordinates(stage, pos.x, pos.y);

            if (tool === 'draw') {
                const lastLine = lines[lines.length - 1];
                if (lastLine) {
                    lastLine.points = lastLine.points.concat([adjustedPos.x, adjustedPos.y]);
                    lines.splice(lines.length - 1, 1, lastLine);
                    setLines([...lines]);
                }
            } else if (['rectangle', 'circle'].includes(tool)) {
                const lastShape = shapes[shapes.length - 1];
                if (lastShape) {
                    const newWidth = adjustedPos.x - lastShape.x;
                    const newHeight = adjustedPos.y - lastShape.y;
                    shapes.splice(shapes.length - 1, 1, {
                        ...lastShape,
                        width: newWidth,
                        height: newHeight,
                    });
                    setShapes([...shapes]);
                }
            }
        }
    };
    // Handle mouse up to stop drawing
    const handleMouseUp = () => {
        if (tool === 'pen' && mousePosition) {
            setCurrentPenPath([...currentPenPath, mousePosition]);
        }
        setIsDrawing(false);
        setMousePosition(null);
    };

    // Handle shape click to select it
    const handleShapeClick = (e: KonvaEventObject<MouseEvent>) => {
        if (tool === 'cursor') {
            const id = e.target.id();
            setSelectedShapeId(id);
        }
    };

    // Handle stage click to deselect shapes
    const handleStageClick = (e: KonvaEventObject<MouseEvent>) => {
        const target = e.target;
        if (target === stageRef.current || !(target.name() === 'rect' || target.name() === 'circle' || target.name() === 'text' || target.name() === 'image')) {
            setSelectedShapeId(null);
        }
    };

    // Handle text input confirmation
    const handleTextInputConfirm = () => {
        if (textInput.trim()) {
            const newShape: Shape = {
                id: `shape-${Date.now()}`,
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

    // Handle deleting a shape
    const handleDeleteShape = () => {
        const updatedShapes = shapes.filter((shape) => shape.id !== selectedShapeId);
        setShapes(updatedShapes);
        setSelectedShapeId(null);
    };

    // Handle resizing a shape
    const handleResizeShape = (width: number, height: number) => {
        const updatedShapes = shapes.map((shape) => {
            if (shape.id === selectedShapeId) {
                return {
                    ...shape,
                    width,
                    height,
                };
            }
            return shape;
        });
        setShapes(updatedShapes);
    };

    // Handle text change for text shapes
    const handleTextChange = (text: string) => {
        const updatedShapes = shapes.map((shape) => {
            if (shape.id === selectedShapeId) {
                return {
                    ...shape,
                    text,
                };
            }
            return shape;
        });
        setShapes(updatedShapes);
    };

    // Handle font change for text shapes
    const handleFontChange = (fontFamily: string) => {
        const updatedShapes = shapes.map((shape) => {
            if (shape.id === selectedShapeId) {
                return {
                    ...shape,
                    fontFamily,
                };
            }
            return shape;
        });
        setShapes(updatedShapes);
    };

    // Handle font size change for text shapes
    const handleFontSizeChange = (fontSize: number) => {
        const updatedShapes = shapes.map((shape) => {
            if (shape.id === selectedShapeId) {
                return {
                    ...shape,
                    fontSize,
                };
            }
            return shape;
        });
        setShapes(updatedShapes);
    };

    const handleTextToolClick = (e: KonvaEventObject<MouseEvent>) => {
        if (tool === 'text') {
            const stage = e.target.getStage();
            const pos = stage?.getPointerPosition();
            if (pos) {
                const adjustedPos = adjustCoordinates(stage, pos.x, pos.y);
                setTextInputPosition({ x: adjustedPos.x, y: adjustedPos.y });
                setIsEditingText(true);
                setCurrentText('Enter text here...');
            }
        }
    };

    const handleTextConfirm = () => {
        if (currentText.trim()) {
            const newShape: Shape = {
                id: `text-${Date.now()}`,
                type: 'text',
                x: textInputPosition.x,
                y: textInputPosition.y,
                width: 200,
                height: 40,
                fill: textProps.fill,
                stroke: '#000000',
                strokeWidth: 0,
                text: currentText,
                fontSize: textProps.fontSize,
                fontFamily: textProps.fontFamily,
            };
            setShapes([...shapes, newShape]);
        }
        setIsEditingText(false);
        setCurrentText('');
    };

    // Handle fill color change
    const handleFillColorChange = (color: string) => {
        const updatedShapes = shapes.map((shape) => {
            if (shape.id === selectedShapeId) {
                return {
                    ...shape,
                    fill: color,
                };
            }
            return shape;
        });
        setShapes(updatedShapes);
    };

    // Handle stroke color change
    const handleStrokeColorChange = (color: string) => {
        const updatedShapes = shapes.map((shape) => {
            if (shape.id === selectedShapeId) {
                return {
                    ...shape,
                    stroke: color,
                };
            }
            return shape;
        });
        setShapes(updatedShapes);
    };

    // Handle image upload
    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const imageUrl = event.target?.result as string;
                const img = new window.Image();
                img.src = imageUrl;
                img.onload = () => {
                    const pos = stageRef.current?.getPointerPosition();
                    if (pos) {
                        const newImage: Shape = {
                            id: `image-${Date.now()}`,
                            type: 'image',
                            x: pos.x,
                            y: pos.y,
                            width: img.width,
                            height: img.height,
                            fill: imageUrl,
                            stroke: '#000000',
                            strokeWidth: 0,
                            image: img,
                        };
                        setShapes([...shapes, newImage]);
                    }
                };
            };
            reader.readAsDataURL(file);
        }
    };

    // Function to move the selected shape to the front
    const handleMoveToFront = () => {
        if (selectedShapeId) {
            const shapeIndex = shapes.findIndex((shape) => shape.id === selectedShapeId);
            if (shapeIndex !== -1 && shapeIndex !== shapes.length - 1) {
                const updatedShapes = [...shapes];
                const [shape] = updatedShapes.splice(shapeIndex, 1);
                updatedShapes.push(shape);
                setShapes(updatedShapes);
                // Ensure the transformer is updated
                if (transformerRef.current) {
                    transformerRef.current.getLayer().batchDraw();
                }
            }
        }
    };

    // Function to move the selected shape to the back
    const handleMoveToBack = () => {
        if (selectedShapeId) {
            const shapeIndex = shapes.findIndex((shape) => shape.id === selectedShapeId);
            if (shapeIndex !== -1 && shapeIndex !== 0) {
                const updatedShapes = [...shapes];
                const [shape] = updatedShapes.splice(shapeIndex, 1);
                updatedShapes.unshift(shape);
                setShapes(updatedShapes);
                // Ensure the transformer is updated
                if (transformerRef.current) {
                    transformerRef.current.getLayer().batchDraw();
                }
            }
        }
    };

    // Function to move the selected shape up in z-index
    const handleMoveUp = () => {
        if (selectedShapeId) {
            const shapeIndex = shapes.findIndex((shape) => shape.id === selectedShapeId);
            if (shapeIndex > 0) {
                const updatedShapes = [...shapes];
                const shape = updatedShapes[shapeIndex];
                updatedShapes.splice(shapeIndex, 1);
                updatedShapes.splice(shapeIndex - 1, 0, shape);
                setShapes(updatedShapes);
                // Ensure the transformer is updated
                if (transformerRef.current) {
                    transformerRef.current.getLayer().batchDraw();
                }
            }
        }
    };

    // Function to move the selected shape down in z-index
    const handleMoveDown = () => {
        if (selectedShapeId) {
            const shapeIndex = shapes.findIndex((shape) => shape.id === selectedShapeId);
            if (shapeIndex < shapes.length - 1) {
                const updatedShapes = [...shapes];
                const shape = updatedShapes[shapeIndex];
                updatedShapes.splice(shapeIndex, 1);
                updatedShapes.splice(shapeIndex + 1, 0, shape);
                setShapes(updatedShapes);
                // Ensure the transformer is updated
                if (transformerRef.current) {
                    transformerRef.current.getLayer().batchDraw();
                }
            }
        }
    };

    useEffect(() => {
        if (selectedShapeId && transformerRef.current) {
            const selectedNode = stageRef.current.findOne(`#${selectedShapeId}`);
            if (selectedNode) {
                transformerRef.current.nodes([selectedNode]);
                transformerRef.current.getLayer().batchDraw();
            }
        }
    }, [selectedShapeId]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Shift') {
                setIsShiftPressed(true);
            } else if (e.key === 'Control') {
                isCtrlPressed.current = true;
            };
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.key === 'Shift') {
                setIsShiftPressed(false);
            } else if (e.key === 'Control') {
                isCtrlPressed.current = false;
            };

        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, []);

    const selectedShape = shapes.find((shape) => shape.id === selectedShapeId);

    return (
        <div className="h-screen w-full relative" ref={containerRef} {...bind()}>
            <div className="w-16 bg-gray-800 p-2 flex flex-col gap-4 rounded-md fixed left-2 top-14 z-50">
                {tools.map((item) => (
                    <button
                        key={item.name}
                        onClick={() => selectTool(item.name)}
                        className={`w-full aspect-square flex items-center justify-center text-xl rounded
                            ${tool === item.name ? 'bg-blue-500 text-white' : 'bg-gray-700 text-gray-300'}
                            hover:bg-blue-400 transition-colors`}
                    >
                        {item.icon}
                    </button>
                ))}
                <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    style={{ display: 'none' }}
                    ref={fileInputRef}
                />
                <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full aspect-square flex items-center justify-center text-xl rounded bg-gray-700 text-gray-300 hover:bg-blue-400 transition-colors"
                >
                    📁
                </button>
            </div>

            <div className="flex-1 bg-gray-100 relative overflow-auto">
                <div className="fixed top-4 right-4 flex gap-2 bg-white z-50">
                    <button onClick={() => handleZoom(ZOOM_STEP)} disabled={zoom >= MAX_ZOOM}>
                        <FaPlus size={24} />
                    </button>
                    <span>Zoom: {(zoom * 100).toFixed(0)}%</span>
                    <button onClick={() => handleZoom(-ZOOM_STEP)} disabled={zoom <= MIN_ZOOM}>
                        <FaMinus size={24} />
                    </button>
                </div>
                <div
                    style={{
                        width: '3000px',
                        height: '3000px',
                        cursor: isCtrlPressed.current ? 'grab' : 'default'
                    }}
                >
                    <Stage
                        ref={stageRef}
                        width={2000}
                        height={2000}
                        scaleX={zoom}
                        scaleY={zoom}
                        x={position.x}
                        y={position.y}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onClick={(e) => {
                            handleStageClick(e);
                            handleTextToolClick(e);
                        }}
                        onMouseLeave={handleMouseUp}
                    >
                        <Layer>
                            {generateDots()}
                            {tool === 'pen' && currentPenPath.length > 0 && mousePosition && (
                                <Arrow
                                    points={[
                                        currentPenPath[currentPenPath.length - 1].x,
                                        currentPenPath[currentPenPath.length - 1].y,
                                        mousePosition.x,
                                        mousePosition.y,
                                    ]}
                                    stroke={strokeColor}
                                    fill={strokeColor}
                                    strokeWidth={2}
                                    pointerLength={10}
                                    pointerWidth={10}
                                />
                            )}
                            {lines.map((line, i) => (
                                <Line
                                    key={i}
                                    points={line.points}
                                    stroke={line.color}
                                    strokeWidth={5}
                                    tension={0.5}
                                    lineCap="round"
                                    lineJoin="round"
                                />
                            ))}
                            {shapes.map((shape) => {
                                if (shape.type === 'rectangle') {
                                    return (
                                        <Rect
                                            key={shape.id}
                                            id={shape.id}
                                            name="rect"
                                            x={shape.x}
                                            y={shape.y}
                                            width={shape.width}
                                            height={shape.height}
                                            fill={shape.fill}
                                            stroke={shape.stroke}
                                            strokeWidth={shape.strokeWidth}
                                            draggable={tool === 'cursor'}
                                            onClick={handleShapeClick}
                                            onDragEnd={(e) => {
                                                const updatedShapes = shapes.map((s) => {
                                                    if (s.id === shape.id) {
                                                        return {
                                                            ...s,
                                                            x: e.target.x(),
                                                            y: e.target.y(),
                                                        };
                                                    }
                                                    return s;
                                                });
                                                setShapes(updatedShapes);
                                            }}
                                        />
                                    );
                                } else if (shape.type === 'circle') {
                                    return (
                                        <Circle
                                            key={shape.id}
                                            id={shape.id}
                                            name="circle"
                                            x={shape.x + shape.width / 2}
                                            y={shape.y + shape.height / 2}
                                            radius={Math.abs(shape.width) / 2}
                                            fill={shape.fill}
                                            stroke={shape.stroke}
                                            strokeWidth={shape.strokeWidth}
                                            draggable={tool === 'cursor'}
                                            onClick={handleShapeClick}
                                            onDragEnd={(e) => {
                                                const updatedShapes = shapes.map((s) => {
                                                    if (s.id === shape.id) {
                                                        return {
                                                            ...s,
                                                            x: e.target.x() - s.width / 2,
                                                            y: e.target.y() - s.height / 2,
                                                        };
                                                    }
                                                    return s;
                                                });
                                                setShapes(updatedShapes);
                                            }}
                                        />
                                    );
                                } else if (shape.type === 'text') {
                                    return (
                                        <Text
                                            name="text"
                                            key={shape.id}
                                            id={shape.id}
                                            x={shape.x}
                                            y={shape.y}
                                            text={shape.text}
                                            fontSize={shape.fontSize}
                                            fontFamily={shape.fontFamily}
                                            fill={shape.fill}
                                            draggable={tool === 'cursor'}
                                            onClick={handleShapeClick}
                                            onDragEnd={(e) => {
                                                const updatedShapes = shapes.map((s) => {
                                                    if (s.id === shape.id) {
                                                        return {
                                                            ...s,
                                                            x: e.target.x(),
                                                            y: e.target.y(),
                                                        };
                                                    }
                                                    return s;
                                                });
                                                setShapes(updatedShapes);
                                            }}
                                        />
                                    );
                                } else if (shape.type === 'image') {
                                    return (
                                        <KonvaImage
                                            key={shape.id}
                                            id={shape.id}
                                            name="image"
                                            x={shape.x}
                                            y={shape.y}
                                            width={shape.width}
                                            height={shape.height}
                                            image={shape.image}
                                            draggable={tool === 'cursor'}
                                            onClick={handleShapeClick}
                                            onDragEnd={(e) => {
                                                const updatedShapes = shapes.map((s) => {
                                                    if (s.id === shape.id) {
                                                        return {
                                                            ...s,
                                                            x: e.target.x(),
                                                            y: e.target.y(),
                                                        };
                                                    }
                                                    return s;
                                                });
                                                setShapes(updatedShapes);
                                            }}
                                        />
                                    );
                                } else if (shape.type === 'pen') {
                                    return (
                                        <Group key={shape.id}>
                                            {shape.points?.map((point, index) => (
                                                <Circle
                                                    key={`${shape.id}-point-${index}`}
                                                    x={point.x}
                                                    y={point.y}
                                                    radius={5}
                                                    fill={shape.stroke}
                                                    stroke="black"
                                                    strokeWidth={1}
                                                />
                                            ))}
                                            {shape.points?.map((point, index) => {
                                                if (index === 0) return null; // Skip the first point
                                                const prev = shape.points![index - 1];
                                                const isLastSegment = index === shape.points!.length - 1;

                                                return isLastSegment ? (
                                                    <Arrow
                                                        key={`${shape.id}-arrow-${index}`}
                                                        points={[prev.x, prev.y, point.x, point.y]}
                                                        stroke={shape.stroke}
                                                        fill={shape.stroke}
                                                        strokeWidth={shape.strokeWidth}
                                                        pointerLength={10}
                                                        pointerWidth={10}
                                                    />
                                                ) : (
                                                    <Line
                                                        key={`${shape.id}-line-${index}`}
                                                        points={[prev.x, prev.y, point.x, point.y]}
                                                        stroke={shape.stroke}
                                                        strokeWidth={shape.strokeWidth}
                                                        lineCap="round"
                                                        lineJoin="round"
                                                    />
                                                );
                                            })}
                                        </Group>
                                    );
                                }
                                return null;
                            })}
                            {selectedShapeId && (
                                <Transformer
                                    ref={transformerRef}
                                    boundBoxFunc={(oldBox, newBox) => {
                                        if (newBox.width < 5 || newBox.height < 5) {
                                            return oldBox;
                                        }
                                        return newBox;
                                    }}
                                />
                            )}
                            {currentPenPath.length > 0 && (
                                <Group>
                                    {currentPenPath.map((point, index) => (
                                        <Circle
                                            key={`pen-preview-point-${index}`}
                                            x={point.x}
                                            y={point.y}
                                            radius={5}
                                            fill={strokeColor}
                                            stroke="black"
                                            strokeWidth={1}
                                        />
                                    ))}
                                    {currentPenPath.map((point, index) => {
                                        if (index === 0) return null;
                                        const prev = currentPenPath[index - 1];
                                        return (
                                            <Arrow
                                                key={`pen-preview-arrow-${index}`}
                                                points={[prev.x, prev.y, point.x, point.y]}
                                                stroke={strokeColor}
                                                fill={strokeColor}
                                                strokeWidth={2}
                                                pointerLength={10}
                                                pointerWidth={10}
                                            />
                                        );
                                    })}
                                </Group>
                            )}
                            {currentPenPath.length > 0 && mousePosition && (
                                <Line
                                    points={[
                                        currentPenPath[currentPenPath.length - 1].x,
                                        currentPenPath[currentPenPath.length - 1].y,
                                        mousePosition.x,
                                        mousePosition.y,
                                    ]}
                                    stroke={strokeColor}
                                    strokeWidth={2}
                                    lineCap="round"
                                    lineJoin="round"
                                    dash={[5, 5]} // Optional: Add a dashed line for the preview
                                />
                            )}
                        </Layer>
                    </Stage>
                </div>
                {isTextInputVisible && (
                    <div
                        style={{
                            position: 'absolute',
                            left: textInputPosition.x * zoom + position.x, // Adjust for zoom and pan
                            top: textInputPosition.y * zoom + position.y, // Adjust for zoom and pan
                            zIndex: 1000,
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

                {isEditingText && (
                    <div
                        style={{
                            position: 'absolute',
                            left: textInputPosition.x * zoom + position.x, // Adjust for zoom and pan
                            top: textInputPosition.y * zoom + position.y, // Adjust for zoom and pan
                            zIndex: 1000,
                        }}
                    >
                        <input
                            type="text"
                            value={currentText}
                            onChange={(e) => setCurrentText(e.target.value)}
                            onBlur={handleTextConfirm}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    handleTextConfirm();
                                }
                            }}
                            autoFocus
                            className="p-2 border-2 border-blue-500 rounded bg-white text-black min-w-[200px]"
                        />
                    </div>
                )}
                {selectedShape && (
                    <div className="absolute right-4 top-4 bg-white p-4 rounded shadow-lg">
                        {selectedShape.type === 'text' ? (
                            <>
                                <input
                                    type="text"
                                    value={selectedShape.text || ''}
                                    onChange={(e) => handleTextChange(e.target.value)}
                                    className="w-full mb-2 p-2 border rounded text-black border-black"
                                />
                                <select
                                    value={selectedShape.fontFamily || 'Arial'}
                                    onChange={(e) => handleFontChange(e.target.value)}
                                    className="w-full mb-2 p-2 border rounded"
                                >
                                    <option value="Arial">Arial</option>
                                    <option value="Times New Roman">Times New Roman</option>
                                    <option value="Courier New">Courier New</option>
                                    <option value="Verdana">Verdana</option>
                                    <option value="Georgia">Georgia</option>
                                    <option value="Palatino">Palatino</option>
                                    <option value="Garamond">Garamond</option>
                                    <option value="Bookman">Bookman</option>
                                    <option value="Comic Sans MS">Comic Sans MS</option>
                                    <option value="Trebuchet MS">Trebuchet MS</option>
                                    <option value="Impact">Impact</option>
                                    <option value="Lucida Sans Unicode">Lucida Sans Unicode</option>
                                    <option value="Tahoma">Tahoma</option>
                                    <option value="Helvetica">Helvetica</option>
                                    <option value="Futura">Futura</option>
                                    <option value="Baskerville">Baskerville</option>
                                </select>
                                <input
                                    type="number"
                                    value={selectedShape.fontSize || 20}
                                    onChange={(e) => handleFontSizeChange(Number(e.target.value))}
                                    className="w-full mb-2 p-2 border rounded"
                                />
                                <input
                                    type="color"
                                    value={selectedShape.fill || '#000000'}
                                    onChange={(e) => handleFillColorChange(e.target.value)}
                                    className="w-full mb-2"
                                />
                                <input
                                    type="color"
                                    value={selectedShape.stroke || '#000000'}
                                    onChange={(e) => handleStrokeColorChange(e.target.value)}
                                    className="w-full mb-2"
                                />
                            </>
                        ) : (
                            <>
                                <input
                                    type="color"
                                    value={selectedShape.fill || '#FFFFFF'}
                                    onChange={(e) => handleFillColorChange(e.target.value)}
                                    className="w-full mb-2"
                                />
                                <input
                                    type="color"
                                    value={selectedShape.stroke || '#000000'}
                                    onChange={(e) => handleStrokeColorChange(e.target.value)}
                                    className="w-full mb-2"
                                />
                                <input
                                    type="number"
                                    value={selectedShape.width || 0}
                                    onChange={(e) => handleResizeShape(Number(e.target.value), selectedShape.height)}
                                    className="w-full mb-2 p-2 border rounded"
                                />
                                <input
                                    type="number"
                                    value={selectedShape.height || 0}
                                    onChange={(e) => handleResizeShape(selectedShape.width, Number(e.target.value))}
                                    className="w-full mb-2 p-2 border rounded"
                                />
                            </>
                        )}
                        <button
                            onClick={handleDeleteShape}
                            className="w-full p-2 bg-red-500 text-white rounded"
                        >
                            Delete
                        </button>
                        {/* Add buttons to move shape in z-order */}
                        <button
                            onClick={handleMoveToFront}
                            className="w-full p-2 bg-blue-500 text-white rounded mt-2"
                        >
                            Move to Front
                        </button>
                        <button
                            onClick={handleMoveToBack}
                            className="w-full p-2 bg-blue-500 text-white rounded mt-2"
                        >
                            Move to Back
                        </button>
                        <button
                            onClick={handleMoveUp}
                            className="w-full p-2 bg-blue-500 text-white rounded mt-2"
                        >
                            Move Up
                        </button>
                        <button
                            onClick={handleMoveDown}
                            className="w-full p-2 bg-blue-500 text-white rounded mt-2"
                        >
                            Move Down
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DrawingApp;
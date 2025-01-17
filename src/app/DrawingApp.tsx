'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Stage, Layer, Line, Rect, Circle, Text, Transformer, Image as KonvaImage } from 'react-konva';
import type { KonvaEventObject } from 'konva/lib/Node';

type ToolType = 'cursor' | 'draw' | 'eraser' | 'rectangle' | 'circle' | 'text' | 'image';

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
    type: 'rectangle' | 'circle' | 'text' | 'image';
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
}

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
    const stageRef = useRef<any>(null);
    const transformerRef = useRef<any>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const tools: Tool[] = [
        { name: 'cursor', icon: '👆' },
        { name: 'draw', icon: '✏️' },
        { name: 'eraser', icon: '🧹' },
        { name: 'rectangle', icon: '⬜' },
        { name: 'circle', icon: '⭕' },
        { name: 'text', icon: 'T' },
        { name: 'image', icon: '🖼️' }, // New image tool
    ];

    // Handle mouse down for drawing, shapes, and text
    const handleMouseDown = (e: KonvaEventObject<MouseEvent>) => {
        if (tool === 'draw') {
            setIsDrawing(true);
            const pos = e.target.getStage()?.getPointerPosition();
            if (pos) {
                setLines([...lines, { tool, points: [pos.x, pos.y], color: strokeColor }]);
            }
        } else if (['rectangle', 'circle'].includes(tool)) {
            const pos = e.target.getStage()?.getPointerPosition();
            if (pos) {
                const newShape: Shape = {
                    id: `shape-${Date.now()}`,
                    type: tool as Shape['type'],
                    x: pos.x,
                    y: pos.y,
                    width: 0,
                    height: 0,
                    fill: fillColor,
                    stroke: strokeColor,
                    strokeWidth: 2,
                };
                setShapes([...shapes, newShape]);
                setIsDrawing(true);
            }
        } else if (tool === 'text') {
            const pos = e.target.getStage()?.getPointerPosition();
            if (pos) {
                setTextInputPosition({ x: pos.x, y: pos.y });
                setIsTextInputVisible(true);
            }
        } else if (tool === 'eraser') {
            const pos = e.target.getStage()?.getPointerPosition();
            if (pos) {
                const newLines = lines.filter((line) => {
                    return !line.points.some((point, index) => {
                        const x = line.points[index];
                        const y = line.points[index + 1];
                        return Math.abs(x - pos.x) < 10 && Math.abs(y - pos.y) < 10;
                    });
                });
                setLines(newLines);

                const newShapes = shapes.filter((shape) => {
                    return !(
                        pos.x >= shape.x &&
                        pos.x <= shape.x + shape.width &&
                        pos.y >= shape.y &&
                        pos.y <= shape.y + shape.height
                    );
                });
                setShapes(newShapes);
            }
        }
    };

    // Handle mouse move for drawing and resizing shapes
    const handleMouseMove = (e: KonvaEventObject<MouseEvent>) => {
        if (!isDrawing) return;

        if (tool === 'draw') {
            const stage = e.target.getStage();
            const point = stage?.getPointerPosition();
            if (point) {
                const lastLine = lines[lines.length - 1];
                if (lastLine) {
                    lastLine.points = lastLine.points.concat([point.x, point.y]);
                    lines.splice(lines.length - 1, 1, lastLine);
                    setLines([...lines]);
                }
            }
        } else if (['rectangle', 'circle'].includes(tool)) {
            const stage = e.target.getStage();
            const point = stage?.getPointerPosition();
            if (point) {
                const lastShape = shapes[shapes.length - 1];
                if (lastShape) {
                    const newWidth = point.x - lastShape.x;
                    const newHeight = point.y - lastShape.y;
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
        setIsDrawing(false);
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
            const pos = e.target.getStage()?.getPointerPosition();
            if (pos) {
                setTextInputPosition({ x: pos.x, y: pos.y });
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

    const selectedShape = shapes.find((shape) => shape.id === selectedShapeId);

    return (
        <div className="flex h-screen w-full">
            <div className="w-16 bg-gray-800 p-2 flex flex-col gap-4">
                {tools.map((item) => (
                    <button
                        key={item.name}
                        onClick={() => setTool(item.name)}
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
                <div
                    style={{
                        width: '2000px',
                        height: '2000px',
                    }}
                >
                    <Stage
                        width={2000}
                        height={2000}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onClick={(e) => {
                            handleStageClick(e);
                            handleTextToolClick(e);
                        }}
                        ref={stageRef}
                    >
                        <Layer>
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
                        </Layer>
                    </Stage>
                </div>
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

                {isEditingText && (
                    <div
                        style={{
                            position: 'absolute',
                            left: textInputPosition.x,
                            top: textInputPosition.y,
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
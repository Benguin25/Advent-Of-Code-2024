import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getSessionUser, signOut } from '../lib/supabaseAuth';
import {
  getRestaurantById,
  getTables,
  updateRestaurant,
} from '../lib/supabaseService';
import './MapEditor.css';

export default function MapEditor() {
  const navigate = useNavigate();
  const { restaurantId } = useParams();
  const canvasRef = useRef(null);
  const [restaurant, setRestaurant] = useState(null);
  const [tables, setTables] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Map editor state
  const [selectedTool, setSelectedTool] = useState('select'); // 'select', 'wall', 'table', 'door'
  const [selectedTableShape, setSelectedTableShape] = useState('square'); // 'square', 'round', 'rectangle', 'oval'
  const [mapElements, setMapElements] = useState([]);
  const [selectedElement, setSelectedElement] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isScaling, setIsScaling] = useState(false);
  const [scaleHandle, setScaleHandle] = useState(null); // 'tl', 'tr', 'bl', 'br', 'edge'
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [startPoint, setStartPoint] = useState(null);
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const [isSaving, setIsSaving] = useState(false);

  // Migration function to convert old size-based elements to width/height
  const migrateElements = (elements) => {
    return elements.map(element => {
      if ((element.type === 'table' || element.type === 'door') && element.size && (!element.width || !element.height)) {
        const size = element.size;
        return {
          ...element,
          width: element.type === 'table' ? size * 2 : 50,
          height: element.type === 'table' ? size * 2 : 30,
          // Keep the old size for backward compatibility
          size: undefined
        };
      }
      return element;
    });
  };

  const fetchRestaurantAndTables = useCallback(async () => {
    setIsLoading(true);
    setError('');
    const { user: currentUser } = await getSessionUser();
    if (!currentUser) {
      navigate('/login');
      return;
    }

    if (currentUser.email === 'guest@guest.com') {
      await signOut();
      navigate('/login');
      return;
    }

    if (!restaurantId) {
      setError('Restaurant ID not provided.');
      setIsLoading(false);
      return;
    }

    try {
      const fetchedRestaurant = await getRestaurantById(restaurantId);
      if (!fetchedRestaurant) {
        setError('Restaurant not found.');
        setIsLoading(false);
        return;
      }
      if (fetchedRestaurant.owner_id !== currentUser.id) {
        setError("You are not authorized to edit this restaurant's map.");
        setRestaurant(null);
        setIsLoading(false);
        navigate('/owner-dashboard');
        return;
      }
      setRestaurant(fetchedRestaurant);

      const fetchedTables = await getTables(fetchedRestaurant.id);
      setTables(fetchedTables.sort((a, b) => (a.name || '').localeCompare(b.name || '')));

      // Load existing map data if it exists
      if (fetchedRestaurant.restaurant_map) {
        console.log('Loading existing map data:', fetchedRestaurant.restaurant_map); // Debug log
        const migratedElements = migrateElements(fetchedRestaurant.restaurant_map.elements || []);
        setMapElements(migratedElements);
      } else {
        console.log('No existing map data found'); // Debug log
        setMapElements([]);
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setError(err.message || 'Failed to fetch restaurant or tables. Please try again.');
      setRestaurant(null);
    } finally {
      setIsLoading(false);
    }
  }, [navigate, restaurantId]);

  useEffect(() => {
    fetchRestaurantAndTables();
  }, [fetchRestaurantAndTables]);

  const saveToUndoStack = () => {
    setUndoStack(prev => [...prev, JSON.parse(JSON.stringify(mapElements))]);
    setRedoStack([]); // Clear redo stack when new action is performed
  };

  const handleUndo = () => {
    if (undoStack.length > 0) {
      const previousState = undoStack[undoStack.length - 1];
      setRedoStack(prev => [...prev, JSON.parse(JSON.stringify(mapElements))]);
      setMapElements(previousState);
      setUndoStack(prev => prev.slice(0, -1));
    }
  };

  const handleRedo = () => {
    if (redoStack.length > 0) {
      const nextState = redoStack[redoStack.length - 1];
      setUndoStack(prev => [...prev, JSON.parse(JSON.stringify(mapElements))]);
      setMapElements(nextState);
      setRedoStack(prev => prev.slice(0, -1));
    }
  };

  const handleCanvasMouseDown = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (selectedTool === 'select') {
      // First check if we're clicking on a scale handle of the selected element
      if (selectedElement) {
        const handle = getScaleHandle(x, y, selectedElement);
        if (handle) {
          setIsScaling(true);
          setScaleHandle(handle);
          saveToUndoStack();
          return;
        }
      }
      
      // Find clicked element
      const clickedElement = mapElements.find(element => {
        if (element.type === 'wall') {
          // Check if click is near the line
          const distance = distanceToLine(x, y, element.x1, element.y1, element.x2, element.y2);
          return distance < 15; // Increased from 10 for easier selection
        } else if (element.type === 'table' || element.type === 'door') {
          const width = element.width || 50;
          const height = element.height || 50;
          const halfWidth = width / 2;
          const halfHeight = height / 2;
          
          return x >= element.x - halfWidth && x <= element.x + halfWidth && 
                 y >= element.y - halfHeight && y <= element.y + halfHeight;
        }
        return false;
      });
      
      if (clickedElement) {
        setSelectedElement(clickedElement);
        setIsDragging(true);
        
        // Calculate drag offset
        if (clickedElement.type === 'wall') {
          const centerX = (clickedElement.x1 + clickedElement.x2) / 2;
          const centerY = (clickedElement.y1 + clickedElement.y2) / 2;
          setDragOffset({ x: x - centerX, y: y - centerY });
        } else {
          setDragOffset({ x: x - clickedElement.x, y: y - clickedElement.y });
        }
        saveToUndoStack();
      } else {
        setSelectedElement(null);
      }
    } else if (selectedTool === 'wall') {
      setIsDrawing(true);
      setStartPoint({ x, y });
    } else if (selectedTool === 'table' || selectedTool === 'door') {
      saveToUndoStack();
      const newElement = {
        id: Date.now(),
        type: selectedTool,
        x,
        y,
        width: selectedTool === 'table' ? 50 : 50,
        height: selectedTool === 'table' ? 50 : 30,
        shape: selectedTool === 'table' ? selectedTableShape : undefined,
        assignedTableId: selectedTool === 'table' ? null : undefined,
      };
      setMapElements(prev => [...prev, newElement]);
    }
  };

  const handleCanvasMouseMove = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (isDrawing && selectedTool === 'wall') {
      // Redraw canvas with preview line
      drawCanvas(canvasRef.current.getContext('2d'), [...mapElements, {
        type: 'wall',
        x1: startPoint.x,
        y1: startPoint.y,
        x2: x,
        y2: y,
        preview: true
      }]);
    } else if (isScaling && selectedElement && scaleHandle) {
      // Handle scaling elements with independent width/height
      const newElements = mapElements.map(element => {
        if (element.id === selectedElement.id) {
          if (element.type === 'wall') {
            if (scaleHandle === 'start') {
              return { ...element, x1: x, y1: y };
            } else if (scaleHandle === 'end') {
              return { ...element, x2: x, y2: y };
            }
          } else if (element.type === 'table' || element.type === 'door') {
            const currentWidth = element.width || 50;
            const currentHeight = element.height || 50;
            const centerX = element.x;
            const centerY = element.y;
            const halfWidth = currentWidth / 2;
            const halfHeight = currentHeight / 2;
            
            let newWidth = currentWidth;
            let newHeight = currentHeight;
            let newX = centerX;
            let newY = centerY;
            
            if (scaleHandle === 'tl') {
              // Top-left corner: resize from bottom-right corner
              newWidth = Math.max(20, (centerX + halfWidth) - x);
              newHeight = Math.max(20, (centerY + halfHeight) - y);
              newX = x + newWidth / 2;
              newY = y + newHeight / 2;
            } else if (scaleHandle === 'tr') {
              // Top-right corner: resize from bottom-left corner
              newWidth = Math.max(20, x - (centerX - halfWidth));
              newHeight = Math.max(20, (centerY + halfHeight) - y);
              newX = (centerX - halfWidth) + newWidth / 2;
              newY = y + newHeight / 2;
            } else if (scaleHandle === 'bl') {
              // Bottom-left corner: resize from top-right corner
              newWidth = Math.max(20, (centerX + halfWidth) - x);
              newHeight = Math.max(20, y - (centerY - halfHeight));
              newX = x + newWidth / 2;
              newY = (centerY - halfHeight) + newHeight / 2;
            } else if (scaleHandle === 'br') {
              // Bottom-right corner: resize from top-left corner
              newWidth = Math.max(20, x - (centerX - halfWidth));
              newHeight = Math.max(20, y - (centerY - halfHeight));
              newX = (centerX - halfWidth) + newWidth / 2;
              newY = (centerY - halfHeight) + newHeight / 2;
            } else if (scaleHandle === 'top') {
              // Top edge: resize height from bottom, keep width same
              newHeight = Math.max(20, (centerY + halfHeight) - y);
              newY = y + newHeight / 2;
            } else if (scaleHandle === 'bottom') {
              // Bottom edge: resize height from top, keep width same
              newHeight = Math.max(20, y - (centerY - halfHeight));
              newY = (centerY - halfHeight) + newHeight / 2;
            } else if (scaleHandle === 'left') {
              // Left edge: resize width from right, keep height same
              newWidth = Math.max(20, (centerX + halfWidth) - x);
              newX = x + newWidth / 2;
            } else if (scaleHandle === 'right') {
              // Right edge: resize width from left, keep height same
              newWidth = Math.max(20, x - (centerX - halfWidth));
              newX = (centerX - halfWidth) + newWidth / 2;
            }
            
            return { 
              ...element, 
              x: newX,
              y: newY,
              width: newWidth,
              height: newHeight
            };
          }
        }
        return element;
      });
      
      setMapElements(newElements);
      setSelectedElement(newElements.find(el => el.id === selectedElement.id));
    } else if (isDragging && selectedElement) {
      // Handle dragging elements
      const newElements = mapElements.map(element => {
        if (element.id === selectedElement.id) {
          if (element.type === 'wall') {
            const centerX = (element.x1 + element.x2) / 2;
            const centerY = (element.y1 + element.y2) / 2;
            const newCenterX = x - dragOffset.x;
            const newCenterY = y - dragOffset.y;
            const deltaX = newCenterX - centerX;
            const deltaY = newCenterY - centerY;
            
            return {
              ...element,
              x1: element.x1 + deltaX,
              y1: element.y1 + deltaY,
              x2: element.x2 + deltaX,
              y2: element.y2 + deltaY,
            };
          } else {
            return {
              ...element,
              x: x - dragOffset.x,
              y: y - dragOffset.y,
            };
          }
        }
        return element;
      });
      
      setMapElements(newElements);
      setSelectedElement(newElements.find(el => el.id === selectedElement.id));
    }
    
    // Update cursor based on current state and hover
    if (selectedElement && !isDragging && !isScaling) {
      const handle = getScaleHandle(x, y, selectedElement);
      if (handle) {
        // Set cursor based on handle type
        if (handle === 'tl' || handle === 'br') {
          canvasRef.current.style.cursor = 'nw-resize';
        } else if (handle === 'tr' || handle === 'bl') {
          canvasRef.current.style.cursor = 'ne-resize';
        } else if (handle === 'top' || handle === 'bottom') {
          canvasRef.current.style.cursor = 'ns-resize';
        } else if (handle === 'left' || handle === 'right') {
          canvasRef.current.style.cursor = 'ew-resize';
        } else if (handle === 'start' || handle === 'end') {
          canvasRef.current.style.cursor = 'move';
        }
        return;
      }
    }
    
    // Default cursor behavior
    if (isDrawing) {
      canvasRef.current.style.cursor = 'crosshair';
    } else if (isDragging) {
      canvasRef.current.style.cursor = 'grabbing';
    } else {
      canvasRef.current.style.cursor = 'default';
    }
  };

  const handleCanvasMouseUp = (e) => {
    if (isDrawing && selectedTool === 'wall') {
      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const newWall = {
        id: Date.now(),
        type: 'wall',
        x1: startPoint.x,
        y1: startPoint.y,
        x2: x,
        y2: y,
      };
      
      setMapElements(prev => [...prev, newWall]);
    }
    
    setIsDrawing(false);
    setIsDragging(false);
    setIsScaling(false);
    setScaleHandle(null);
    setStartPoint(null);
    setDragOffset({ x: 0, y: 0 });
  };

  const distanceToLine = (px, py, x1, y1, x2, y2) => {
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    
    if (lenSq === 0) return Math.sqrt(A * A + B * B);
    
    let param = dot / lenSq;
    
    if (param < 0) {
      return Math.sqrt(A * A + B * B);
    } else if (param > 1) {
      const E = px - x2;
      const F = py - y2;
      return Math.sqrt(E * E + F * F);
    } else {
      const projX = x1 + param * C;
      const projY = y1 + param * D;
      const distX = px - projX;
      const distY = py - projY;
      return Math.sqrt(distX * distX + distY * distY);
    }
  };

  const getScaleHandle = (x, y, element) => {
    if (!element) return null;
    
    const handleSize = 8;
    
    if (element.type === 'table') {
      const width = element.width || 50;
      const height = element.height || 50;
      const halfWidth = width / 2;
      const halfHeight = height / 2;
      
      // Corner handles for proportional scaling
      const corners = [
        { name: 'tl', x: element.x - halfWidth, y: element.y - halfHeight },
        { name: 'tr', x: element.x + halfWidth, y: element.y - halfHeight },
        { name: 'bl', x: element.x - halfWidth, y: element.y + halfHeight },
        { name: 'br', x: element.x + halfWidth, y: element.y + halfHeight },
      ];
      
      // Edge handles for independent width/height scaling
      const edges = [
        { name: 'top', x: element.x, y: element.y - halfHeight },
        { name: 'bottom', x: element.x, y: element.y + halfHeight },
        { name: 'left', x: element.x - halfWidth, y: element.y },
        { name: 'right', x: element.x + halfWidth, y: element.y },
      ];
      
      // Check corners first
      for (const corner of corners) {
        if (Math.abs(x - corner.x) <= handleSize && Math.abs(y - corner.y) <= handleSize) {
          return corner.name;
        }
      }
      
      // Then check edges
      for (const edge of edges) {
        if (Math.abs(x - edge.x) <= handleSize && Math.abs(y - edge.y) <= handleSize) {
          return edge.name;
        }
      }
    } else if (element.type === 'wall') {
      // For walls, allow scaling by dragging endpoints
      if (Math.abs(x - element.x1) <= handleSize && Math.abs(y - element.y1) <= handleSize) {
        return 'start';
      }
      if (Math.abs(x - element.x2) <= handleSize && Math.abs(y - element.y2) <= handleSize) {
        return 'end';
      }
    } else if (element.type === 'door') {
      const width = element.width || 50;
      const height = element.height || 30;
      const halfWidth = width / 2;
      const halfHeight = height / 2;
      
      // Door scaling handles
      const corners = [
        { name: 'tl', x: element.x - halfWidth, y: element.y - halfHeight },
        { name: 'tr', x: element.x + halfWidth, y: element.y - halfHeight },
        { name: 'bl', x: element.x - halfWidth, y: element.y + halfHeight },
        { name: 'br', x: element.x + halfWidth, y: element.y + halfHeight },
      ];
      
      const edges = [
        { name: 'top', x: element.x, y: element.y - halfHeight },
        { name: 'bottom', x: element.x, y: element.y + halfHeight },
        { name: 'left', x: element.x - halfWidth, y: element.y },
        { name: 'right', x: element.x + halfWidth, y: element.y },
      ];
      
      for (const corner of corners) {
        if (Math.abs(x - corner.x) <= handleSize && Math.abs(y - corner.y) <= handleSize) {
          return corner.name;
        }
      }
      
      for (const edge of edges) {
        if (Math.abs(x - edge.x) <= handleSize && Math.abs(y - edge.y) <= handleSize) {
          return edge.name;
        }
      }
    }
    
    return null;
  };

  const drawCanvas = (ctx, elements) => {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    
    // Draw grid
    ctx.strokeStyle = '#2a4a6b';
    ctx.lineWidth = 0.5;
    for (let i = 0; i < ctx.canvas.width; i += 20) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, ctx.canvas.height);
      ctx.stroke();
    }
    for (let i = 0; i < ctx.canvas.height; i += 20) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(ctx.canvas.width, i);
      ctx.stroke();
    }

    // Draw elements
    elements.forEach(element => {
      if (element.type === 'wall') {
        ctx.strokeStyle = element.preview ? '#64ffda80' : '#64ffda';
        ctx.lineWidth = element === selectedElement ? 6 : 4; // Increased from 4:2 to 6:4
        ctx.beginPath();
        ctx.moveTo(element.x1, element.y1);
        ctx.lineTo(element.x2, element.y2);
        ctx.stroke();
        
        // Draw scale handles if selected
        if (element === selectedElement) {
          ctx.fillStyle = '#ffffff';
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 1;
          
          const handleSize = 4;
          // Draw endpoint handles
          ctx.fillRect(element.x1 - handleSize, element.y1 - handleSize, handleSize * 2, handleSize * 2);
          ctx.strokeRect(element.x1 - handleSize, element.y1 - handleSize, handleSize * 2, handleSize * 2);
          
          ctx.fillRect(element.x2 - handleSize, element.y2 - handleSize, handleSize * 2, handleSize * 2);
          ctx.strokeRect(element.x2 - handleSize, element.y2 - handleSize, handleSize * 2, handleSize * 2);
        }
      } else if (element.type === 'table') {
        ctx.fillStyle = element === selectedElement ? '#e990d6' : '#64ffda';
        
        // Draw different table shapes using width/height
        const shape = element.shape || 'square';
        const width = element.width || 50;
        const height = element.height || 50;
        const halfWidth = width / 2;
        const halfHeight = height / 2;
        
        if (shape === 'square') {
          ctx.fillRect(element.x - halfWidth, element.y - halfHeight, width, height);
        } else if (shape === 'round') {
          ctx.save();
          ctx.translate(element.x, element.y);
          ctx.scale(width / 50, height / 50); // Scale based on width/height
          ctx.beginPath();
          ctx.arc(0, 0, 25, 0, 2 * Math.PI);
          ctx.fill();
          ctx.restore();
        } else if (shape === 'rectangle') {
          ctx.fillRect(element.x - halfWidth, element.y - halfHeight, width, height);
        } else if (shape === 'oval') {
          ctx.save();
          ctx.translate(element.x, element.y);
          ctx.scale(width / 50, height / 50);
          ctx.beginPath();
          ctx.arc(0, 0, 25, 0, 2 * Math.PI);
          ctx.fill();
          ctx.restore();
        }
        
        // Draw scale handles if selected
        if (element === selectedElement) {
          ctx.fillStyle = '#ffffff';
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 1;
          
          const handleSize = 4;
          
          // Corner handles (for proportional scaling)
          const corners = [
            { x: element.x - halfWidth, y: element.y - halfHeight }, // top-left
            { x: element.x + halfWidth, y: element.y - halfHeight }, // top-right
            { x: element.x - halfWidth, y: element.y + halfHeight }, // bottom-left
            { x: element.x + halfWidth, y: element.y + halfHeight }, // bottom-right
          ];
          
          // Edge handles (for independent width/height scaling)
          const edges = [
            { x: element.x, y: element.y - halfHeight }, // top
            { x: element.x, y: element.y + halfHeight }, // bottom
            { x: element.x - halfWidth, y: element.y }, // left
            { x: element.x + halfWidth, y: element.y }, // right
          ];
          
          // Draw corner handles (larger, white)
          corners.forEach(handle => {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(handle.x - handleSize, handle.y - handleSize, handleSize * 2, handleSize * 2);
            ctx.strokeRect(handle.x - handleSize, handle.y - handleSize, handleSize * 2, handleSize * 2);
          });
          
          // Draw edge handles (smaller, blue)
          ctx.fillStyle = '#64ffda';
          edges.forEach(handle => {
            ctx.fillRect(handle.x - handleSize/2, handle.y - handleSize/2, handleSize, handleSize);
            ctx.strokeRect(handle.x - handleSize/2, handle.y - handleSize/2, handleSize, handleSize);
          });
        }
        
        // Draw table label if assigned
        if (element.assignedTableId) {
          const assignedTable = tables.find(t => t.id === element.assignedTableId);
          if (assignedTable) {
            ctx.fillStyle = '#1a1a1a';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(assignedTable.name, element.x, element.y + 5);
          }
        }
      } else if (element.type === 'door') {
        ctx.fillStyle = element === selectedElement ? '#e990d6' : '#ffa500';
        
        const width = element.width || 50;
        const height = element.height || 30;
        const halfWidth = width / 2;
        const halfHeight = height / 2;
        
        ctx.fillRect(element.x - halfWidth, element.y - halfHeight, width, height);
        ctx.fillStyle = '#1a1a1a';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('DOOR', element.x, element.y + 5);
        
        // Draw scale handles if selected
        if (element === selectedElement) {
          ctx.fillStyle = '#ffffff';
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 1;
          
          const handleSize = 4;
          
          // Corner handles
          const corners = [
            { x: element.x - halfWidth, y: element.y - halfHeight }, // top-left
            { x: element.x + halfWidth, y: element.y - halfHeight }, // top-right
            { x: element.x - halfWidth, y: element.y + halfHeight }, // bottom-left
            { x: element.x + halfWidth, y: element.y + halfHeight }, // bottom-right
          ];
          
          // Edge handles
          const edges = [
            { x: element.x, y: element.y - halfHeight }, // top
            { x: element.x, y: element.y + halfHeight }, // bottom
            { x: element.x - halfWidth, y: element.y }, // left
            { x: element.x + halfWidth, y: element.y }, // right
          ];
          
          // Draw corner handles (white)
          corners.forEach(handle => {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(handle.x - handleSize, handle.y - handleSize, handleSize * 2, handleSize * 2);
            ctx.strokeRect(handle.x - handleSize, handle.y - handleSize, handleSize * 2, handleSize * 2);
          });
          
          // Draw edge handles (orange)
          ctx.fillStyle = '#ffa500';
          edges.forEach(handle => {
            ctx.fillRect(handle.x - handleSize/2, handle.y - handleSize/2, handleSize, handleSize);
            ctx.strokeRect(handle.x - handleSize/2, handle.y - handleSize/2, handleSize, handleSize);
          });
        }
      }
    });
  };

  useEffect(() => {
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      drawCanvas(ctx, mapElements);
    }
  }, [mapElements, selectedElement, tables]);

  const handleDeleteElement = () => {
    if (selectedElement) {
      saveToUndoStack();
      setMapElements(prev => prev.filter(el => el.id !== selectedElement.id));
      setSelectedElement(null);
    }
  };

  const handleTableAssignment = (elementId, tableId) => {
    setMapElements(prev => prev.map(el => 
      el.id === elementId ? { ...el, assignedTableId: tableId || null } : el
    ));
  };

  const handleSaveMap = async () => {
    try {
      setIsSaving(true);
      setError(''); // Clear any previous errors
      
      const mapData = {
        elements: mapElements,
        lastUpdated: new Date().toISOString(),
      };
      
      console.log('Saving map data:', mapData); // Debug log
      
      const updatedRestaurant = await updateRestaurant(restaurant.id, { restaurant_map: mapData });
      
      console.log('Map saved successfully:', updatedRestaurant); // Debug log
      
      // Update local restaurant state with the saved data
      setRestaurant(updatedRestaurant);
      
      alert('Map saved successfully!');
    } catch (err) {
      console.error('Failed to save map:', err);
      setError(`Failed to save map: ${err.message || 'Unknown error'}. Please try again.`);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="map-editor-loading">
        <div className="loading-content">
          <div className="loading-spinner"></div>
          <p>Loading map editor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="map-editor-wrapper">
      <div className="map-editor-container">
        <div className="map-editor-header">
          <h1 className="map-editor-title">
            {restaurant ? `${restaurant.name} - Map Editor` : 'Map Editor'}
          </h1>
          <div className="header-actions">
            <button
              className="btn btn-secondary back-btn"
              onClick={() => navigate('/owner-dashboard')}
            >
              Back to Dashboard
            </button>
          </div>
        </div>

        {error && (
          <div className="error-message">
            <strong>Error:</strong> {error}
          </div>
        )}

        <div className="map-editor-content">
          {/* Toolbar */}
          <div className="map-toolbar">
            <div className="tool-group">
              <h3>Tools</h3>
              <button
                className={`tool-btn ${selectedTool === 'select' ? 'active' : ''}`}
                onClick={() => setSelectedTool('select')}
              >
                🎯 Select
              </button>
              <button
                className={`tool-btn ${selectedTool === 'wall' ? 'active' : ''}`}
                onClick={() => setSelectedTool('wall')}
              >
                🧱 Wall
              </button>
              <button
                className={`tool-btn ${selectedTool === 'table' ? 'active' : ''}`}
                onClick={() => setSelectedTool('table')}
              >
                🍽️ Table
              </button>
              
              {/* Table Shape Selector - only show when table tool is selected */}
              {selectedTool === 'table' && (
                <div className="table-shape-selector">
                  <label className="shape-label">Table Shape:</label>
                  <div className="shape-options">
                    <button
                      className={`shape-btn ${selectedTableShape === 'square' ? 'active' : ''}`}
                      onClick={() => setSelectedTableShape('square')}
                      title="Square Table"
                    >
                      ⬜
                    </button>
                    <button
                      className={`shape-btn ${selectedTableShape === 'round' ? 'active' : ''}`}
                      onClick={() => setSelectedTableShape('round')}
                      title="Round Table"
                    >
                      ⭕
                    </button>
                    <button
                      className={`shape-btn ${selectedTableShape === 'rectangle' ? 'active' : ''}`}
                      onClick={() => setSelectedTableShape('rectangle')}
                      title="Rectangle Table"
                    >
                      ▬
                    </button>
                    <button
                      className={`shape-btn ${selectedTableShape === 'oval' ? 'active' : ''}`}
                      onClick={() => setSelectedTableShape('oval')}
                      title="Oval Table"
                    >
                      ⬭
                    </button>
                  </div>
                </div>
              )}
              <button
                className={`tool-btn ${selectedTool === 'door' ? 'active' : ''}`}
                onClick={() => setSelectedTool('door')}
              >
                🚪 Door
              </button>
            </div>

            <div className="tool-group">
              <h3>Actions</h3>
              <button
                className="tool-btn"
                onClick={handleUndo}
                disabled={undoStack.length === 0}
              >
                ↶ Undo
              </button>
              <button
                className="tool-btn"
                onClick={handleRedo}
                disabled={redoStack.length === 0}
              >
                ↷ Redo
              </button>
              <button
                className="tool-btn delete-btn"
                onClick={handleDeleteElement}
                disabled={!selectedElement}
              >
                🗑️ Delete
              </button>
            </div>

            <div className="tool-group">
              <h3>Map</h3>
              <button
                className="tool-btn save-btn"
                onClick={handleSaveMap}
                disabled={isSaving}
              >
                {isSaving ? '💾 Saving...' : '💾 Save Map'}
              </button>
            </div>
          </div>

          {/* Canvas Area */}
          <div className="map-canvas-container">
            <canvas
              ref={canvasRef}
              width={800}
              height={600}
              className="map-canvas"
              onMouseDown={handleCanvasMouseDown}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
            />
          </div>

          {/* Properties Panel */}
          {selectedElement && (
            <div className="properties-panel">
              <h3>Properties</h3>
              <div className="property-item">
                <label>Type: {selectedElement.type}</label>
              </div>
              
              {selectedElement.type === 'table' && (
                <div className="property-item">
                  <label>Assign to Table:</label>
                  <select
                    value={selectedElement.assignedTableId || ''}
                    onChange={(e) => handleTableAssignment(selectedElement.id, e.target.value)}
                  >
                    <option value="">Select a table...</option>
                    {tables.map(table => (
                      <option key={table.id} value={table.id}>
                        {table.name} (Capacity: {table.capacity})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

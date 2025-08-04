import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getSessionUser, signOut } from '../lib/supabaseAuth';
import { getRestaurantById, updateRestaurant, getTables } from '../lib/supabaseService';
import './RestaurantMapEditor.css';

const TOOLS = {
  SELECT: 'select',
  WALL: 'wall',
  TABLE: 'table',
  DOOR: 'door'
};

export default function RestaurantMapEditor() {
  const navigate = useNavigate();
  const { restaurantId } = useParams();
  const canvasRef = useRef(null);
  const [restaurant, setRestaurant] = useState(null);
  const [availableTables, setAvailableTables] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentTool, setCurrentTool] = useState(TOOLS.SELECT);
  
  // Map data state
  const [mapData, setMapData] = useState({
    walls: [],
    tables: [],
    doors: [],
    scale: 1,
    offset: { x: 0, y: 0 }
  });
  
  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState(null);
  const [selectedElement, setSelectedElement] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const fetchRestaurantData = useCallback(async () => {
    setIsLoading(true);
    setError('');
    
    const { user } = await getSessionUser();
    if (!user) {
      navigate('/login');
      return;
    }

    if (user.email === 'guest@guest.com') {
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
      
      if (fetchedRestaurant.owner_id !== user.id) {
        setError('You are not authorized to edit this restaurant map.');
        navigate('/owner-dashboard');
        return;
      }

      setRestaurant(fetchedRestaurant);
      
      // Load existing map data if available
      if (fetchedRestaurant.restaurant_map) {
        setMapData(fetchedRestaurant.restaurant_map);
        addToHistory(fetchedRestaurant.restaurant_map);
      }

      // Fetch available tables for assignment
      const tables = await getTables(restaurantId);
      setAvailableTables(tables);
      
    } catch (err) {
      console.error('Failed to fetch restaurant data:', err);
      setError(err.message || 'Failed to load restaurant data.');
    } finally {
      setIsLoading(false);
    }
  }, [navigate, restaurantId]);

  useEffect(() => {
    fetchRestaurantData();
  }, [fetchRestaurantData]);

  const addToHistory = (data) => {
    const newHistory = [...history.slice(0, historyIndex + 1), JSON.parse(JSON.stringify(data))];
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setMapData(history[historyIndex - 1]);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setMapData(history[historyIndex + 1]);
    }
  };

  const getMousePos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const handleMouseDown = (e) => {
    const pos = getMousePos(e);
    
    if (currentTool === TOOLS.SELECT) {
      // Check if clicking on an existing element
      const clickedElement = findElementAtPosition(pos);
      if (clickedElement) {
        setSelectedElement(clickedElement);
        setDragOffset({
          x: pos.x - clickedElement.x,
          y: pos.y - clickedElement.y
        });
        setIsDrawing(true);
      } else {
        setSelectedElement(null);
      }
    } else if (currentTool === TOOLS.WALL) {
      setIsDrawing(true);
      setStartPoint(pos);
    } else if (currentTool === TOOLS.TABLE) {
      const newTable = {
        id: crypto.randomUUID(),
        x: pos.x,
        y: pos.y,
        width: 60,
        height: 60,
        assignedTableId: null,
        label: ''
      };
      const newMapData = {
        ...mapData,
        tables: [...mapData.tables, newTable]
      };
      setMapData(newMapData);
      addToHistory(newMapData);
      setSelectedElement(newTable);
    } else if (currentTool === TOOLS.DOOR) {
      const newDoor = {
        id: crypto.randomUUID(),
        x: pos.x,
        y: pos.y,
        width: 40,
        height: 80
      };
      const newMapData = {
        ...mapData,
        doors: [...mapData.doors, newDoor]
      };
      setMapData(newMapData);
      addToHistory(newMapData);
      setSelectedElement(newDoor);
    }
  };

  const handleMouseMove = (e) => {
    const pos = getMousePos(e);
    
    if (isDrawing) {
      if (currentTool === TOOLS.SELECT && selectedElement) {
        // Move selected element
        const newX = pos.x - dragOffset.x;
        const newY = pos.y - dragOffset.y;
        
        const updatedMapData = { ...mapData };
        if (selectedElement.type === 'table') {
          updatedMapData.tables = mapData.tables.map(table =>
            table.id === selectedElement.id ? { ...table, x: newX, y: newY } : table
          );
        } else if (selectedElement.type === 'door') {
          updatedMapData.doors = mapData.doors.map(door =>
            door.id === selectedElement.id ? { ...door, x: newX, y: newY } : door
          );
        }
        setMapData(updatedMapData);
      }
    }
    
    // Redraw canvas
    drawCanvas();
  };

  const handleMouseUp = (e) => {
    if (isDrawing) {
      const pos = getMousePos(e);
      
      if (currentTool === TOOLS.WALL && startPoint) {
        const newWall = {
          id: crypto.randomUUID(),
          x1: startPoint.x,
          y1: startPoint.y,
          x2: pos.x,
          y2: pos.y
        };
        const newMapData = {
          ...mapData,
          walls: [...mapData.walls, newWall]
        };
        setMapData(newMapData);
        addToHistory(newMapData);
      } else if (currentTool === TOOLS.SELECT && selectedElement) {
        addToHistory(mapData);
      }
    }
    
    setIsDrawing(false);
    setStartPoint(null);
  };

  const findElementAtPosition = (pos) => {
    // Check tables
    for (let table of mapData.tables) {
      if (pos.x >= table.x && pos.x <= table.x + table.width &&
          pos.y >= table.y && pos.y <= table.y + table.height) {
        return { ...table, type: 'table' };
      }
    }
    
    // Check doors
    for (let door of mapData.doors) {
      if (pos.x >= door.x && pos.x <= door.x + door.width &&
          pos.y >= door.y && pos.y <= door.y + door.height) {
        return { ...door, type: 'door' };
      }
    }
    
    return null;
  };

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw grid
    ctx.strokeStyle = '#f0f0f0';
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 20) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 20) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }
    
    // Draw walls
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 4;
    mapData.walls.forEach(wall => {
      ctx.beginPath();
      ctx.moveTo(wall.x1, wall.y1);
      ctx.lineTo(wall.x2, wall.y2);
      ctx.stroke();
    });
    
    // Draw doors
    ctx.fillStyle = '#8B4513';
    mapData.doors.forEach(door => {
      ctx.fillRect(door.x, door.y, door.width, door.height);
      if (selectedElement && selectedElement.id === door.id) {
        ctx.strokeStyle = '#007bff';
        ctx.lineWidth = 2;
        ctx.strokeRect(door.x - 2, door.y - 2, door.width + 4, door.height + 4);
      }
    });
    
    // Draw tables
    mapData.tables.forEach(table => {
      // Table background
      ctx.fillStyle = table.assignedTableId ? '#28a745' : '#6c757d';
      ctx.fillRect(table.x, table.y, table.width, table.height);
      
      // Table border
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 2;
      ctx.strokeRect(table.x, table.y, table.width, table.height);
      
      // Selection highlight
      if (selectedElement && selectedElement.id === table.id) {
        ctx.strokeStyle = '#007bff';
        ctx.lineWidth = 3;
        ctx.strokeRect(table.x - 2, table.y - 2, table.width + 4, table.height + 4);
      }
      
      // Table label
      if (table.label) {
        ctx.fillStyle = '#fff';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(table.label, table.x + table.width / 2, table.y + table.height / 2 + 4);
      }
    });
  };

  useEffect(() => {
    drawCanvas();
  }, [mapData, selectedElement]);

  const handleTableAssignment = (mapTableId, dbTableId) => {
    const dbTable = availableTables.find(t => t.id === dbTableId);
    const updatedMapData = {
      ...mapData,
      tables: mapData.tables.map(table =>
        table.id === mapTableId 
          ? { ...table, assignedTableId: dbTableId, label: dbTable?.name || '' }
          : table
      )
    };
    setMapData(updatedMapData);
    addToHistory(updatedMapData);
  };

  const deleteSelectedElement = () => {
    if (!selectedElement) return;
    
    let updatedMapData = { ...mapData };
    
    if (selectedElement.type === 'table') {
      updatedMapData.tables = mapData.tables.filter(t => t.id !== selectedElement.id);
    } else if (selectedElement.type === 'door') {
      updatedMapData.doors = mapData.doors.filter(d => d.id !== selectedElement.id);
    } else if (selectedElement.type === 'wall') {
      updatedMapData.walls = mapData.walls.filter(w => w.id !== selectedElement.id);
    }
    
    setMapData(updatedMapData);
    addToHistory(updatedMapData);
    setSelectedElement(null);
  };

  const saveMap = async () => {
    try {
      setIsLoading(true);
      await updateRestaurant(restaurantId, { restaurant_map: mapData });
      setError('Map saved successfully!');
      setTimeout(() => setError(''), 3000);
    } catch (err) {
      console.error('Failed to save map:', err);
      setError('Failed to save map: ' + err.message);
    } finally {
      setIsLoading(false);
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
    <div className="map-editor-container">
      <div className="map-editor-header">
        <h1>{restaurant?.name} - Edit Map</h1>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={() => navigate('/owner-dashboard')}>
            Back to Dashboard
          </button>
          <button className="btn btn-primary" onClick={saveMap} disabled={isLoading}>
            Save Map
          </button>
        </div>
      </div>

      {error && (
        <div className={`alert ${error.includes('successfully') ? 'alert-success' : 'alert-danger'}`}>
          {error}
        </div>
      )}

      <div className="map-editor-content">
        <div className="map-editor-toolbar">
          <div className="tool-group">
            <h4>Tools</h4>
            {Object.values(TOOLS).map(tool => (
              <button
                key={tool}
                className={`tool-btn ${currentTool === tool ? 'active' : ''}`}
                onClick={() => setCurrentTool(tool)}
              >
                {tool === TOOLS.SELECT && '↖️ Select'}
                {tool === TOOLS.WALL && '🧱 Wall'}
                {tool === TOOLS.TABLE && '🪑 Table'}
                {tool === TOOLS.DOOR && '🚪 Door'}
              </button>
            ))}
          </div>

          <div className="tool-group">
            <h4>Actions</h4>
            <button className="tool-btn" onClick={undo} disabled={historyIndex <= 0}>
              ↶ Undo
            </button>
            <button className="tool-btn" onClick={redo} disabled={historyIndex >= history.length - 1}>
              ↷ Redo
            </button>
            {selectedElement && (
              <button className="tool-btn delete-btn" onClick={deleteSelectedElement}>
                🗑️ Delete
              </button>
            )}
          </div>

          {selectedElement && selectedElement.type === 'table' && (
            <div className="tool-group">
              <h4>Table Assignment</h4>
              <select
                value={selectedElement.assignedTableId || ''}
                onChange={(e) => handleTableAssignment(selectedElement.id, e.target.value)}
              >
                <option value="">Unassigned</option>
                {availableTables.map(table => (
                  <option key={table.id} value={table.id}>
                    {table.name} (Capacity: {table.capacity})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="map-canvas-container">
          <canvas
            ref={canvasRef}
            width={800}
            height={600}
            className="map-canvas"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
          />
        </div>
      </div>
    </div>
  );
}

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { getRestaurantById, getTables, updateTable, getReservations } from '../lib/supabaseService';
import './LiveMap.css';

export default function LiveMap({ restaurantId }) {
  const canvasRef = useRef(null);
  const [restaurant, setRestaurant] = useState(null);
  const [tables, setTables] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [mapElements, setMapElements] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setError('');
      
      const [fetchedRestaurant, fetchedTables, fetchedReservations] = await Promise.all([
        getRestaurantById(restaurantId),
        getTables(restaurantId),
        getReservations(restaurantId)
      ]);

      setRestaurant(fetchedRestaurant);
      setTables(fetchedTables);
      setReservations(fetchedReservations);

      // Load map elements
      if (fetchedRestaurant.restaurant_map?.elements) {
        setMapElements(fetchedRestaurant.restaurant_map.elements);
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setError('Failed to load live map data.');
    } finally {
      setIsLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    fetchData();
    
    // Set up auto-refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const getTableStatus = (table) => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    // Check current status first - try both current_status and status fields
    const currentStatus = table.current_status || table.status;
    if (currentStatus === 'occupied') {
      return 'occupied'; // Red
    }

    // Check for upcoming reservations
    const upcomingReservation = reservations.find(reservation => {
      if (reservation.table_id !== table.id || reservation.booking_date !== today) {
        return false;
      }
      
      const reservationDateTime = new Date(`${reservation.booking_date}T${reservation.booking_time}`);
      const timeDiff = reservationDateTime.getTime() - now.getTime();
      const hoursDiff = timeDiff / (1000 * 60 * 60);
      
      return hoursDiff > 0 && hoursDiff <= (restaurant?.min_advance_hours || 2);
    });

    if (upcomingReservation) {
      return 'reserved'; // Yellow
    }

    return 'available'; // Green
  };

  const getTableColor = (status) => {
    switch (status) {
      case 'available':
        return '#00ff00'; // Green
      case 'occupied':
        return '#ff0000'; // Red
      case 'reserved':
        return '#ffff00'; // Yellow
      default:
        return '#64ffda'; // Default teal
    }
  };

  const handleTableClick = (tableElement) => {
    const dbTable = tables.find(t => t.id === tableElement.assignedTableId);
    if (!dbTable) return;

    const status = getTableStatus(dbTable);
    
    if (status === 'available') {
      setShowConfirmDialog({
        type: 'seat',
        table: dbTable,
        message: `Are you sure you want to seat someone at ${dbTable.name}?`
      });
    } else if (status === 'occupied') {
      setShowConfirmDialog({
        type: 'clear',
        table: dbTable,
        message: `Are you sure the people at ${dbTable.name} are leaving?`
      });
    } else if (status === 'reserved') {
      // Find the reservation
      const reservation = reservations.find(r => {
        const today = new Date().toISOString().split('T')[0];
        return r.table_id === dbTable.id && r.booking_date === today;
      });
      
      if (reservation) {
        setShowConfirmDialog({
          type: 'arrive',
          table: dbTable,
          reservation,
          message: `Has ${reservation.name || 'the guest'} arrived for their ${reservation.booking_time} reservation at ${dbTable.name}?`
        });
      }
    }
  };

  const handleConfirmAction = async () => {
    if (!showConfirmDialog) return;

    try {
      const { type, table } = showConfirmDialog;
      
      let newStatus;
      if (type === 'seat' || type === 'arrive') {
        newStatus = 'occupied';
      } else if (type === 'clear') {
        newStatus = 'available';
      }

      console.log('Updating table status:', { tableId: table.id, newStatus }); // Debug log
      
      // Try updating both status fields to ensure compatibility
      const updateData = {
        current_status: newStatus,
        status: newStatus
      };
      
      const updatedTable = await updateTable(table.id, updateData);
      
      console.log('Table status updated successfully:', updatedTable); // Debug log
      
      // Refresh data
      await fetchData();
      
      setShowConfirmDialog(null);
    } catch (err) {
      console.error('Failed to update table status:', err);
      
      // If the first attempt failed, try updating just the status field
      try {
        console.log('Retrying with status field only...'); // Debug log
        const { type, table } = showConfirmDialog;
        
        let newStatus;
        if (type === 'seat' || type === 'arrive') {
          newStatus = 'occupied';
        } else if (type === 'clear') {
          newStatus = 'available';
        }
        
        const updatedTable = await updateTable(table.id, { status: newStatus });
        console.log('Table status updated successfully (retry):', updatedTable); // Debug log
        
        // Refresh data
        await fetchData();
        setShowConfirmDialog(null);
      } catch (retryErr) {
        console.error('Retry failed:', retryErr);
        setError(`Failed to update table status: ${err.message || 'Unknown error'}. Please check your database schema.`);
      }
    }
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
        ctx.strokeStyle = '#64ffda';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(element.x1, element.y1);
        ctx.lineTo(element.x2, element.y2);
        ctx.stroke();
      } else if (element.type === 'table' && element.assignedTableId) {
        const dbTable = tables.find(t => t.id === element.assignedTableId);
        if (dbTable) {
          const status = getTableStatus(dbTable);
          const color = getTableColor(status);
          
          ctx.fillStyle = color;
          
          // Draw different table shapes
          const shape = element.shape || 'square';
          const size = 25;
          
          if (shape === 'square') {
            ctx.fillRect(element.x - size, element.y - size, size * 2, size * 2);
          } else if (shape === 'round') {
            ctx.beginPath();
            ctx.arc(element.x, element.y, size, 0, 2 * Math.PI);
            ctx.fill();
          } else if (shape === 'rectangle') {
            ctx.fillRect(element.x - size * 1.5, element.y - size * 0.7, size * 3, size * 1.4);
          } else if (shape === 'oval') {
            ctx.save();
            ctx.translate(element.x, element.y);
            ctx.scale(1.5, 0.7);
            ctx.beginPath();
            ctx.arc(0, 0, size, 0, 2 * Math.PI);
            ctx.fill();
            ctx.restore();
          }
          
          // Draw table label
          ctx.fillStyle = status === 'reserved' ? '#000000' : '#1a1a1a';
          ctx.font = 'bold 12px Arial';
          ctx.textAlign = 'center';
          ctx.fillText(dbTable.name, element.x, element.y + 5);
        }
      } else if (element.type === 'door') {
        ctx.fillStyle = '#ffa500';
        ctx.fillRect(element.x - 25, element.y - 15, 50, 30);
        ctx.fillStyle = '#1a1a1a';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('DOOR', element.x, element.y + 5);
      }
    });
  };

  const handleCanvasClick = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Find clicked table
    const clickedTable = mapElements.find(element => {
      if (element.type === 'table' && element.assignedTableId) {
        const shape = element.shape || 'square';
        const size = 25;
        
        if (shape === 'square') {
          return x >= element.x - size && x <= element.x + size && y >= element.y - size && y <= element.y + size;
        } else if (shape === 'round') {
          const distance = Math.sqrt((x - element.x) ** 2 + (y - element.y) ** 2);
          return distance <= size;
        } else if (shape === 'rectangle') {
          return x >= element.x - size * 1.5 && x <= element.x + size * 1.5 && 
                 y >= element.y - size * 0.7 && y <= element.y + size * 0.7;
        } else if (shape === 'oval') {
          const dx = (x - element.x) / 1.5;
          const dy = (y - element.y) / 0.7;
          const distance = Math.sqrt(dx ** 2 + dy ** 2);
          return distance <= size;
        }
      }
      return false;
    });

    if (clickedTable) {
      handleTableClick(clickedTable);
    }
  };

  useEffect(() => {
    if (canvasRef.current && !isLoading) {
      const ctx = canvasRef.current.getContext('2d');
      drawCanvas(ctx, mapElements);
    }
  }, [mapElements, tables, reservations, isLoading]);

  if (isLoading) {
    return (
      <div className="live-map-loading">
        <div className="loading-content">
          <div className="loading-spinner"></div>
          <p>Loading live map...</p>
        </div>
      </div>
    );
  }

  if (!restaurant?.restaurant_map?.elements?.length) {
    return (
      <div className="live-map-empty">
        <h3>🗺️ No Map Available</h3>
        <p>No restaurant map has been created yet.</p>
        <p>
          <a href={`/owner/map/${restaurantId}`} className="create-map-link">
            Create a map here
          </a>
        </p>
      </div>
    );
  }

  return (
    <div className="live-map-container">
      {error && (
        <div className="error-message">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Legend */}
      <div className="live-map-legend">
        <h3>Table Status Legend</h3>
        <div className="legend-items">
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: '#00ff00' }}></div>
            <span>Available</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: '#ff0000' }}></div>
            <span>Occupied</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: '#ffff00' }}></div>
            <span>Reserved (upcoming)</span>
          </div>
        </div>
        <p className="legend-note">Click on tables to change their status</p>
      </div>

      {/* Canvas */}
      <div className="live-map-canvas-container">
        <canvas
          ref={canvasRef}
          width={800}
          height={600}
          className="live-map-canvas"
          onClick={handleCanvasClick}
        />
      </div>

      {/* Auto-refresh indicator */}
      <div className="auto-refresh-indicator">
        <span>🔄 Auto-refreshes every 30 seconds</span>
      </div>

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="confirm-dialog-overlay">
          <div className="confirm-dialog">
            <h3>Confirm Action</h3>
            <p>{showConfirmDialog.message}</p>
            <div className="confirm-dialog-actions">
              <button
                className="btn btn-primary"
                onClick={handleConfirmAction}
              >
                Yes, Confirm
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => setShowConfirmDialog(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

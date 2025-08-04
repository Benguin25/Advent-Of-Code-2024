import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getSessionUser, signOut } from '../lib/supabaseAuth';
import {
  getRestaurantById,
  getTables,
  addTable,
  updateTable,
  deleteTable,
} from '../lib/supabaseService';
import './EditSeating.css';

export default function EditSeating() {
  const navigate = useNavigate();
  const { restaurantId } = useParams();
  const [restaurant, setRestaurant] = useState(null);
  const [tables, setTables] = useState([]);
  const [newTable, setNewTable] = useState({ name: '', capacity: '2' });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

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
        setError("You are not authorized to edit this restaurant's seating.");
        setRestaurant(null);
        setIsLoading(false);
        navigate('/owner-dashboard'); // Or some other appropriate page
        return;
      }
      setRestaurant(fetchedRestaurant);

      const fetchedTables = await getTables(fetchedRestaurant.id); // Use restaurant.id
      // Sort by name
      setTables(fetchedTables.sort((a, b) => (a.name || '').localeCompare(b.name || '')));
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

  const handleNewTableChange = e => {
    const { name, value } = e.target;
    setNewTable(prev => ({
      ...prev,
      [name]: name === 'capacity' ? value : value,
    }));
  };

  const handleAddTable = async () => {
    const parsedCapacity = parseInt(newTable.capacity, 10);
    if (!newTable.name.trim() || isNaN(parsedCapacity) || parsedCapacity <= 0) {
      setError('Table name cannot be empty and capacity must be greater than 0.');
      return;
    }
    if (!restaurant || !restaurant.id) {
      setError('Restaurant data is not available. Cannot add table.');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const tableDataForDb = {
        id: crypto.randomUUID(),
        name: newTable.name.trim(),
        capacity: parsedCapacity,
        status: 'available',
      };
      const addedTableFromDb = await addTable(restaurant.id, tableDataForDb);
      setTables(prevTables => {
        const updatedTables = [...prevTables, addedTableFromDb];
        return updatedTables.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      });
      setNewTable({ name: '', capacity: '2' });
    } catch (err) {
      console.error('Error adding table:', err);
      setError(err.message || 'Failed to add table. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateTable = async (tableId, field, value, { validate = false, revertOnError = false } = {}) => {
    const originalTables = [...tables];
    let updatedTables;
    if (field === 'capacity') {
      updatedTables = tables.map(table =>
        table.id === tableId ? { ...table, capacity: value } : table
      );
    } else {
      updatedTables = tables.map(table =>
        table.id === tableId ? { ...table, [field]: value } : table
      );
    }
    setTables(updatedTables.sort((a, b) => a.name.localeCompare(b.name)));
    const tableToUpdate = updatedTables.find(t => t.id === tableId);
    if (validate && field === 'capacity') {
      const parsedCapacity = parseInt(tableToUpdate.capacity, 10);
      if (isNaN(parsedCapacity) || parsedCapacity < 1) {
        setError('Capacity must be at least 1.');
        if (revertOnError) setTables(originalTables);
        return;
      }
    }
    if (validate && tableToUpdate.name.trim() === '') {
      setError('Table name cannot be empty.');
      if (revertOnError) setTables(originalTables);
      return;
    }
    setError('');
    if (validate) {
      try {
        await updateTable(tableId, { [field]: field === 'capacity' ? parseInt(tableToUpdate.capacity, 10) : tableToUpdate[field] });
      } catch (err) {
        console.error('Failed to update table:', err);
        setError('Could not update table. ' + err.message);
        if (revertOnError) setTables(originalTables);
      }
    }
  };

  const handleDeleteTable = async tableId => {
    if (window.confirm('Are you sure you want to delete this table?')) {
      setError('');
      try {
        await deleteTable(tableId);
        setTables(prev =>
          prev.filter(table => table.id !== tableId).sort((a, b) => a.name.localeCompare(b.name))
        );
      } catch (err) {
        console.error('Failed to delete table:', err);
        setError('Could not delete table. ' + err.message);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="edit-seating-loading-container">
        <div className="loading-content">
          <div className="loading-spinner"></div>
          <p>Loading seating information...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="edit-seating-wrapper">
      <div className="edit-seating-container">
        <div className="seating-header">
          <h1 className="seating-title">
            {restaurant ? `${restaurant.name} - Edit Seating` : 'Edit Seating'}
          </h1>
          <button
            className="btn btn-secondary back-btn"
            onClick={() => navigate('/owner-dashboard')}
          >
            Back to Dashboard
          </button>
        </div>

        {error && (
          <div className="error-message">
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Add New Table Form */}
        <div className="add-table-card">
          <h2 className="card-title">Add New Table</h2>
          <div className="add-table-form">
            <div className="form-group name-group">
              <label htmlFor="new-table-name" className="form-label">
                Table Name
              </label>
              <input
                type="text"
                id="new-table-name"
                name="name"
                value={newTable.name}
                onChange={handleNewTableChange}
                placeholder="e.g., Patio Table 1"
                className="form-input"
              />
            </div>
            <div className="form-group capacity-group">
              <label htmlFor="new-table-capacity" className="form-label">
                Capacity
              </label>
              <input
                type="text"
                id="new-table-capacity"
                name="capacity"
                value={newTable.capacity}
                onChange={handleNewTableChange}
                className="form-input"
              />
            </div>
            <div className="form-group button-group">
              <label className="form-label">&nbsp;</label>
              <button onClick={handleAddTable} className="btn btn-primary add-table-btn">
                Add Table
              </button>
            </div>
          </div>
        </div>

        {/* Current Tables List */}
        <div className="tables-card">
          <h2 className="card-title">Current Tables</h2>
          {tables.length === 0 ? (
            <div className="empty-state">
              <p>No tables added yet. Add your first table using the form above.</p>
            </div>
          ) : (
            <>
              <div className="tables-list">
                {tables.map(table => (
                  <div key={table.id} className="table-list-item">
                    <div className="table-fields">
                      <div className="table-field">
                        <label className="table-label">Table Name</label>
                        <input
                          type="text"
                          value={table.name}
                          onChange={e => handleUpdateTable(table.id, 'name', e.target.value)}
                          onBlur={e => {
                            const originalTable = tables.find(t => t.id === table.id);
                            if (originalTable && originalTable.name !== e.target.value.trim()) {
                              handleUpdateTable(table.id, 'name', e.target.value.trim());
                            } else if (e.target.value.trim() === '') {
                              e.target.value = originalTable?.name || '';
                              setError('Table name cannot be empty.');
                            }
                          }}
                          className="table-input"
                        />
                      </div>
                      <div className="table-field">
                        <label className="table-label">Capacity</label>
                        <input
                          type="text"
                          min="1"
                          value={table.capacity}
                          onChange={e => handleUpdateTable(table.id, 'capacity', e.target.value)}
                          onBlur={e => {
                            const originalTable = tables.find(t => t.id === table.id);
                            const newCapacity = parseInt(e.target.value, 10);
                            if (e.target.value === '' || isNaN(newCapacity) || newCapacity < 1) {
                              // revert to previous valid value
                              setError('Capacity must be at least 1.');
                              setTables(tables.map(t => t.id === table.id ? { ...t, capacity: originalTable.capacity } : t));
                            } else {
                              setError('');
                              handleUpdateTable(table.id, 'capacity', e.target.value, { validate: true });
                            }
                          }}
                          className="table-input capacity-input"
                        />
                      </div>
                      <div className="table-actions">
                        <button
                          onClick={() => handleDeleteTable(table.id)}
                          className="btn btn-danger delete-btn"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="seating-summary">
                <h3>Seating Summary</h3>
                <div className="summary-stats">
                  <div className="stat-item">
                    <span className="stat-label">Total Tables:</span>
                    <span className="stat-value">{tables.length}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Total Capacity:</span>
                    <span className="stat-value">
                      {tables.reduce((sum, table) => sum + (parseInt(table.capacity, 10) || 0), 0)} guests
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

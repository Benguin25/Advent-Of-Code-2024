import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createRestaurant, generateSlug, addTable } from '../lib/supabaseService';
import { supabase } from '../lib/supabaseClient';
import { getSessionUser, signOut } from '../lib/supabaseAuth';
import './CreateRestaurantWizard.css';


// Step 1: Basic Information
function Step1({ formData, setFormData, onNext }) {
  const [errors, setErrors] = useState({});

  const handleChange = e => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateAndNext = () => {
    const newErrors = {};

    if (!formData.restaurantName.trim()) {
      newErrors.restaurantName = 'Restaurant name is required';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Please provide a description of your restaurant';
    }

    if (!formData.cuisine.trim()) {
      newErrors.cuisine = 'Cuisine type is required';
    }

    if (!formData.address.trim()) {
      newErrors.address = 'Address is required';
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      onNext();
    }
  };

  return (
    <div className="wizard-step">
      <div className="step-header">
        <h2>Tell us about your restaurant</h2>
        <p>Let's start with the basics - we'll help you create an amazing profile</p>
      </div>

      <div className="step-content">
        <div className="form-group">
          <label htmlFor="restaurantName">
            Restaurant Name <span className="required">*</span>
          </label>
          <input
            type="text"
            id="restaurantName"
            name="restaurantName"
            value={formData.restaurantName}
            onChange={handleChange}
            placeholder="What's the name of your restaurant?"
            className={errors.restaurantName ? 'error' : ''}
          />
          {errors.restaurantName && <span className="error-text">{errors.restaurantName}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="description">
            Description <span className="required">*</span>
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Describe your restaurant's atmosphere, specialties, and what makes it unique..."
            rows="4"
            className={errors.description ? 'error' : ''}
          />
          {errors.description && <span className="error-text">{errors.description}</span>}
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="cuisine">
              Cuisine Type <span className="required">*</span>
            </label>
            <input
              type="text"
              id="cuisine"
              name="cuisine"
              value={formData.cuisine}
              onChange={handleChange}
              placeholder="e.g., Italian, Mexican, Asian Fusion"
              className={errors.cuisine ? 'error' : ''}
            />
            {errors.cuisine && <span className="error-text">{errors.cuisine}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="phoneNumber">Phone Number</label>
            <input
              type="tel"
              id="phoneNumber"
              name="phoneNumber"
              value={formData.phoneNumber}
              onChange={handleChange}
              placeholder="(555) 123-4567"
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="address">
            Address <span className="required">*</span>
          </label>
          <input
            type="text"
            id="address"
            name="address"
            value={formData.address}
            onChange={handleChange}
            placeholder="123 Main St, City, State 12345"
            className={errors.address ? 'error' : ''}
          />
          {errors.address && <span className="error-text">{errors.address}</span>}
        </div>
      </div>

      <div className="step-actions">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => window.location.assign('/owner-dashboard')}
        >
          Back
        </button>
        <button type="button" className="btn btn-primary" onClick={validateAndNext}>
          Upload Logo
        </button>
      </div>
    </div>
  );
}

// Step 2: Logo Upload
function Step2({ formData, setFormData, onNext, onBack }) {
  const [logoFile, setLogoFile] = useState(null);
  const [error, setError] = useState('');
  const [previewUrl, setPreviewUrl] = useState(formData.logo_url || '');

  const handleFileChange = e => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 500 * 1024) {
      setError('Logo must be less than 500kb.');
      setLogoFile(null);
      setPreviewUrl('');
      return;
    }
    setLogoFile(file);
    setError('');
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleUploadAndNext = async () => {
    if (!logoFile) {
      setError('Please select a logo to upload.');
      return;
    }
    setError('');
    const fileExt = logoFile.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
    const { error } = await supabase.storage.from('logos').upload(fileName, logoFile, {
      cacheControl: '3600',
      upsert: false,
    });
    if (error) {
      setError('Failed to upload logo. Please try again.');
      return;
    }
    const { data: urlData } = supabase.storage.from('logos').getPublicUrl(fileName);
    if (!urlData || !urlData.publicUrl) {
      setError('Could not get logo URL.');
      return;
    }
    setFormData(prev => ({ ...prev, logo_url: urlData.publicUrl }));
    onNext();
  };

  return (
    <div className="wizard-step">
      <div className="step-header">
        <h2>Upload Your Restaurant Logo</h2>
        <p>Add a logo to help your restaurant stand out. Max file size: 500kb.</p>
      </div>
      <div className="step-content">
        <input type="file" accept="image/*" onChange={handleFileChange} />
        {previewUrl && (
          <div style={{ marginTop: '1rem' }}>
            <img
              src={previewUrl}
              alt="Logo Preview"
              style={{ maxWidth: 200, maxHeight: 200, borderRadius: 8 }}
            />
          </div>
        )}
        {error && <div className="error-message">{error}</div>}
      </div>
      <div className="step-actions">
        <button type="button" className="btn btn-secondary" onClick={onBack}>
          Back
        </button>
        <button type="button" className="btn btn-primary" onClick={handleUploadAndNext}>
          Set Hours
        </button>
      </div>
    </div>
  );
}

// Step 3: Operating Hours
function Step3({ formData, setFormData, onNext, onBack }) {
  const handleChange = e => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const copyToAll = day => {
    const openTime = formData[`${day}_open`];
    const closeTime = formData[`${day}_close`];

    if (openTime && closeTime) {
      const updates = {};
      ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].forEach(d => {
        if (d !== day) {
          updates[`${d}_open`] = openTime;
          updates[`${d}_close`] = closeTime;
        }
      });
      setFormData(prev => ({ ...prev, ...updates }));
    }
  };

  const clearDay = day => {
    const updates = {};
    updates[`${day}_open`] = '';
    updates[`${day}_close`] = '';
    setFormData(prev => ({ ...prev, ...updates }));
  };

  return (
    <div className="wizard-step">
      <div className="step-header">
        <h2>When are you open?</h2>
        <p>Set your operating hours so customers know when to visit</p>
      </div>

      <div className="step-content">
        <div className="hours-grid">
          {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(
            day => {
              const lowerDay = day.toLowerCase();
              return (
                <div key={day} className="day-hours-row">
                  <div className="day-label">{day}</div>
                  <div className="time-inputs">
                    <input
                      type="time"
                      id={`${lowerDay}_open`}
                      name={`${lowerDay}_open`}
                      value={formData[`${lowerDay}_open`]}
                      onChange={handleChange}
                      className="time-input"
                    />
                    <span className="time-separator">to</span>
                    <input
                      type="time"
                      id={`${lowerDay}_close`}
                      name={`${lowerDay}_close`}
                      value={formData[`${lowerDay}_close`]}
                      onChange={handleChange}
                      className="time-input"
                    />
                    <button
                      type="button"
                      className="copy-hours-btn"
                      onClick={() => copyToAll(lowerDay)}
                      title="Copy these hours to all days"
                    >
                      Copy to all
                    </button>
                    <button
                      type="button"
                      className="clear-day-btn"
                      onClick={() => clearDay(lowerDay)}
                      title="Mark this day as closed"
                    >
                      Clear Day
                    </button>
                  </div>
                </div>
              );
            }
          )}
        </div>
        <p className="hint-text">
          💡 Tip: Set hours for one day and click "Copy to all" to apply to all days, then adjust
          individual days as needed.
        </p>
      </div>

      <div className="step-actions">
        <button type="button" className="btn btn-secondary" onClick={onBack}>
          Back
        </button>
        <button type="button" className="btn btn-primary" onClick={onNext}>
          Reservation Settings
        </button>
      </div>
    </div>
  );
}

// Step 4: Reservation Settings
function Step4({ setFormData, onNext, onBack }) {
  const [duration, setDuration] = useState({ hours: 1, minutes: 30 });
  const [minNotice, setMinNotice] = useState(2);
  const [maxAdvance, setMaxAdvance] = useState(30);
  const [partySize, setPartySize] = useState({ min: 1, max: 8 });

  const handleDurationChange = (field, value) => {
    const newDuration = { ...duration, [field]: parseInt(value) || 0 };
    setDuration(newDuration);
    setFormData(prev => ({
      ...prev,
      reservation_duration: JSON.stringify(newDuration),
    }));
  };

  const handleMinNoticeChange = value => {
    setMinNotice(parseInt(value) || 0);
    setFormData(prev => ({
      ...prev,
      min_advance_hours: parseInt(value) || 0,
    }));
  };

  const handleMaxAdvanceChange = value => {
    setMaxAdvance(parseInt(value) || 0);
    setFormData(prev => ({
      ...prev,
      advance_booking_days: parseInt(value) || 0,
    }));
  };

  const handlePartySizeChange = (field, value) => {
    const newPartySize = { ...partySize, [field]: parseInt(value) || 1 };
    setPartySize(newPartySize);
    setFormData(prev => ({
      ...prev,
      [`${field}_party_size`]: parseInt(value) || 1,
    }));
  };

  return (
    <div className="wizard-step">
      <div className="step-header">
        <h2>Reservation Settings</h2>
        <p>Configure how reservations work at your restaurant</p>
      </div>

      <div className="step-content">
        <div className="form-group">
          <label>Default Reservation Duration</label>
          <div className="duration-inputs">
            <div className="duration-field">
              <input
                type="number"
                min="0"
                max="12"
                value={duration.hours}
                onChange={e => handleDurationChange('hours', e.target.value)}
              />
              <span>hours</span>
            </div>
            <div className="duration-field">
              <input
                type="number"
                min="0"
                max="59"
                step="15"
                value={duration.minutes}
                onChange={e => handleDurationChange('minutes', e.target.value)}
              />
              <span>minutes</span>
            </div>
          </div>
          <small className="field-hint">
            How long should each reservation slot last? Most restaurants use 1.5-2 hours.
          </small>
        </div>

        <div className="form-group">
          <label>Minimum Notice Required</label>
          <div className="duration-inputs">
            <div className="duration-field">
              <input
                type="number"
                min="0"
                max="72"
                value={minNotice}
                onChange={e => handleMinNoticeChange(e.target.value)}
              />
              <span>hours</span>
            </div>
          </div>
          <small className="field-hint">
            How far in advance must customers book? (0 = same day allowed)
          </small>
        </div>

        <div className="form-group">
          <label>Maximum Advance Booking</label>
          <div className="duration-inputs">
            <div className="duration-field">
              <input
                type="number"
                min="1"
                max="365"
                value={maxAdvance}
                onChange={e => handleMaxAdvanceChange(e.target.value)}
              />
              <span>days</span>
            </div>
          </div>
          <small className="field-hint">
            How far in advance can customers book? (30 days is common)
          </small>
        </div>

        <div className="form-group">
          <label>Party Size Limits</label>
          <div className="duration-inputs">
            <div className="duration-field">
              <span>Min:</span>
              <input
                type="number"
                min="1"
                max="20"
                value={partySize.min}
                onChange={e => handlePartySizeChange('min', e.target.value)}
              />
              <span>people</span>
            </div>
            <div className="duration-field">
              <span>Max:</span>
              <input
                type="number"
                min="1"
                max="50"
                value={partySize.max}
                onChange={e => handlePartySizeChange('max', e.target.value)}
              />
              <span>people</span>
            </div>
          </div>
          <small className="field-hint">
            Set the minimum and maximum party sizes for online reservations
          </small>
        </div>
      </div>

      <div className="step-actions">
        <button type="button" className="btn btn-secondary" onClick={onBack}>
          Back
        </button>
        <button type="button" className="btn btn-primary" onClick={onNext}>
          Set Tables
        </button>
      </div>
    </div>
  );
}

// Step 5: Table Setup
function Step5({ tables, setTables, onNext, onBack }) {
  const [newTable, setNewTable] = useState({ name: '', capacity: '2' });
  const [error, setError] = useState('');

  const handleNewTableChange = e => {
    const { name, value } = e.target;
    setNewTable(prev => ({
      ...prev,
      [name]: name === 'capacity' ? value : value,
    }));
  };

  const handleAddTable = () => {
    const parsedCapacity = parseInt(newTable.capacity, 10);
    if (!newTable.name.trim() || isNaN(parsedCapacity) || parsedCapacity <= 0) {
      setError('Table name cannot be empty and capacity must be greater than 0.');
      return;
    }

    // Check for duplicate table names
    if (tables.some(table => table.name.toLowerCase() === newTable.name.trim().toLowerCase())) {
      setError('A table with this name already exists.');
      return;
    }

    setError('');
    const tableToAdd = {
      id: crypto.randomUUID(),
      name: newTable.name.trim(),
      capacity: parsedCapacity,
      status: 'available',
    };

    setTables(prev => [...prev, tableToAdd].sort((a, b) => a.name.localeCompare(b.name)));
    setNewTable({ name: '', capacity: '2' });
  };

  const handleUpdateTable = (tableId, field, value) => {
    if (field === 'capacity') {
      setTables(prev =>
        prev
          .map(table =>
            table.id === tableId ? { ...table, capacity: value } : table
          )
          .sort((a, b) => a.name.localeCompare(b.name))
      );
      const parsedCapacity = parseInt(value, 10);
      if (isNaN(parsedCapacity) || parsedCapacity <= 0) {
        setError('Capacity must be a positive number.');
        return;
      }
    } else if (field === 'name') {
      if (!value.trim()) {
        setError('Table name cannot be empty.');
        return;
      }
      const existingTable = tables.find(
        t => t.id !== tableId && t.name.toLowerCase() === value.trim().toLowerCase()
      );
      if (existingTable) {
        setError('A table with this name already exists.');
        return;
      }
      setTables(prev =>
        prev
          .map(table =>
            table.id === tableId ? { ...table, name: value.trim() } : table
          )
          .sort((a, b) => a.name.localeCompare(b.name))
      );
    }
    setError('');
  };

  const handleDeleteTable = tableId => {
    setTables(prev => prev.filter(table => table.id !== tableId));
  };

  const handleNext = () => {
    if (tables.length === 0) {
      setError(
        'Please add at least one table before continuing. You can modify tables later from your dashboard.'
      );
      return;
    }
    setError('');
    onNext();
  };

  const totalCapacity = tables.reduce((sum, table) => sum + table.capacity, 0);

  return (
    <div className="wizard-step">
      <div className="step-header">
        <h2>Set up your tables</h2>
        <p>Add tables to your restaurant. You can always modify these later from your dashboard.</p>
      </div>

      <div className="step-content">
        {error && <div className="error-message">{error}</div>}

        {/* Add New Table Form */}
        <div className="table-setup-section">
          <h3>Add New Table</h3>
          <div className="add-table-form">
            <div className="form-group">
              <label htmlFor="table-name">Table Name</label>
              <input
                type="text"
                id="table-name"
                name="name"
                value={newTable.name}
                onChange={handleNewTableChange}
                placeholder="e.g., Table 1, Patio A, Window Booth"
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label htmlFor="table-capacity">Capacity</label>
              <input
                type="text"
                id="table-capacity"
                name="capacity"
                value={newTable.capacity}
                onChange={handleNewTableChange}
                className="form-input"
              />
            </div>
            <button type="button" onClick={handleAddTable} className="btn btn-secondary">
              Add Table
            </button>
          </div>
        </div>

        {/* Current Tables List */}
        {tables.length > 0 && (
          <div className="tables-list-section">
            <h3>Your Tables</h3>
            <div className="tables-grid">
              {tables.map(table => (
                <div key={table.id} className="table-item">
                  <div className="table-field">
                    <label>Name</label>
                    <input
                      type="text"
                      value={table.name}
                      onChange={e => handleUpdateTable(table.id, 'name', e.target.value)}
                      className="form-input"
                    />
                  </div>
                  <div className="table-field">
                    <label>Capacity</label>
                    <input
                      type="text"
                      min="1"
                      max="20"
                      value={table.capacity}
                      onChange={e => handleUpdateTable(table.id, 'capacity', e.target.value)}
                      onBlur={e => {
                        const parsedCapacity = parseInt(e.target.value, 10);
                        if (isNaN(parsedCapacity) || parsedCapacity < 1) {
                          setError('Capacity must be at least 1.');
                          // Optionally revert to previous valid value here
                        } else {
                          setError('');
                        }
                      }}
                      className="form-input"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteTable(table.id)}
                    className="btn btn-danger delete-btn"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>

            <div className="seating-summary">
              <div className="summary-stats">
                <div className="stat-item">
                  <span className="stat-label">Total Tables:</span>
                  <span className="stat-value">{tables.length}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Total Capacity:</span>
                  <span className="stat-value">{totalCapacity} guests</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {tables.length === 0 && (
          <div className="empty-state">
            <p>No tables added yet. Add your first table using the form above.</p>
            <p>
              <em>Note: You'll need at least one table to continue.</em>
            </p>
          </div>
        )}
      </div>

      <div className="step-actions">
        <button type="button" className="btn btn-secondary" onClick={onBack}>
          Back
        </button>
        <button type="button" className="btn btn-primary" onClick={handleNext}>
          Review
        </button>
      </div>
    </div>
  );
}

// Step 6: Preview and Confirm
function Step6({ formData, tables, onSubmit, onBack, isSubmitting, error }) {
  const duration = formData.reservation_duration
    ? JSON.parse(formData.reservation_duration)
    : { hours: 1, minutes: 30 };

  return (
    <div className="wizard-step">
      <div className="step-header">
        <h2>Review & Confirm</h2>
        <p>Please review all information before creating your restaurant</p>
      </div>

      <div className="step-content">
        <div className="settings-preview">
          <h4>Restaurant Preview</h4>
          {formData.logo_url && (
            <div style={{ marginBottom: '1rem', textAlign: 'center' }}>
              <img
                src={formData.logo_url}
                alt="Restaurant Logo"
                style={{ maxWidth: 300, maxHeight: 300, borderRadius: 8 }}
              />
            </div>
          )}
          <div className="preview-content">
            <div className="preview-section">
              <h5>Restaurant Information</h5>
              <div className="preview-item">
                <span>Name:</span>
                <span>{formData.restaurantName || 'Not set'}</span>
              </div>
              <div className="preview-item">
                <span>Cuisine:</span>
                <span>{formData.cuisine || 'Not set'}</span>
              </div>
              <div className="preview-item">
                <span>Phone:</span>
                <span>{formData.phoneNumber || 'Not set'}</span>
              </div>
              <div className="preview-item">
                <span>Address:</span>
                <span>{formData.address || 'Not set'}</span>
              </div>
              {formData.description && (
                <div className="preview-item">
                  <span>Description:</span>
                  <span>
                    {formData.description.substring(0, 100)}
                    {formData.description.length > 100 ? '...' : ''}
                  </span>
                </div>
              )}
            </div>

            <div className="preview-section">
              <h5>Operating Hours</h5>
              {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(
                day => {
                  const openTime = formData[`${day}_open`];
                  const closeTime = formData[`${day}_close`];
                  const dayName = day.charAt(0).toUpperCase() + day.slice(1);

                  return (
                    <div key={day} className="preview-item">
                      <span>{dayName}:</span>
                      <span>{openTime && closeTime ? `${openTime} - ${closeTime}` : 'Closed'}</span>
                    </div>
                  );
                }
              )}
            </div>

            <div className="preview-section">
              <h5>Reservation Settings</h5>
              <div className="preview-item">
                <span>Duration:</span>
                <span>
                  {duration.hours > 0 && `${duration.hours} hour${duration.hours !== 1 ? 's' : ''}`}
                  {duration.hours > 0 && duration.minutes > 0 && ' '}
                  {duration.minutes > 0 && `${duration.minutes} minutes`}
                  {duration.hours === 0 && duration.minutes === 0 && 'Not set'}
                </span>
              </div>
              <div className="preview-item">
                <span>Minimum Notice:</span>
                <span>{formData.min_advance_hours || 2} hours</span>
              </div>
              <div className="preview-item">
                <span>Max Advance Booking:</span>
                <span>{formData.advance_booking_days || 30} days</span>
              </div>
              <div className="preview-item">
                <span>Party Size:</span>
                <span>
                  {formData.min_party_size || 1} - {formData.max_party_size || 8} people
                </span>
              </div>
            </div>

            <div className="preview-section">
              <h5>Tables & Seating</h5>
              <div className="preview-item">
                <span>Total Tables:</span>
                <span>{tables.length}</span>
              </div>
              <div className="preview-item">
                <span>Total Capacity:</span>
                <span>{tables.reduce((sum, table) => sum + table.capacity, 0)} guests</span>
              </div>
              {tables.length > 0 && (
                <div className="tables-preview">
                  <span>Tables:</span>
                  <div className="tables-list">
                    {tables.map(table => (
                      <span key={table.id} className="table-preview-item">
                        {table.name} ({table.capacity} guests)
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="confirmation-notice">
          <h4>Ready to create your restaurant?</h4>
          <p>
            Your restaurant will be created with all the settings above. You can modify any of these
            settings later from your dashboard.
          </p>
        </div>

        {error && <div className="error-message">{error}</div>}
      </div>

      <div className="step-actions">
        <button type="button" className="btn btn-secondary" onClick={onBack}>
          Back
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={onSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Creating Restaurant...' : 'Create Restaurant'}
        </button>
      </div>
    </div>
  );
}

export default function CreateRestaurantWizard() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [currentUser, setCurrentUser] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [tables, setTables] = useState([]);

  const [formData, setFormData] = useState({
    restaurantName: '',
    phoneNumber: '',
    description: '',
    cuisine: '',
    address: '',
    logo_url: '',
    monday_open: '',
    monday_close: '',
    tuesday_open: '',
    tuesday_close: '',
    wednesday_open: '',
    wednesday_close: '',
    thursday_open: '',
    thursday_close: '',
    friday_open: '',
    friday_close: '',
    saturday_open: '',
    saturday_close: '',
    sunday_open: '',
    sunday_close: '',
    reservation_duration: JSON.stringify({ hours: 1, minutes: 30 }),
    min_advance_hours: 2,
    advance_booking_days: 30,
    min_party_size: 1,
    max_party_size: 8,
  });

  useEffect(() => {
    const fetchUser = async () => {
      const { user } = await getSessionUser();
      if (!user) {
        navigate('/login');
      } else if (user.email === 'guest@guest.com') {
        await signOut();
        navigate('/login');
      } else {
        setCurrentUser(user);
      }
    };
    fetchUser();
  }, [navigate]);

  const handleNext = () => {
    setCurrentStep(prev => prev + 1);
  };

  const handleBack = () => {
    setCurrentStep(prev => prev - 1);
  };

  const handleSubmit = async () => {
    if (!currentUser) {
      setError('User not authenticated. Please login.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    const slug = generateSlug(formData.restaurantName);

    const restaurantData = {
      name: formData.restaurantName,
      slug: slug,
      description: formData.description || null,
      cuisine: formData.cuisine || null,
      address: formData.address || null,
      logo_url: formData.logo_url || null,
      monday_open: formData.monday_open || null,
      monday_close: formData.monday_close || null,
      tuesday_open: formData.tuesday_open || null,
      tuesday_close: formData.tuesday_close || null,
      wednesday_open: formData.wednesday_open || null,
      wednesday_close: formData.wednesday_close || null,
      thursday_open: formData.thursday_open || null,
      thursday_close: formData.thursday_close || null,
      friday_open: formData.friday_open || null,
      friday_close: formData.friday_close || null,
      saturday_open: formData.saturday_open || null,
      saturday_close: formData.saturday_close || null,
      sunday_open: formData.sunday_open || null,
      sunday_close: formData.sunday_close || null,
      reservation_duration: formData.reservation_duration
        ? JSON.parse(formData.reservation_duration)
        : null,
      min_advance_hours: formData.min_advance_hours || 2,
      advance_booking_days: formData.advance_booking_days || 30,
      min_party_size: formData.min_party_size || 1,
      max_party_size: formData.max_party_size || 8,
      owner_id: currentUser.id,
    };

    try {
      const newRestaurant = await createRestaurant(restaurantData);
      // Create tables for the restaurant
      if (tables.length > 0) {
        const tablePromises = tables.map(table => {
          const tableData = {
            id: table.id,
            name: table.name,
            capacity: table.capacity,
            status: table.status,
          };
          return addTable(newRestaurant.id, tableData);
        });

        await Promise.all(tablePromises);
      }

      navigate('/owner-dashboard');
    } catch (err) {
      console.error('Failed to create restaurant:', err);
      setError(err.message || 'Failed to create restaurant. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <Step1 formData={formData} setFormData={setFormData} onNext={handleNext} />;
      case 2:
        return (
          <Step2
            formData={formData}
            setFormData={setFormData}
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      case 3:
        return (
          <Step3
            formData={formData}
            setFormData={setFormData}
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      case 4:
        return (
          <Step4
            formData={formData}
            setFormData={setFormData}
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      case 5:
        return (
          <Step5 tables={tables} setTables={setTables} onNext={handleNext} onBack={handleBack} />
        );
      case 6:
        return (
          <Step6
            formData={formData}
            tables={tables}
            onSubmit={handleSubmit}
            onBack={handleBack}
            isSubmitting={isSubmitting}
            error={error}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="wizard-page-wrapper">
      <div className="wizard-container">
        <div className="wizard-header">
          <h1>Create Your Restaurant</h1>
          <div className="progress-bar">
            <div className="progress-steps">
              <div
                className={`step ${currentStep >= 1 ? 'active' : ''} ${currentStep > 1 ? 'completed' : ''}`}
              >
                <span className="step-number">1</span>
                <span className="step-label">Basic Info</span>
              </div>
              <div
                className={`step ${currentStep >= 2 ? 'active' : ''} ${currentStep > 2 ? 'completed' : ''}`}
              >
                <span className="step-number">2</span>
                <span className="step-label">Logo</span>
              </div>
              <div
                className={`step ${currentStep >= 3 ? 'active' : ''} ${currentStep > 3 ? 'completed' : ''}`}
              >
                <span className="step-number">3</span>
                <span className="step-label">Hours</span>
              </div>
              <div
                className={`step ${currentStep >= 4 ? 'active' : ''} ${currentStep > 4 ? 'completed' : ''}`}
              >
                <span className="step-number">4</span>
                <span className="step-label">Settings</span>
              </div>
              <div
                className={`step ${currentStep >= 5 ? 'active' : ''} ${currentStep > 5 ? 'completed' : ''}`}
              >
                <span className="step-number">5</span>
                <span className="step-label">Tables</span>
              </div>
              <div className={`step ${currentStep >= 6 ? 'active' : ''}`}>
                <span className="step-number">6</span>
                <span className="step-label">Review</span>
              </div>
            </div>
            <div className="progress-line">
              <div
                className="progress-fill"
                style={{ width: `${((currentStep - 1) / 5) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>

        <div className="wizard-content">{renderStep()}</div>
      </div>
    </div>
  );
}

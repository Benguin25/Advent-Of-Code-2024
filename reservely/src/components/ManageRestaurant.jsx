import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useNavigate, useParams } from 'react-router-dom';
import { getSessionUser, signOut } from '../lib/supabaseAuth';
import { getRestaurantById, updateRestaurant, deleteRestaurant } from '../lib/supabaseService';
import './ManageRestaurant.css';

export default function ManageRestaurant() {
  const navigate = useNavigate();
  const { restaurantId } = useParams();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    cuisine: '',
    address: '',
    phoneNumber: '',
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
    reservation_duration: '',
    max_party_size: '',
    advance_booking_days: '',
    min_advance_hours: '',
  });
  const [logoError, setLogoError] = useState('');
  const [logoPreviewUrl, setLogoPreviewUrl] = useState('');
  const [selectedLogoFile, setSelectedLogoFile] = useState(null); // Store file until save
  const [originalData, setOriginalData] = useState(null);
  const [editingSections, setEditingSections] = useState({
    basic: false,
    hours: false,
    reservations: false,
  });

  const fetchRestaurantDetails = useCallback(async () => {
    setIsLoading(true);
    setError('');
    setSuccessMessage('');

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
      setError('No restaurant ID provided.');
      setIsLoading(false);
      return;
    }

    try {
      const restaurant = await getRestaurantById(restaurantId);
      if (!restaurant) {
        setError('Restaurant not found.');
        setIsLoading(false);
        return;
      }
      // Security check: Ensure the logged-in user owns this restaurant
      if (restaurant.owner_id !== user.id) {
        setError('You are not authorized to manage this restaurant.');
        navigate('/owner-dashboard'); // Or a generic access denied page
        return;
      }

      const currentData = {
        name: restaurant.name || '',
        description: restaurant.description || '',
        cuisine: restaurant.cuisine || '',
        address: restaurant.address || '',
        phoneNumber: restaurant.phone_number || '',
        logo_url: restaurant.logo_url || '',
        monday_open: restaurant.monday_open || '',
        monday_close: restaurant.monday_close || '',
        tuesday_open: restaurant.tuesday_open || '',
        tuesday_close: restaurant.tuesday_close || '',
        wednesday_open: restaurant.wednesday_open || '',
        wednesday_close: restaurant.wednesday_close || '',
        thursday_open: restaurant.thursday_open || '',
        thursday_close: restaurant.thursday_close || '',
        friday_open: restaurant.friday_open || '',
        friday_close: restaurant.friday_close || '',
        saturday_open: restaurant.saturday_open || '',
        saturday_close: restaurant.saturday_close || '',
        sunday_open: restaurant.sunday_open || '',
        sunday_close: restaurant.sunday_close || '',
        reservation_duration: restaurant.reservation_duration
          ? JSON.stringify(restaurant.reservation_duration)
          : '',
        max_party_size: restaurant.max_party_size ? restaurant.max_party_size.toString() : '',
        advance_booking_days: restaurant.advance_booking_days
          ? restaurant.advance_booking_days.toString()
          : '',
        min_advance_hours: restaurant.min_advance_hours
          ? restaurant.min_advance_hours.toString()
          : '',
      };
      setLogoPreviewUrl(restaurant.logo_url || '');
      setFormData(currentData);
      setOriginalData(currentData); // Store original data for reset
    } catch (err) {
      console.error('Failed to fetch restaurant details:', err);
      setError(err.message || 'Failed to load restaurant data.');
    } finally {
      setIsLoading(false);
    }
  }, [navigate, restaurantId]);

  useEffect(() => {
    fetchRestaurantDetails();
  }, [fetchRestaurantDetails]);

  const handleChange = e => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    if (successMessage) setSuccessMessage(''); // Clear success message on edit
    if (error) setError(''); // Clear error message on edit
  };

  // Logo file change handler
  // Only store file and preview until save
  const handleLogoFileChange = e => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 500 * 1024) {
      setLogoError('Logo must be less than 500kb.');
      setLogoPreviewUrl('');
      setSelectedLogoFile(null);
      return;
    }
    setLogoError('');
    setLogoPreviewUrl(URL.createObjectURL(file));
    setSelectedLogoFile(file);
  };

  const handleEditSection = section => {
    setEditingSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const handleCancelEdit = section => {
    setEditingSections(prev => ({
      ...prev,
      [section]: false,
    }));
    // Reset form data to original data
    if (originalData) {
      setFormData(originalData);
    }
  };

  const handleSaveSection = async section => {
    setIsSubmitting(true);
    setError('');
    setSuccessMessage('');

    try {
      let logoUrl = formData.logo_url || null;
      let oldLogoUrl = originalData?.logo_url || null;
      let uploadedFileName = null;
      let newLogoUploaded = false;

      // If a new logo file is selected, upload it now
      if (selectedLogoFile) {
        const file = selectedLogoFile;
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('logos').upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });
        if (uploadError) {
          setLogoError('Failed to upload logo. Please try again.');
          setIsSubmitting(false);
          return;
        }
        const { data: urlData } = supabase.storage.from('logos').getPublicUrl(fileName);
        if (!urlData || !urlData.publicUrl) {
          setLogoError('Could not get logo URL.');
          setIsSubmitting(false);
          return;
        }
        logoUrl = urlData.publicUrl;
        uploadedFileName = fileName;
        newLogoUploaded = true;
      }

      const updateData = {
        name: formData.name,
        description: formData.description || null,
        cuisine: formData.cuisine || null,
        address: formData.address || null,
        logo_url: logoUrl,
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
        max_party_size: formData.max_party_size ? parseInt(formData.max_party_size) : null,
        advance_booking_days: formData.advance_booking_days
          ? parseInt(formData.advance_booking_days)
          : null,
        min_advance_hours: formData.min_advance_hours ? parseInt(formData.min_advance_hours) : null,
      };

      await updateRestaurant(restaurantId, updateData);

      // After successful update, delete the old logo if a new one was uploaded
      if (newLogoUploaded && oldLogoUrl && oldLogoUrl.includes('/storage/v1/object/public/logos/')) {
        // Extract filename from URL
        const parts = oldLogoUrl.split('/');
        const oldFileName = parts[parts.length - 1];
        if (oldFileName && oldFileName !== uploadedFileName) {
          try {
            await supabase.storage.from('logos').remove([oldFileName]);
          } catch (removeErr) {
            console.error('Failed to delete old logo:', removeErr);
          }
        }
      }

      setSuccessMessage('Restaurant updated successfully!');
      setEditingSections(prev => ({
        ...prev,
        [section]: false,
      }));

      // Update original data and formData with new logo_url if changed
      const updatedData = { ...formData, logo_url: logoUrl };
      setOriginalData(updatedData);
      setFormData(updatedData);
      setSelectedLogoFile(null);
      setLogoPreviewUrl('');
    } catch (err) {
      console.error('Failed to update restaurant:', err);
      setError(err.message || 'Failed to update restaurant. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    setSuccessMessage('');

    if (JSON.stringify(formData) === JSON.stringify(originalData)) {
      setSuccessMessage('No changes detected.');
      setIsSubmitting(false);
      return;
    }

    try {
      // Prepare the data for submission
      const updateData = {
        name: formData.name,
        description: formData.description || null,
        cuisine: formData.cuisine || null,
        address: formData.address || null,
        phone_number: formData.phoneNumber || null,
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
        max_party_size: formData.max_party_size ? parseInt(formData.max_party_size) : null,
        advance_booking_days: formData.advance_booking_days
          ? parseInt(formData.advance_booking_days)
          : null,
        min_advance_hours: formData.min_advance_hours ? parseInt(formData.min_advance_hours) : null,
      };

      await updateRestaurant(restaurantId, updateData);
      setSuccessMessage('Restaurant details updated successfully!');
      setOriginalData(formData);
    } catch (err) {
      console.error('Failed to update restaurant:', err);
      setError(err.message || 'Failed to update restaurant. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="manage-restaurant-page-wrapper">
        <div className="manage-restaurant-container">
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <div className="loading-text">Loading restaurant details...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="manage-restaurant-page-wrapper">
      <div className="manage-restaurant-container">
        <div className="manage-restaurant-header">
          <button onClick={() => navigate('/owner-dashboard')} className="back-to-dashboard-btn">
            ← Back to Dashboard
          </button>
          <h1 className="manage-restaurant-title">Manage Restaurant</h1>
        </div>

        {error && <div className="error-message">{error}</div>}

        {successMessage && <div className="success-message">{successMessage}</div>}

        {!originalData && !isLoading && !error && (
          <div className="error-message">
            Could not load restaurant data. It might have been deleted or there was an issue
            fetching it.
          </div>
        )}

        {originalData && (
          <form onSubmit={handleSubmit} className="manage-restaurant-form">
            {/* Basic Information Section */}
            <div className="form-section">
              <div className="section-header">
                <h3 className="section-title">Basic Information</h3>
                <div className="section-actions">
                  {!editingSections.basic ? (
                    <button
                      type="button"
                      className="btn btn-edit"
                      onClick={() => handleEditSection('basic')}
                    >
                      Edit
                    </button>
                  ) : (
                    <div className="edit-actions">
                      <button
                        type="button"
                        className="btn btn-secondary btn-small"
                        onClick={() => handleCancelEdit('basic')}
                        disabled={isSubmitting}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="btn btn-primary btn-small"
                        onClick={() => handleSaveSection('basic')}
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div className="form-grid">
                {/* Logo Upload */}
                <div className="form-group">
                  <label htmlFor="logo-upload" className="form-label">
                    Restaurant Logo
                  </label>
                  {editingSections.basic ? (
                    <>
                      <input
                        type="file"
                        id="logo-upload"
                        accept="image/*"
                        onChange={handleLogoFileChange}
                      />
                      {logoPreviewUrl && (
                        <div style={{ marginTop: '1rem' }}>
                          <img
                            src={logoPreviewUrl}
                            alt="Logo Preview"
                            style={{ maxWidth: 200, maxHeight: 200, borderRadius: 8 }}
                          />
                        </div>
                      )}
                      {logoError && <div className="error-message">{logoError}</div>}
                      {formData.logo_url && !logoPreviewUrl && (
                        <div style={{ marginTop: '1rem' }}>
                          <img
                            src={formData.logo_url}
                            alt="Current Logo"
                            style={{ maxWidth: 200, maxHeight: 200, borderRadius: 8 }}
                          />
                        </div>
                      )}
                    </>
                  ) : formData.logo_url ? (
                    <div style={{ marginTop: '1rem' }}>
                      <img
                        src={formData.logo_url}
                        alt="Current Logo"
                        style={{ maxWidth: 200, maxHeight: 200, borderRadius: 8 }}
                      />
                    </div>
                  ) : (
                    <div className="form-display-value">No logo uploaded</div>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="name" className="form-label">
                    Restaurant Name <span className="required">*</span>
                  </label>
                  {editingSections.basic ? (
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      className="form-input"
                      placeholder="Enter restaurant name"
                      required
                    />
                  ) : (
                    <div className="form-display-value">{formData.name || 'Not set'}</div>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="phoneNumber" className="form-label">
                    Phone Number
                  </label>
                  {editingSections.basic ? (
                    <input
                      type="tel"
                      id="phoneNumber"
                      name="phoneNumber"
                      value={formData.phoneNumber}
                      onChange={handleChange}
                      className="form-input"
                      placeholder="(555) 123-4567"
                    />
                  ) : (
                    <div className="form-display-value">{formData.phoneNumber || 'Not set'}</div>
                  )}
                </div>

                <div className="form-group full-width">
                  <label htmlFor="description" className="form-label">
                    Description
                  </label>
                  {editingSections.basic ? (
                    <textarea
                      id="description"
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      className="form-textarea"
                      placeholder="Describe your restaurant's atmosphere, specialties, and unique features"
                      rows="4"
                    />
                  ) : (
                    <div className="form-display-value">{formData.description || 'Not set'}</div>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="cuisine" className="form-label">
                    Cuisine Type
                  </label>
                  {editingSections.basic ? (
                    <input
                      type="text"
                      id="cuisine"
                      name="cuisine"
                      value={formData.cuisine}
                      onChange={handleChange}
                      className="form-input"
                      placeholder="e.g., Italian, Mexican, Asian Fusion"
                    />
                  ) : (
                    <div className="form-display-value">{formData.cuisine || 'Not set'}</div>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="address" className="form-label">
                    Address
                  </label>
                  {editingSections.basic ? (
                    <input
                      type="text"
                      id="address"
                      name="address"
                      value={formData.address}
                      onChange={handleChange}
                      className="form-input"
                      placeholder="123 Main St, City, State 12345"
                    />
                  ) : (
                    <div className="form-display-value">{formData.address || 'Not set'}</div>
                  )}
                </div>
              </div>
            </div>

            {/* Operating Hours Section */}
            <div className="form-section">
              <div className="section-header">
                <h3 className="section-title">Operating Hours</h3>
                <div className="section-actions">
                  {!editingSections.hours ? (
                    <button
                      type="button"
                      className="btn btn-edit"
                      onClick={() => handleEditSection('hours')}
                    >
                      Edit
                    </button>
                  ) : (
                    <div className="edit-actions">
                      <button
                        type="button"
                        className="btn btn-secondary btn-small"
                        onClick={() => handleCancelEdit('hours')}
                        disabled={isSubmitting}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="btn btn-primary btn-small"
                        onClick={() => handleSaveSection('hours')}
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div className="hours-grid">
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(
                  day => {
                    const lowerDay = day.toLowerCase();
                    const openTime = formData[`${lowerDay}_open`];
                    const closeTime = formData[`${lowerDay}_close`];

                    return (
                      <div key={day} className="day-hours-row">
                        <div className="day-label">{day}</div>
                        <div className="time-inputs">
                          {editingSections.hours ? (
                            <>
                              <input
                                type="time"
                                name={`${lowerDay}_open`}
                                value={openTime}
                                onChange={handleChange}
                                className="time-input"
                              />
                              <span className="time-separator">to</span>
                              <input
                                type="time"
                                name={`${lowerDay}_close`}
                                value={closeTime}
                                onChange={handleChange}
                                className="time-input"
                              />
                            </>
                          ) : (
                            <div className="form-display-value">
                              {openTime && closeTime ? `${openTime} - ${closeTime}` : 'Closed'}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            </div>

            {/* Reservation Settings Section */}
            <div className="form-section">
              <div className="section-header">
                <h3 className="section-title">Reservation Settings</h3>
                <div className="section-actions">
                  {!editingSections.reservations ? (
                    <button
                      type="button"
                      className="btn btn-edit"
                      onClick={() => handleEditSection('reservations')}
                    >
                      Edit
                    </button>
                  ) : (
                    <div className="edit-actions">
                      <button
                        type="button"
                        className="btn btn-secondary btn-small"
                        onClick={() => handleCancelEdit('reservations')}
                        disabled={isSubmitting}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="btn btn-primary btn-small"
                        onClick={() => handleSaveSection('reservations')}
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="reservation_duration" className="form-label">
                    Default Reservation Duration
                  </label>
                  {editingSections.reservations ? (
                    <>
                      <input
                        type="text"
                        id="reservation_duration"
                        name="reservation_duration"
                        value={formData.reservation_duration || ''}
                        onChange={handleChange}
                        className="form-input"
                        placeholder='e.g., {"hours": 1, "minutes": 30}'
                      />
                      <small className="field-hint">
                        How long should each reservation slot last? Format as JSON object.
                      </small>
                    </>
                  ) : (
                    <div className="form-display-value">
                      {formData.reservation_duration
                        ? (() => {
                            try {
                              const duration = JSON.parse(formData.reservation_duration);
                              return `${duration.hours || 0}h ${duration.minutes || 0}m`;
                            } catch {
                              return formData.reservation_duration;
                            }
                          })()
                        : 'Not set'}
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="max_party_size" className="form-label">
                    Maximum Party Size
                  </label>
                  {editingSections.reservations ? (
                    <>
                      <input
                        type="number"
                        id="max_party_size"
                        name="max_party_size"
                        value={formData.max_party_size || ''}
                        onChange={handleChange}
                        className="form-input"
                        placeholder="e.g., 8"
                        min="1"
                        max="50"
                      />
                      <small className="field-hint">
                        What's the largest party size you can accommodate?
                      </small>
                    </>
                  ) : (
                    <div className="form-display-value">
                      {formData.max_party_size ? `${formData.max_party_size} people` : 'Not set'}
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="advance_booking_days" className="form-label">
                    Advance Booking Limit (Days)
                  </label>
                  {editingSections.reservations ? (
                    <>
                      <input
                        type="number"
                        id="advance_booking_days"
                        name="advance_booking_days"
                        value={formData.advance_booking_days || ''}
                        onChange={handleChange}
                        className="form-input"
                        placeholder="e.g., 30"
                        min="1"
                        max="365"
                      />
                      <small className="field-hint">
                        How far in advance can customers book reservations?
                      </small>
                    </>
                  ) : (
                    <div className="form-display-value">
                      {formData.advance_booking_days
                        ? `${formData.advance_booking_days} days`
                        : 'Not set'}
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="min_advance_hours" className="form-label">
                    Minimum Advance Notice (Hours)
                  </label>
                  {editingSections.reservations ? (
                    <>
                      <input
                        type="number"
                        id="min_advance_hours"
                        name="min_advance_hours"
                        value={formData.min_advance_hours || ''}
                        onChange={handleChange}
                        className="form-input"
                        placeholder="e.g., 2"
                        min="0"
                        max="72"
                      />
                      <small className="field-hint">
                        How much advance notice do you need for reservations?
                      </small>
                    </>
                  ) : (
                    <div className="form-display-value">
                      {formData.min_advance_hours
                        ? `${formData.min_advance_hours} hours`
                        : 'Not set'}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </form>
        )}
        {/* Delete Restaurant Button */}
        {originalData && (
          <div style={{ marginTop: '2rem', textAlign: 'center' }}>
            <button
              type="button"
              className="btn btn-danger"
              style={{
                padding: '16px 48px',
                fontWeight: 'bold',
                fontSize: '1.1rem',
                borderRadius: '8px',
                background: '#d32f2f',
                color: '#fff',
                border: 'none',
                minWidth: '320px',
                boxShadow: '0 2px 8px rgba(211,47,47,0.15)',
                transition: 'background 0.2s',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
              }}
              onClick={async () => {
                const confirmName = window.prompt(`Please type '${formData.name}' to confirm deletion`);
                if (confirmName === formData.name) {
                  try {
                    setIsSubmitting(true);
                    setError('');
                    await deleteRestaurant(restaurantId);
                    navigate('/owner-dashboard');
                  } catch (err) {
                    setError(err.message || 'Failed to delete restaurant.');
                  } finally {
                    setIsSubmitting(false);
                  }
                } else if (confirmName !== null) {
                  setError('Restaurant name did not match. Deletion cancelled.');
                }
              }}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Deleting...' : 'Delete Restaurant'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

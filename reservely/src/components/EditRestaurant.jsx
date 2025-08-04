import React, { useState, useEffect } from 'react'; // Import useEffect
import { useNavigate } from 'react-router-dom';
import { createRestaurant, generateSlug } from '../lib/supabaseService'; // Import generateSlug
import { getSessionUser } from '../lib/supabaseAuth'; // Import getUser
import './EditRestaurant.css'; // Import component-specific styles

export default function EditRestaurant({ restaurant = null }) {
  // Removed onSave
  const navigate = useNavigate();
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
    reservation_duration_hours: 1,
    reservation_duration_minutes: 30,
  });
  const [logoFile, setLogoFile] = useState(null);
  const [logoError, setLogoError] = useState('');
  const [logoPreviewUrl, setLogoPreviewUrl] = useState('');
  const [error, setError] = useState('');
  const [currentUser, setCurrentUser] = useState(null); // Add state for current user

  useEffect(() => {
    const fetchUser = async () => {
      const { user } = await getSessionUser();
      if (!user) {
        navigate('/login');
      } else {
        setCurrentUser(user);
      }
    };
    fetchUser();
  }, [navigate]);

  // Effect to populate form with existing restaurant data
  useEffect(() => {
    if (restaurant) {
      setFormData({
        restaurantName: restaurant.name || '',
        phoneNumber: restaurant.phone_number || '',
        description: restaurant.description || '',
        cuisine: restaurant.cuisine || '',
        address: restaurant.address || '',
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
        reservation_duration_hours: restaurant.reservation_duration?.hours || 1,
        reservation_duration_minutes: restaurant.reservation_duration?.minutes || 30,
      });
      setLogoPreviewUrl(restaurant.logo_url || '');
    }
  }, [restaurant]);

  // Handle logo file change
  const handleLogoFileChange = e => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 500 * 1024) {
      setLogoError('Logo must be less than 500kb.');
      setLogoFile(null);
      setLogoPreviewUrl('');
      return;
    }
    setLogoFile(file);
    setLogoError('');
    setLogoPreviewUrl(URL.createObjectURL(file));
  };

  // Handle logo upload (simulate supabase upload, replace with actual API as needed)
  const handleLogoUpload = async () => {
    if (!logoFile) {
      setLogoError('Please select a logo to upload.');
      return;
    }
    setLogoError('');
    // Simulate upload and URL generation
    // Replace with supabase upload logic if available
    setFormData(prev => ({ ...prev, logo_url: logoPreviewUrl }));
    setLogoFile(null);
  };

  const handleChange = e => {
    const { name, value } = e.target; // Removed 'type' and 'checked'
    setFormData(prevState => ({
      ...prevState,
      [name]: value,
    }));
  };

  const handleSubmit = async e => {
    // Make handleSubmit async
    e.preventDefault();
    setError('');

    if (!currentUser) {
      setError('User not authenticated. Please login.');
      return;
    }

    const slug = generateSlug(formData.restaurantName); // Use imported generateSlug

    /** @type {import('../types').Restaurant} */
    const restaurantData = {
      name: formData.restaurantName,
      slug: slug,
      description: formData.description || null,
      cuisine: formData.cuisine || null,
      address: formData.address || null,
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
      reservation_duration: {
        hours: parseInt(formData.reservation_duration_hours) || 0,
        minutes: parseInt(formData.reservation_duration_minutes) || 0,
      },
      owner_id: currentUser.id, // Add owner_id from the authenticated user
      // id, created_at, updated_at are typically not set on creation by the client
    };

    try {
      await createRestaurant(restaurantData);

      // Navigate to the owner dashboard or a page confirming restaurant creation
      // If your createRestaurant service returns the new restaurant with an id,
      // you might want to use that or navigate to a page specific to that restaurant.
      navigate('/owner-dashboard');
    } catch (err) {
      console.error('Failed to create restaurant:', err);
      setError(err.message || 'Failed to create restaurant. Please try again.');
    }
  };

  return (
    <div className="page-container">
      <div className="content-section">
        <div className="create-restaurant-container">
          <div className="create-restaurant-header">
            <h1>Edit Restaurant</h1>
            <p className="subtitle">Update your restaurant profile and settings</p>
          </div>

          {error && <div className="error-message">{error}</div>}

          <form onSubmit={handleSubmit} className="create-restaurant-form">
            {/* Basic Information Section */}
            <div className="form-section">
              <h3 className="section-title">Basic Information</h3>
              <div className="form-grid">
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
                    placeholder="Enter your restaurant name"
                    required
                  />
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

                <div className="form-group full-width">
                  <label htmlFor="description">Description</label>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="Describe your restaurant's atmosphere, specialties, and what makes it unique..."
                    rows="4"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="cuisine">Cuisine Type</label>
                  <input
                    type="text"
                    id="cuisine"
                    name="cuisine"
                    value={formData.cuisine}
                    onChange={handleChange}
                    placeholder="e.g., Italian, Mexican, Asian Fusion"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="address">Address:</label>
                  <input
                    type="text"
                    id="address"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="123 Main St, City, State 12345"
                  />
                </div>
              </div>
            </div>

            {/* Logo Upload Section */}
            <div className="form-section">
              <h3 className="section-title">Restaurant Logo</h3>
              <div className="form-group">
                <label htmlFor="logo-upload">Upload Logo (max 500kb)</label>
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
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ marginTop: '0.5rem' }}
                  onClick={handleLogoUpload}
                >
                  Save Logo
                </button>
                {formData.logo_url && !logoPreviewUrl && (
                  <div style={{ marginTop: '1rem' }}>
                    <img
                      src={formData.logo_url}
                      alt="Current Logo"
                      style={{ maxWidth: 200, maxHeight: 200, borderRadius: 8 }}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Operating Hours Section */}
            <div className="form-section">
              <h3 className="section-title">Operating Hours</h3>
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
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            </div>

            {/* Reservation Settings Section */}
            <div className="form-section">
              <h3 className="section-title">Reservation Settings</h3>
              <div className="form-group">
                <label htmlFor="reservation_duration">Default Reservation Duration</label>
                <div className="duration-inputs">
                  <div className="duration-input-group">
                    <input
                      type="number"
                      id="reservation_duration_hours"
                      name="reservation_duration_hours"
                      value={formData.reservation_duration_hours}
                      onChange={handleChange}
                      min="0"
                      max="12"
                      className="duration-input"
                    />
                    <span className="duration-label">hours</span>
                  </div>
                  <div className="duration-input-group">
                    <input
                      type="number"
                      id="reservation_duration_minutes"
                      name="reservation_duration_minutes"
                      value={formData.reservation_duration_minutes}
                      onChange={handleChange}
                      min="0"
                      max="59"
                      step="15"
                      className="duration-input"
                    />
                    <span className="duration-label">minutes</span>
                  </div>
                </div>
                <small className="field-hint">
                  How long should each reservation slot last? Default is 1 hour 30 minutes.
                </small>
              </div>
            </div>

            <div className="form-actions">
              <button type="button" className="btn btn-secondary" onClick={() => navigate(-1)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Save Changes
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getOwnedRestaurants } from '../lib/supabaseService';
import { getSessionUser, signOut } from '../lib/supabaseAuth';
import './OwnerDashboard.css';

export default function OwnerDashboard() {
  const navigate = useNavigate();
  const [restaurant, setRestaurant] = useState(null);
  const [ownedRestaurants, setOwnedRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copyButtonText, setCopyButtonText] = useState('Copy Link');

  useEffect(() => {
    const fetchUserAndRestaurant = async () => {
      setLoading(true);
      setError('');
      setRestaurant(null);

      const { user } = await getSessionUser();

      if (!user) {
        setLoading(false);
        navigate('/login');
        return;
      }

      if (user.email === 'guest@guest.com') {
        await signOut();
        setLoading(false);
        navigate('/login');
        return;
      }

      try {
        const fetchedRestaurants = await getOwnedRestaurants(user.id);
        setOwnedRestaurants(fetchedRestaurants || []);
        if (fetchedRestaurants && fetchedRestaurants.length > 0) {
          setRestaurant(fetchedRestaurants[0]);
        } else {
          setRestaurant(null);
        }
      } catch (err) {
        console.error('Failed to fetch restaurants:', err);
        setError(err.message || 'Failed to fetch restaurant data.');
        setRestaurant(null);
        setOwnedRestaurants([]);
      } finally {
        setLoading(false);
      }
    };

    fetchUserAndRestaurant();
  }, [navigate]);

  const handleCreateRestaurant = () => {
    navigate('/create-restaurant');
  };

  const handleLogout = async () => {
    try {
      await signOut();
      // Clear cached session/user if present
      if (window) {
        window.cachedSession = null;
        window.cachedUser = null;
      }
      navigate('/login');
      setTimeout(() => window.location.reload(), 100);
    } catch (error) {
      console.error('Logout failed:', error);
      setError('Logout failed. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="content-section">
          <div className="loading-state">
            <div className="loading-text">Loading dashboard...</div>
          </div>
        </div>
      </div>
    );
  }

  // Error display when restaurant fetch fails critically
  if (error && !restaurant) {
    return (
      <div className="page-container">
        <div className="content-section">
          <div className="error-state">
            <div className="error-container">
              <div className="error-text">Error: {error}</div>
              <button onClick={() => navigate('/login')} className="error-btn">
                Go to Login
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Prompt to create a restaurant if none exists
  if (!restaurant) {
    return (
      <div className="page-container">
        <div className="content-section">
          <div className="welcome-state">
            <div className="dashboard-header">
              <h1 className="welcome-title">Welcome to Reservely!</h1>
              <button className="logout-btn" onClick={handleLogout}>
                Logout
              </button>
            </div>
            <p className="welcome-subtitle">Ready to bring your restaurant online?</p>
            <p className="welcome-description">
              Set up your restaurant profile and start accepting reservations today.
            </p>
            <button onClick={handleCreateRestaurant} className="create-restaurant-btn">
              🚀 Create Your Restaurant
            </button>
            {error && (
              <div
                className="error-message"
                style={{
                  marginTop: '2rem',
                  padding: '1rem',
                  background: 'rgba(233, 144, 214, 0.1)',
                  border: '1px solid rgba(233, 144, 214, 0.3)',
                  borderRadius: '8px',
                  color: '#e990d6',
                }}
              >
                Note: {error}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Main dashboard view when restaurant exists
  return (
    <div className="page-container">
      {/* Confirmation Status Banner */}
      {restaurant && restaurant.confirmed === false && (
        <div
          style={{
            width: '100%',
            background: 'linear-gradient(90deg, #ff9800 0%, #ffc107 100%)',
            color: '#232b4d',
            padding: '1rem',
            textAlign: 'center',
            fontWeight: 600,
            fontSize: '1.1rem',
            borderRadius: '8px',
            marginBottom: '1.5rem',
            boxShadow: '0 2px 8px rgba(0,0,0,0.07)'
          }}
        >
          {'Your restaurant is not yet confirmed. Please wait while we review your submission.'}
        </div>
      )}
      <div className="content-section">
        <div className="dashboard-header" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <h1 className="dashboard-title">Restaurant Dashboard</h1>
          {/* Restaurant Switcher Dropdown */}
          {ownedRestaurants.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <select
                value={restaurant?.id || ''}
                onChange={e => {
                  if (e.target.value === '__create__') {
                    handleCreateRestaurant();
                  } else {
                    const selected = ownedRestaurants.find(r => r.id === e.target.value);
                    if (selected) setRestaurant(selected);
                  }
                }}
                className="themed-dropdown"
              >
                {ownedRestaurants.map(r => (
                  <option key={r.id} value={r.id} style={{ background: '#232b4d', color: '#fff', fontWeight: '600', fontSize: '1rem', letterSpacing: '0.5px' }}>{r.name}</option>
                ))}
                <option value="__create__" style={{ background: '#232b4d', color: '#e990d6', fontWeight: '600', fontSize: '1rem', letterSpacing: '0.5px' }}>+ Create New Restaurant</option>
              </select>
              <button
                className="copy-btn"
                style={{ minWidth: '200px' }}
                onClick={handleLogout}
              >
                Logout
              </button>
            </div>
          )}
          {/* Only one logout button beside dropdown */}
        </div>

        {error && (
          <div
            className="error-message"
            style={{
              marginBottom: '2rem',
              padding: '1rem',
              background: 'rgba(233, 144, 214, 0.1)',
              border: '1px solid rgba(233, 144, 214, 0.3)',
              borderRadius: '8px',
              color: '#e990d6',
            }}
          >
            Note: {error}
          </div>
        )}

        {/* Restaurant Overview Card */}
        <div
          className="restaurant-overview"
          style={{ display: 'flex', alignItems: 'flex-start', gap: '2rem' }}
        >
          {restaurant.logo_url && (
            <div style={{ minWidth: 200, textAlign: 'center' }}>
              <img
                src={restaurant.logo_url}
                alt="Restaurant Logo"
                style={{ maxWidth: 300, maxHeight: 300, borderRadius: 8 }}
              />
            </div>
          )}
          <div style={{ flex: 1 }}>
            <h2 className="restaurant-name">{restaurant.name}</h2>
            <div className="restaurant-info">
              <div className="restaurant-info-item">
                <span className="restaurant-info-label">Description:</span>
                <span className="restaurant-info-value">
                  {restaurant.description || 'No description provided.'}
                </span>
              </div>
              <div className="restaurant-info-item">
                <span className="restaurant-info-label">Cuisine:</span>
                <span className="restaurant-info-value">
                  {restaurant.cuisine || 'Not specified'}
                </span>
              </div>
              <div className="restaurant-info-item">
                <span className="restaurant-info-label">Address:</span>
                <span className="restaurant-info-value">
                  {restaurant.address || 'Not specified'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Access to View Reservations */}
        <div className="quick-access-section">
          <button
            className={`quick-access-btn ${!restaurant.confirmed ? 'disabled' : ''}`}
            onClick={
              restaurant.confirmed
                ? () => navigate(`/owner/reservations/${restaurant.id}`)
                : undefined
            }
            disabled={!restaurant.confirmed}
          >
            <div className="quick-access-icon">🗓️</div>
            <div className="quick-access-content">
              <h4 className="quick-access-title">View Reservations & Live Map</h4>
              <p className="quick-access-description">Manage customer reservations and table status in real-time</p>
            </div>
          </button>
          {!restaurant.confirmed && (
            <p className="confirmation-note">
              🔒 Reservations will be available after your restaurant is confirmed
            </p>
          )}
        </div>

        {/* Booking Link Card */}
        <div className="booking-link-section">
          <h3 className="booking-link-title">Your Restaurant Booking Link</h3>
          <div className="link-display">
            <input
              type="text"
              readOnly
              value={`${window.location.origin}/${restaurant.slug}/book`}
              className="link-input"
            />
            <button
              className="copy-btn"
              onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/${restaurant.slug}/book`);
                setCopyButtonText('Copied!');
                setTimeout(() => setCopyButtonText('Copy Link'), 2000);
              }}
            >
              {copyButtonText}
            </button>
          </div>
          <p className="link-description">
            Share this link with your customers to allow them to make reservations at your
            restaurant.
          </p>
        </div>

        {/* Management Actions */}
        <div className="management-section">
          <h3 className="management-title">Manage Your Restaurant</h3>
          <div className="action-cards-grid">
            <div className="action-card" onClick={() => navigate(`/owner/manage/${restaurant.id}`)}>
              <div className="action-card-icon">⚙️</div>
              <h4 className="action-card-title">Manage Restaurant</h4>
              <p className="action-card-description">
                Update details, description, cuisine, and address
              </p>
            </div>

            <div
              className="action-card"
              onClick={() => navigate(`/owner/seating/${restaurant.id}`)}
            >
              <div className="action-card-icon">🪑</div>
              <h4 className="action-card-title">Edit Seating</h4>
              <p className="action-card-description">Manage tables and seating capacity</p>
            </div>

            <div
              className="action-card"
              onClick={() => navigate(`/owner/map/${restaurant.id}`)}
            >
              <div className="action-card-icon">🗺️</div>
              <h4 className="action-card-title">Edit Map</h4>
              <p className="action-card-description">Create and edit restaurant floor plan</p>
            </div>

            {/* Coming Soon Features */}
            <div className="action-card coming-soon-card" style={{ position: 'relative' }}>
              <div style={{ filter: 'blur(1px) grayscale(0.5) opacity(0.6)' }}>
                <div className="action-card-icon">�</div>
                <h4 className="action-card-title">POS Integration</h4>
                <p className="action-card-description">Connect with your point-of-sale system</p>
              </div>
              <div className="coming-soon-overlay">
                <span>🚀 Coming Soon</span>
              </div>
            </div>

            <div className="action-card coming-soon-card" style={{ position: 'relative' }}>
              <div style={{ filter: 'blur(1px) grayscale(0.5) opacity(0.6)' }}>
                <div className="action-card-icon">🌐</div>
                <h4 className="action-card-title">Reserve With Google</h4>
                <p className="action-card-description">Allow customers to book through Google</p>
              </div>
              <div className="coming-soon-overlay">
                <span>� Coming Soon</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

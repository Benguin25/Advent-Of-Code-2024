import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getSessionUser, signOut } from '../lib/supabaseAuth';
import {
  getRestaurantById,
  getReservations,
  updateReservationStatus,
} from '../lib/supabaseService';
import './ViewReservations.css';
import { ReservationStatusEnum } from '../types';
import ReservationCard from './ReservationCard';
import LiveMap from './LiveMap';

// import EditReservationModal from './EditReservationModal';
// Helper to format date for display
function formatDate(dateStr) {
  // Treat incoming date as EST (America/New_York) at midnight
  if (!dateStr) return '';
  const estDate = new Date(
    new Date(dateStr + 'T00:00:00').toLocaleString('en-US', { timeZone: 'America/New_York' })
  );
  return estDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'America/New_York',
  });
}

export default function ViewReservations() {
  const navigate = useNavigate();
  const { restaurantId } = useParams();
  const [restaurant, setRestaurant] = useState(null);
  const [reservations, setReservations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState('today');
  const [activeTab, setActiveTab] = useState('map'); // Default to 'map' instead of 'reservations'
  // Handler to start editing a reservation (navigate to edit page)
  const handleEditReservation = (reservation) => {
    navigate(`/owner/edit-reservation/${reservation.id}`);
  };

  const fetchRestaurantAndReservations = useCallback(async () => {
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
        setError('You are not authorized to view reservations for this restaurant.');
        navigate('/owner-dashboard');
        return;
      }
      setRestaurant(fetchedRestaurant);

      // Use restaurantId to fetch reservations
      const fetchedReservations = await getReservations(restaurantId); // Changed from fetchedRestaurant.slug
      setReservations(
        fetchedReservations.sort(
          (a, b) =>
            new Date(b.booking_date) - new Date(a.booking_date) ||
            b.booking_time.localeCompare(a.booking_time)
        )
      ); // Sort by date desc, then time. Updated field names to booking_date and booking_time
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setError(err.message || 'Failed to load data.');
    } finally {
      setIsLoading(false);
    }
  }, [navigate, restaurantId]);

  useEffect(() => {
    fetchRestaurantAndReservations();
  }, [fetchRestaurantAndReservations]);

  const handleUpdateStatus = async (reservationId, newStatus) => {
    try {
      await updateReservationStatus(reservationId, newStatus);
      // Re-fetch all reservations to get updated table_name and status
      await fetchRestaurantAndReservations();
    } catch (err) {
      console.error('Failed to update reservation status:', err);
      setError('Could not update status. ' + err.message);
    }
  };

  // Get today's date in EST (America/New_York)
  const now = new Date();
  const estNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const year = estNow.getFullYear();
  const month = String(estNow.getMonth() + 1).padStart(2, '0');
  const day = String(estNow.getDate()).padStart(2, '0');
  const todayStr = `${year}-${month}-${day}`; // 'YYYY-MM-DD'

let filteredReservations = reservations.filter(r => {
  if (filterStatus === 'all') return true;
  if (filterStatus === 'today') {
    return r.booking_date === todayStr;
  }
  return r.status === filterStatus;
});

  // Sort CURRENT tab by earliest reservation first
  if (filterStatus === 'today') {
    filteredReservations = filteredReservations.sort((a, b) => {
      const aDate = new Date(`${a.booking_date}T${a.booking_time}`);
      const bDate = new Date(`${b.booking_date}T${b.booking_time}`);
      return aDate - bDate;
    });
  }

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-content">
          <div className="loading-spinner"></div>
          <p>Loading reservations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="view-reservations-wrapper">
      <div className="view-reservations-container">
        <div className="reservations-header">
          <h1 className="reservations-title">
            {restaurant ? `${restaurant.name} - Management` : 'Management'}
          </h1>
          <div className="header-actions">
            <button
              className="btn btn-primary manual-entry-btn"
              onClick={() => navigate(`/owner/manual-reservation/${restaurantId}`)}
            >
              📞 Manual Entry
            </button>
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

        {/* Tab Navigation */}
        <div className="tab-navigation">
          <button
            onClick={() => setActiveTab('map')}
            className={`tab-btn ${activeTab === 'map' ? 'active' : ''}`}
          >
            �️ Live Map
          </button>
          <button
            onClick={() => setActiveTab('reservations')}
            className={`tab-btn ${activeTab === 'reservations' ? 'active' : ''}`}
          >
            � Reservations
          </button>
        </div>

        {/* Reservations Tab */}
        {activeTab === 'reservations' && (
          <>
            <div className="filter-buttons">
              {['today', 'all'].map(status => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`filter-btn ${filterStatus === status ? 'active' : ''}`}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
          </>
        )}

        {/* Reservations Tab Content */}
        {activeTab === 'reservations' && (
          <>
            {filteredReservations.length === 0 ? (
              <div className="empty-state">
                <h2>No Reservations</h2>
                <p>
                  There are currently no {filterStatus !== 'all' ? `${filterStatus} ` : ''}reservations
                  to display.
                </p>
              </div>
            ) : (
              <div className={filterStatus === 'all' ? 'reservations-grid-outer' : 'reservations-grid'}>
                {filterStatus === 'all'
                  ? (() => {
                      // Group reservations by date
                      const grouped = {};
                      filteredReservations.forEach(reservation => {
                        if (!grouped[reservation.booking_date]) {
                          grouped[reservation.booking_date] = [];
                        }
                        grouped[reservation.booking_date].push(reservation);
                      });
                      // Sort dates: today's date first (in EST), then descending
                      const now = new Date();
                      const estNow = new Date(
                        now.toLocaleString('en-US', { timeZone: 'America/New_York' })
                      );
                      const year = estNow.getFullYear();
                      const month = String(estNow.getMonth() + 1).padStart(2, '0');
                      const day = String(estNow.getDate()).padStart(2, '0');
                      const todayStr = `${year}-${month}-${day}`; // 'YYYY-MM-DD'
                      const allDates = Object.keys(grouped);
                      const sortedDates = [
                        ...allDates.filter(d => d === todayStr),
                        ...allDates
                          .filter(d => d !== todayStr)
                          .sort((a, b) => new Date(b) - new Date(a)),
                      ];
                      return sortedDates.map(date => {
                        const isToday = date === todayStr;
                        return (
                          <div key={date} className="reservations-grid-date">
                            <hr
                              style={{
                                border: 'none',
                                borderTop: isToday ? '2px solid #e990d6' : '2px solid #bbb',
                                margin: '32px 0 16px 0',
                                width: '100%',
                              }}
                            />
                            <h2
                              style={{
                                margin: '0 0 16px 0',
                                fontWeight: 600,
                                width: '100%',
                                color: isToday ? '#e990d6' : undefined,
                              }}
                            >
                              {formatDate(date)}
                            </h2>
                            <div className="reservations-grid">
                              {grouped[date].map(reservation => (
                              <ReservationCard
                                key={reservation.id}
                                reservation={reservation}
                                handleUpdateStatus={handleUpdateStatus}
                                onEdit={() => handleEditReservation(reservation)}
                              />
                              ))}
                            </div>
                          </div>
                        );
                      });
                    })()
                  : filteredReservations.map(reservation => (
                      <ReservationCard
                        key={reservation.id}
                        reservation={reservation}
                        handleUpdateStatus={handleUpdateStatus}
                        onEdit={() => handleEditReservation(reservation)}
                      />
                    ))}
              </div>
            )}
          </>
        )}

        {/* Live Map Tab */}
        {activeTab === 'map' && (
          <LiveMap restaurantId={restaurantId} />
        )}
      </div>
    </div>
  );
}

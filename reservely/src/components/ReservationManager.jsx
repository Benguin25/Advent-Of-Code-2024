import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { updateReservationStatus, getRestaurantById } from '../lib/supabaseService';

export default function ReservationManager() {
  const { reservationId } = useParams();
  const navigate = useNavigate();
  const [reservation, setReservation] = useState(null);
  const [restaurant, setRestaurant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const fetchReservationDetails = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      // Fetch reservation details
      const { data: reservationData, error: reservationError } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', reservationId)
        .single();

      if (reservationError) {
        throw reservationError;
      }

      if (!reservationData) {
        throw new Error('Reservation not found');
      }

      setReservation(reservationData);

      // Fetch restaurant details
      const restaurantData = await getRestaurantById(reservationData.restaurant_id);
      setRestaurant(restaurantData);
    } catch (err) {
      console.error('Error fetching reservation:', err);
      setError(err.message || 'Failed to load reservation details');
    } finally {
      setLoading(false);
    }
  }, [reservationId]);

  useEffect(() => {
    fetchReservationDetails();
  }, [fetchReservationDetails]);

  const handleCancelReservation = async () => {
    if (!window.confirm('Are you sure you want to cancel this reservation?')) {
      return;
    }

    try {
      setIsUpdating(true);
      await updateReservationStatus(reservationId, 'cancelled');
      setReservation(prev => ({ ...prev, status: 'cancelled' }));
      setSuccessMessage('Reservation cancelled successfully');
    } catch (err) {
      console.error('Error cancelling reservation:', err);
      setError('Failed to cancel reservation');
    } finally {
      setIsUpdating(false);
    }
  };

  const formatDate = dateString => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString(undefined, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = timeString => {
    if (!timeString) return 'N/A';
    const [hours, minutes] = timeString.split(':');
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes));
    return date.toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getStatusColor = status => {
    switch (status) {
      case 'current':
        return '#28a745';
      case 'cancelled':
        return '#dc3545';
      default:
        return '#6c757d';
    }
  };

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          backgroundColor: 'var(--primary-bg)',
          color: 'var(--text-primary)',
          fontSize: '1.2rem',
          flexDirection: 'column',
          gap: '20px',
        }}
      >
        <div
          style={{
            width: '40px',
            height: '40px',
            border: '3px solid rgba(100, 255, 218, 0.3)',
            borderTop: '3px solid var(--accent-blue)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }}
        />
        <span style={{ color: 'var(--text-secondary)' }}>Loading reservation details...</span>
        <style>
          {`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}
        </style>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          backgroundColor: 'var(--primary-bg)',
          textAlign: 'center',
          color: '#ff6b6b',
          padding: '20px',
        }}
      >
        <div
          style={{
            maxWidth: '500px',
            padding: '30px',
            backgroundColor: 'var(--secondary-bg)',
            borderRadius: '12px',
            border: '1px solid rgba(255, 107, 107, 0.3)',
            boxShadow: 'var(--nav-shadow)',
          }}
        >
          <h2 style={{ color: '#ff6b6b', marginBottom: '15px', fontSize: '1.8rem' }}>❌ Error</h2>
          <p style={{ color: 'var(--text-primary)', marginBottom: '25px', lineHeight: '1.6' }}>
            {error}
          </p>
          <button
            onClick={() => navigate('/')}
            style={{
              padding: '12px 24px',
              background: 'var(--accent-gradient)',
              color: 'var(--primary-bg)',
              border: 'none',
              borderRadius: 'var(--border-radius)',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: '600',
              transition: 'all 0.3s ease',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
            }}
            onMouseOver={e => {
              e.target.style.background = 'var(--hover-gradient)';
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.3)';
            }}
            onMouseOut={e => {
              e.target.style.background = 'var(--accent-gradient)';
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.2)';
            }}
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        maxWidth: '800px',
        margin: '0 auto',
        padding: '20px',
        fontFamily: 'Inter, "Segoe UI", Roboto, sans-serif',
        backgroundColor: 'var(--primary-bg)',
        color: 'var(--text-primary)',
        minHeight: '100vh',
      }}
    >
      <h1
        style={{
          textAlign: 'center',
          marginBottom: '30px',
          color: 'var(--text-primary)',
          fontSize: '2.5rem',
          fontWeight: '700',
          background: 'var(--accent-gradient)',
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}
      >
        Reservation Details
      </h1>

      {successMessage && (
        <div
          style={{
            backgroundColor: 'rgba(100, 255, 218, 0.1)',
            border: '1px solid var(--accent-blue)',
            borderRadius: 'var(--border-radius)',
            padding: '15px',
            marginBottom: '20px',
            color: 'var(--accent-blue)',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          }}
        >
          ✅ {successMessage}
        </div>
      )}

      {error && (
        <div
          style={{
            backgroundColor: 'rgba(220, 53, 69, 0.1)',
            border: '1px solid #dc3545',
            borderRadius: 'var(--border-radius)',
            padding: '15px',
            marginBottom: '20px',
            color: '#ff6b6b',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          }}
        >
          ❌ {error}
        </div>
      )}

      <div
        style={{
          backgroundColor: 'var(--secondary-bg)',
          border: '1px solid rgba(100, 255, 218, 0.2)',
          borderRadius: '12px',
          padding: '30px',
          marginBottom: '30px',
          boxShadow: 'var(--nav-shadow)',
          backdropFilter: 'blur(10px)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '25px',
            flexWrap: 'wrap',
            gap: '10px',
          }}
        >
          <h2
            style={{
              margin: 0,
              color: 'var(--text-primary)',
              fontSize: '1.8rem',
              fontWeight: '600',
            }}
          >
            {restaurant?.name || 'Restaurant'}
          </h2>
          <span
            style={{
              background:
                getStatusColor(reservation.status) === '#28a745'
                  ? 'var(--accent-gradient)'
                  : getStatusColor(reservation.status) === '#dc3545'
                    ? 'linear-gradient(120deg, #ff6b6b, #ee5a52)'
                    : 'linear-gradient(120deg, #8892b0, #64748b)',
              color: 'white',
              padding: '8px 16px',
              borderRadius: '20px',
              fontSize: '0.9rem',
              fontWeight: '600',
              textTransform: 'capitalize',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
            }}
          >
            {reservation.status}
          </span>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '25px',
            marginBottom: '25px',
          }}
        >
          <div
            style={{
              backgroundColor: 'rgba(100, 255, 218, 0.05)',
              padding: '20px',
              borderRadius: 'var(--border-radius)',
              border: '1px solid rgba(100, 255, 218, 0.2)',
            }}
          >
            <h3
              style={{
                marginBottom: '15px',
                color: 'var(--accent-blue)',
                fontSize: '1.2rem',
                fontWeight: '600',
              }}
            >
              Customer Information
            </h3>
            <p style={{ marginBottom: '8px', color: 'var(--text-primary)' }}>
              <strong style={{ color: 'var(--accent-blue)' }}>Name:</strong> {reservation.name}
            </p>
            <p style={{ marginBottom: '8px', color: 'var(--text-primary)' }}>
              <strong style={{ color: 'var(--accent-blue)' }}>Email:</strong> {reservation.email}
            </p>
            <p style={{ marginBottom: '0', color: 'var(--text-primary)' }}>
              <strong style={{ color: 'var(--accent-blue)' }}>Phone:</strong>{' '}
              {reservation.phone || 'N/A'}
            </p>
          </div>

          <div
            style={{
              backgroundColor: 'rgba(199, 125, 255, 0.05)',
              padding: '20px',
              borderRadius: 'var(--border-radius)',
              border: '1px solid rgba(199, 125, 255, 0.2)',
            }}
          >
            <h3
              style={{
                marginBottom: '15px',
                color: 'var(--accent-purple)',
                fontSize: '1.2rem',
                fontWeight: '600',
              }}
            >
              Reservation Details
            </h3>
            <p style={{ marginBottom: '8px', color: 'var(--text-primary)' }}>
              <strong style={{ color: 'var(--accent-purple)' }}>Date:</strong>{' '}
              {formatDate(reservation.booking_date)}
            </p>
            <p style={{ marginBottom: '8px', color: 'var(--text-primary)' }}>
              <strong style={{ color: 'var(--accent-purple)' }}>Time:</strong>{' '}
              {formatTime(reservation.booking_time)}
            </p>
            <p style={{ marginBottom: '8px', color: 'var(--text-primary)' }}>
              <strong style={{ color: 'var(--accent-purple)' }}>Party Size:</strong>{' '}
              {reservation.number_of_people} guest
              {reservation.number_of_people > 1 ? 's' : ''}
            </p>
            <p style={{ marginBottom: '0', color: 'var(--text-primary)' }}>
              <strong style={{ color: 'var(--accent-purple)' }}>Reservation ID:</strong>{' '}
              {reservation.id}
            </p>
          </div>
        </div>

        {reservation.notes && (
          <div
            style={{
              backgroundColor: 'rgba(136, 146, 176, 0.1)',
              padding: '20px',
              borderRadius: 'var(--border-radius)',
              marginBottom: '20px',
              border: '1px solid rgba(136, 146, 176, 0.2)',
            }}
          >
            <h3
              style={{
                marginBottom: '12px',
                color: 'var(--text-secondary)',
                fontSize: '1.1rem',
                fontWeight: '600',
              }}
            >
              Special Notes
            </h3>
            <p style={{ margin: 0, color: 'var(--text-primary)', lineHeight: '1.6' }}>
              {reservation.notes}
            </p>
          </div>
        )}

        {restaurant && (
          <div
            style={{
              background:
                'linear-gradient(135deg, rgba(100, 255, 218, 0.1), rgba(199, 125, 255, 0.1))',
              padding: '20px',
              borderRadius: 'var(--border-radius)',
              marginBottom: '20px',
              border: '1px solid rgba(100, 255, 218, 0.3)',
            }}
          >
            <h3
              style={{
                marginBottom: '15px',
                background: 'var(--accent-gradient)',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                fontSize: '1.2rem',
                fontWeight: '600',
              }}
            >
              Restaurant Information
            </h3>
            <p style={{ marginBottom: '8px', color: 'var(--text-primary)' }}>
              <strong style={{ color: 'var(--accent-blue)' }}>Cuisine:</strong>{' '}
              {restaurant.cuisine || 'N/A'}
            </p>
            <p style={{ marginBottom: '8px', color: 'var(--text-primary)' }}>
              <strong style={{ color: 'var(--accent-blue)' }}>Address:</strong>{' '}
              {restaurant.address || 'N/A'}
            </p>
            <p style={{ margin: 0, color: 'var(--text-primary)', lineHeight: '1.6' }}>
              <strong style={{ color: 'var(--accent-blue)' }}>Description:</strong>{' '}
              {restaurant.description || 'N/A'}
            </p>
          </div>
        )}
      </div>

      <div
        style={{
          display: 'flex',
          gap: '15px',
          justifyContent: 'center',
          flexWrap: 'wrap',
          marginBottom: '30px',
        }}
      >
        <button
          onClick={() => navigate('/')}
          style={{
            padding: '12px 24px',
            background: 'linear-gradient(135deg, var(--secondary-bg), #1e3a8a)',
            color: 'var(--text-primary)',
            border: '1px solid rgba(100, 255, 218, 0.2)',
            borderRadius: 'var(--border-radius)',
            cursor: 'pointer',
            fontSize: '1rem',
            fontWeight: '500',
            transition: 'all 0.3s ease',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
          }}
          onMouseOver={e => {
            e.target.style.background = 'linear-gradient(135deg, #1e3a8a, var(--secondary-bg))';
            e.target.style.transform = 'translateY(-2px)';
            e.target.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.3)';
          }}
          onMouseOut={e => {
            e.target.style.background = 'linear-gradient(135deg, var(--secondary-bg), #1e3a8a)';
            e.target.style.transform = 'translateY(0)';
            e.target.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.2)';
          }}
        >
          Back to Home
        </button>

        {reservation.status === 'current' && (
          <button
            onClick={handleCancelReservation}
            disabled={isUpdating}
            style={{
              padding: '12px 24px',
              background: isUpdating
                ? 'linear-gradient(135deg, #6b7280, #4b5563)'
                : 'linear-gradient(135deg, #dc2626, #b91c1c)',
              color: 'white',
              border: 'none',
              borderRadius: 'var(--border-radius)',
              cursor: isUpdating ? 'not-allowed' : 'pointer',
              fontSize: '1rem',
              fontWeight: '500',
              opacity: isUpdating ? 0.7 : 1,
              transition: 'all 0.3s ease',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
            }}
            onMouseOver={e => {
              if (!isUpdating) {
                e.target.style.background = 'linear-gradient(135deg, #b91c1c, #dc2626)';
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.3)';
              }
            }}
            onMouseOut={e => {
              if (!isUpdating) {
                e.target.style.background = 'linear-gradient(135deg, #dc2626, #b91c1c)';
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.2)';
              }
            }}
          >
            {isUpdating ? 'Cancelling...' : 'Cancel Reservation'}
          </button>
        )}
      </div>

      <div
        style={{
          padding: '25px',
          background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.1), rgba(245, 158, 11, 0.1))',
          border: '1px solid rgba(251, 191, 36, 0.3)',
          borderRadius: 'var(--border-radius)',
          textAlign: 'center',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        }}
      >
        <h3
          style={{
            color: '#fbbf24',
            marginBottom: '12px',
            fontSize: '1.3rem',
            fontWeight: '600',
          }}
        >
          🔧 Need to Make Changes?
        </h3>
        <p
          style={{
            margin: 0,
            color: 'var(--text-primary)',
            lineHeight: '1.6',
            fontSize: '1rem',
          }}
        >
          For modifications to your reservation (date, time, party size), please contact the
          restaurant directly or cancel and create a new reservation.
        </p>
      </div>
    </div>
  );
}

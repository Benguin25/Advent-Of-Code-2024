import React from 'react';
import { ReservationStatusEnum } from '../types';

function formatDate(dateString) {
  if (!dateString) return 'N/A';
  // Treat incoming date as EST (America/New_York) at midnight
  // This assumes dateString is in 'YYYY-MM-DD' format and already EST
  const estDate = new Date(
    new Date(dateString + 'T00:00:00').toLocaleString('en-US', { timeZone: 'America/New_York' })
  );
  return estDate.toLocaleDateString('en-US', {
    timeZone: 'America/New_York',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatTime(timeString) {
  if (!timeString) return 'N/A';
  const [hours, minutes] = timeString.split(':');
  const date = new Date();
  date.setHours(parseInt(hours), parseInt(minutes));
  return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true });
}

function formatPhone(phone) {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) {
    return digits.slice(0, 3) + '-' + digits.slice(3, 6) + '-' + digits.slice(6);
  }
  return phone;
}

export default function ReservationCard({ reservation, handleUpdateStatus, onEdit = () => {} }) {
  let statusBadgeClass = `status-badge status-${reservation.status}`;
  let statusBadgeText = reservation.status || 'Unknown';
  if (reservation.status === ReservationStatusEnum.planned) {
    const [hours, minutes, seconds] = reservation.booking_time.split(':');
    const bookingDateTime = new Date(
      `${reservation.booking_date}T${hours}:${minutes}:${seconds || '00'}`
    );
    const now = new Date();
    if (bookingDateTime > now) {
      statusBadgeClass += ' status-upcoming';
      statusBadgeText = 'Upcoming';
    } else {
      statusBadgeClass += ' status-late';
      statusBadgeText = 'Late';
    }
  }

  // Determine if reservation is for today (EST)
  const now = new Date();
  const estNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const year = estNow.getFullYear();
  const month = String(estNow.getMonth() + 1).padStart(2, '0');
  const day = String(estNow.getDate()).padStart(2, '0');
  const todayStr = `${year}-${month}-${day}`;
  const isToday = reservation.booking_date === todayStr;

  return (
    <div className="reservation-card">
      <div className="card-header">
        <h3 className="guest-name">{reservation.name || 'Guest'}</h3>
        <span className={statusBadgeClass}>{statusBadgeText}</span>
      </div>
      <div className="card-content">
        <div className="reservation-details">
          <p>
            <strong>Date:</strong> {formatDate(reservation.booking_date)}
          </p>
          <p>
            <strong>Time:</strong> {formatTime(reservation.booking_time)}
          </p>
          <p>
            <strong># of people:</strong> {reservation.number_of_people}
          </p>
          <p>
            <strong>Email:</strong> {reservation.email || 'N/A'}
          </p>
          <p>
            <strong>Phone:</strong> {formatPhone(reservation.phone) || 'N/A'}
          </p>
          <p>
            <strong>Table:</strong> {reservation.table_name || reservation.table_id || 'N/A'}
          </p>
        </div>
        {reservation.notes && (
          <div className="reservation-notes">
            <h4>Notes:</h4>
            <p>{reservation.notes}</p>
          </div>
        )}
      </div>
      <div className="card-actions">
        <button
          className="btn btn-secondary"
          style={{ marginRight: 8 }}
          onClick={() => onEdit(reservation)}
        >
          Edit
        </button>
        {/* For today's reservations, show correct buttons for each status */}
        {isToday && reservation.status === ReservationStatusEnum.planned && (
          <>
            <button
              onClick={() => handleUpdateStatus(reservation.id, ReservationStatusEnum.arrived)}
              className="btn btn-success"
            >
              Arrived
            </button>
            <button
              onClick={() => handleUpdateStatus(reservation.id, ReservationStatusEnum.cancelled)}
              className="btn btn-danger"
            >
              Cancel
            </button>
          </>
        )}
        {isToday && reservation.status === ReservationStatusEnum.arrived && (
          <>
            <button
              onClick={() => handleUpdateStatus(reservation.id, ReservationStatusEnum.planned)}
              className="btn btn-warning"
              style={{ width: '100%' }}
            >
              UPCOMING
            </button>
            <button
              onClick={() => handleUpdateStatus(reservation.id, ReservationStatusEnum.cancelled)}
              className="btn btn-danger"
              style={{ width: '100%' }}
            >
              Cancel
            </button>
          </>
        )}
        {/* Keep existing logic for other statuses for non-today reservations */}
        {!isToday && reservation.status === ReservationStatusEnum.planned && (
          <>
            <button
              onClick={() => handleUpdateStatus(reservation.id, ReservationStatusEnum.arrived)}
              className="btn btn-success"
            >
              Arrived
            </button>
            <button
              onClick={() => handleUpdateStatus(reservation.id, ReservationStatusEnum.cancelled)}
              className="btn btn-danger"
            >
              Cancel
            </button>
          </>
        )}
        {!isToday && reservation.status === ReservationStatusEnum.arrived && (
          <>
            <button
              onClick={() => handleUpdateStatus(reservation.id, ReservationStatusEnum.planned)}
              className="btn btn-warning"
              style={{ width: '100%' }}
            >
              UPCOMING
            </button>
            <button
              onClick={() => handleUpdateStatus(reservation.id, ReservationStatusEnum.cancelled)}
              className="btn btn-danger"
              style={{ width: '100%' }}
            >
              Cancel
            </button>
          </>
        )}
        {!isToday && reservation.status === 'cancelled' && (
          <>
            <button
              onClick={() => handleUpdateStatus(reservation.id, ReservationStatusEnum.planned)}
              className="btn btn-warning"
              style={{ width: '100%' }}
            >
              UPCOMING
            </button>
            <button
              onClick={() => handleUpdateStatus(reservation.id, ReservationStatusEnum.arrived)}
              className="btn btn-success"
              style={{ width: '100%' }}
            >
              Arrived
            </button>
          </>
        )}
      </div>
    </div>
  );
}

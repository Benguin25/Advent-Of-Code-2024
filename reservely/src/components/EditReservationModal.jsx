import React, { useState } from 'react';

export default function EditReservationModal({ reservation, onClose, onSave }) {
  const [bookingDate, setBookingDate] = useState(reservation.booking_date);
  const [bookingTime, setBookingTime] = useState(reservation.booking_time);
  const [numberOfPeople, setNumberOfPeople] = useState(reservation.number_of_people);
  const [tables, setTables] = useState(reservation.tables || reservation.table_name || '');
  const [notes, setNotes] = useState(reservation.notes || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await onSave({
        ...reservation,
        booking_date: bookingDate,
        booking_time: bookingTime,
        number_of_people: numberOfPeople,
        tables,
        notes,
      });
    } catch (err) {
      setError(err.message || 'Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h2>Edit Reservation</h2>
        <form onSubmit={handleSubmit}>
          <label>
            Date:
            <input
              type="date"
              value={bookingDate}
              onChange={e => setBookingDate(e.target.value)}
              required
            />
          </label>
          <label>
            Time:
            <input
              type="time"
              value={bookingTime}
              onChange={e => setBookingTime(e.target.value)}
              required
            />
          </label>
          <label>
            Number of People:
            <input
              type="number"
              min="1"
              value={numberOfPeople}
              onChange={e => setNumberOfPeople(e.target.value)}
              required
            />
          </label>
          <label>
            Tables:
            <input
              type="text"
              value={tables}
              onChange={e => setTables(e.target.value)}
              placeholder="e.g. 1,2 or Table A"
            />
          </label>
          <label>
            Notes:
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Add notes (optional)"
            />
          </label>
          {error && <div className="error-message">{error}</div>}
          <div className="modal-actions">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

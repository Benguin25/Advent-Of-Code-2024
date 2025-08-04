import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getReservationById, updateReservationDetails, getAvailableTables } from '../lib/supabaseService';
import './EditReservationPage.css';

export default function EditReservationPage() {
  const { reservationId } = useParams();
  const navigate = useNavigate();
  const [reservation, setReservation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // Form fields
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState('');
  const [numberOfPeople, setNumberOfPeople] = useState(1);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [tables, setTables] = useState('');
  const [notes, setNotes] = useState('');
  const [availableTables, setAvailableTables] = useState([]);
  const [fetchingTables, setFetchingTables] = useState(false);
  const [allTables, setAllTables] = useState([]);

  useEffect(() => {
    async function fetchReservation() {
      setLoading(true);
      setError('');
      try {
        const found = await getReservationById(reservationId);
        if (!found) throw new Error('Reservation not found');
        setReservation(found);
        setBookingDate(found.booking_date || '');
        setBookingTime(found.booking_time || '');
        setNumberOfPeople(found.number_of_people || 1);
        setName(found.name || '');
        setEmail(found.email || '');
        setPhone(found.phone || '');
        setTables(found.table_id || '');
        setNotes(found.notes || '');
        // Fetch all tables for the restaurant for cross-referencing
        if (found.restaurant_id) {
          const { supabase } = await import('../lib/supabaseClient');
          const { data: tablesData, error: tablesError } = await supabase
            .from('tables')
            .select('id, name')
            .eq('restaurant_id', found.restaurant_id);
          if (!tablesError) setAllTables(tablesData || []);
        }
      } catch (err) {
        setError(err.message || 'Failed to load reservation.');
      } finally {
        setLoading(false);
      }
    }
    fetchReservation();
  }, [reservationId]);

  // Fetch available tables when bookingDate, bookingTime, numberOfPeople, or reservation changes
  useEffect(() => {
    async function fetchTables() {
      if (!reservation || !bookingDate || !bookingTime || !numberOfPeople) return;
      setFetchingTables(true);
      try {
        const tables = await getAvailableTables(
          reservation.restaurant_id,
          bookingDate,
          bookingTime,
          Number(numberOfPeople)
        );
        setAvailableTables(tables);
      } catch (err) {
        setAvailableTables([]);
      } finally {
        setFetchingTables(false);
      }
    }
    fetchTables();
  }, [reservation, bookingDate, bookingTime, numberOfPeople]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const updated = await updateReservationDetails(reservationId, {
        name,
        email,
        phone,
        number_of_people: numberOfPeople,
        booking_date: bookingDate,
        booking_time: bookingTime,
        table_id: tables,
        notes,
      });
      navigate(-1); // Go back to previous page
    } catch (err) {
      setError(err.message || 'Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="loading-container"><div className="loading-spinner"></div>Loading...</div>;
  if (error) return <div className="error-message">{error}</div>;
  if (!reservation) return null;

  return (
    <div className="edit-reservation-page beautiful-edit-page">
      <div className="edit-reservation-card">
        <h1 className="edit-title">Edit Reservation</h1>
        <div className="edit-section-header">Reservation Details</div>
        <form onSubmit={handleSubmit} className="edit-reservation-form">
          <div className="form-row">
            <div className="form-group">
              <label>Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>Phone</label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Date</label>
              <input
                type="date"
                value={bookingDate}
                onChange={e => setBookingDate(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>Time</label>
              <input
                type="time"
                value={bookingTime}
                onChange={e => setBookingTime(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>Number of People</label>
              <input
                type="number"
                min="1"
                value={numberOfPeople}
                onChange={e => setNumberOfPeople(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="table-select">Table</label>
              <div className="custom-select-wrapper">
                <select
                  id="table-select"
                  className="custom-table-select"
                  value={tables}
                  onChange={e => setTables(e.target.value)}
                  disabled={fetchingTables || availableTables.length === 0}
                  required
                >
                  <option value="" disabled>
                    {fetchingTables ? '🔄 Loading tables...' : 'Select a table'}
                  </option>
                  {/* If the current table is not available, show it as selected/disabled */}
                  {tables && !availableTables.some(t => String(t.id) === String(tables)) && reservation.table_id && (
                    <option value={reservation.table_id} disabled style={{ color: '#bbb' }}>
                      🪑 Table {(() => {
                        const t = allTables.find(tab => String(tab.id) === String(reservation.table_id));
                        return t ? t.name : 'Unknown';
                      })()} (unavailable)
                    </option>
                  )}
                  {availableTables.map(table => (
                    <option key={table.id} value={table.id}>
                      🪑 {table.name || table.id} ({table.capacity || '?'})
                    </option>
                  ))}
                </select>
                <span className="select-arrow">▼</span>
              </div>
              {fetchingTables && <div className="table-hint">Checking availability...</div>}
              {!fetchingTables && availableTables.length === 0 && (
                <div className="table-hint table-hint-unavailable">No available tables for this time/size.</div>
              )}
            </div>
            <div className="form-group full-width">
              <label>Notes</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Add notes (optional)"
                rows={3}
              />
            </div>
          </div>
          {error && <div className="error-message">{error}</div>}
          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => navigate(-1)} disabled={saving}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

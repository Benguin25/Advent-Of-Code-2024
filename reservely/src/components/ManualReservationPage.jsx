import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  addReservation,
  getRestaurantById,
  sendReservationConfirmation,
} from '../lib/supabaseService';
import {
  validateReservation,
  calculateEndTime,
  getAvailableTimeSlotsForDay,
} from '../lib/reservationValidation';
import './ManualReservationPage.css';

export default function ManualReservationPage() {
  const { restaurantId } = useParams();
  const navigate = useNavigate();
  const [restaurant, setRestaurant] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    date: '',
    time: '',
    partySize: '',
    specialNotes: '',
  });
  const [availableTimes, setAvailableTimes] = useState([]);
  const [loadingTimes, setLoadingTimes] = useState(false);
  const [submissionStatus, setSubmissionStatus] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load restaurant data
  useEffect(() => {
    async function loadRestaurant() {
      try {
        const restaurantData = await getRestaurantById(restaurantId);
        setRestaurant(restaurantData);
      } catch (err) {
        console.error('Error loading restaurant:', err);
        setError('Failed to load restaurant data');
      } finally {
        setLoading(false);
      }
    }
    loadRestaurant();
  }, [restaurantId]);

  // Helper function to get day name from date
  const getDayName = dateString => {
    // Parse as local date to avoid UTC offset issues
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day); // month is 0-indexed
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return days[date.getDay()];
  };

  // Function to check if the restaurant is open on a given date
  const isRestaurantOpenOnDate = useCallback(
    dateString => {
      if (!restaurant) return false;
      const dayName = getDayName(dateString);
      const openTime = restaurant[`${dayName}_open`];
      const closeTime = restaurant[`${dayName}_close`];
      return !!(openTime && closeTime);
    },
    [restaurant]
  );

  const fetchAvailableTimes = useCallback(
    async (selectedDate, partySize) => {
      if (!restaurant || !selectedDate || !partySize) {
        setAvailableTimes([]);
        return;
      }

      setLoadingTimes(true);
      setError(null);

      try {
        // Check if restaurant is open on this date
        if (!isRestaurantOpenOnDate(selectedDate)) {
          setAvailableTimes([]);
          setLoadingTimes(false);
          return;
        }

        const dayName = getDayName(selectedDate);
        let openTime = restaurant[`${dayName}_open`];
        let closeTime = restaurant[`${dayName}_close`];

        // Defensive: handle null/undefined and strip seconds if present
        if (!openTime || !closeTime) {
          setAvailableTimes([]);
          setLoadingTimes(false);
          return;
        }
        openTime = openTime.length > 5 ? openTime.substring(0, 5) : openTime;
        closeTime = closeTime.length > 5 ? closeTime.substring(0, 5) : closeTime;

        // Generate time slots from open to close time
        const allTimes = [];
        const currentTime = new Date(`${selectedDate}T${openTime}:00`);
        const endTime = new Date(`${selectedDate}T${closeTime}:00`);

        if (isNaN(currentTime.getTime()) || isNaN(endTime.getTime())) {
          console.error('Invalid open/close time or date:', { selectedDate, openTime, closeTime });
          setAvailableTimes([]);
          setLoadingTimes(false);
          return;
        }

        while (currentTime < endTime) {
          allTimes.push(
            `${String(currentTime.getHours()).padStart(2, '0')}:${String(currentTime.getMinutes()).padStart(2, '0')}`
          );
          currentTime.setMinutes(currentTime.getMinutes() + 15);
        }

        // Get restaurant reservation duration
        let durationForBooking = null;
        if (restaurant && restaurant.reservation_duration) {
          let parsedDuration;
          if (typeof restaurant.reservation_duration === 'string') {
            try {
              parsedDuration = JSON.parse(restaurant.reservation_duration);
            } catch (parseError) {
              console.error('Failed to parse restaurant.reservation_duration:', parseError);
              setAvailableTimes([]);
              setLoadingTimes(false);
              return;
            }
          } else {
            parsedDuration = restaurant.reservation_duration;
          }

          if (parsedDuration && typeof parsedDuration.hours !== 'undefined') {
            durationForBooking = {
              hours: parsedDuration.hours,
              minutes: typeof parsedDuration.minutes !== 'undefined' ? parsedDuration.minutes : 0,
            };
          }
        }

        if (!durationForBooking) {
          console.error('Could not determine booking duration');
          setAvailableTimes([]);
          setLoadingTimes(false);
          return;
        }

        // Check each time slot for availability using the optimized function
        try {
          const availableTimeSlots = await getAvailableTimeSlotsForDay(
            restaurant.id,
            selectedDate,
            partySize,
            durationForBooking,
            restaurant,
            allTimes
          );

          setAvailableTimes(availableTimeSlots);
        } catch (error) {
          console.error('Error getting available time slots:', error);
          setAvailableTimes([]);
        }
      } catch (error) {
        console.error('Error fetching available times:', error);
        setError('Failed to fetch available times');
      } finally {
        setLoadingTimes(false);
      }
    },
    [restaurant, isRestaurantOpenOnDate]
  );

  // Update available times when date or party size changes
  useEffect(() => {
    if (formData.date && formData.partySize) {
      fetchAvailableTimes(formData.date, formData.partySize);
    }
  }, [formData.date, formData.partySize, fetchAvailableTimes]);

  const handleChange = e => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'partySize' ? (value === '' ? '' : parseInt(value, 10) || '') : value,
    }));
  };

  const handleSubmit = async e => {
    e.preventDefault();

    if (!restaurant) {
      alert('Restaurant details are not loaded yet.');
      return;
    }

    setSubmissionStatus('Validating...');
    setError(null);

    // Determine reservation duration for the current request
    let durationForThisBooking = null;
    if (restaurant && restaurant.reservation_duration) {
      let parsedDuration;
      if (typeof restaurant.reservation_duration === 'string') {
        try {
          parsedDuration = JSON.parse(restaurant.reservation_duration);
        } catch (parseError) {
          console.error('Failed to parse reservation_duration:', parseError);
          setError('Restaurant booking duration is not configured correctly.');
          setSubmissionStatus('Error');
          return;
        }
      } else {
        parsedDuration = restaurant.reservation_duration;
      }

      if (parsedDuration && typeof parsedDuration.hours !== 'undefined') {
        durationForThisBooking = {
          hours: parsedDuration.hours,
          minutes: typeof parsedDuration.minutes !== 'undefined' ? parsedDuration.minutes : 0,
        };
      }
    }

    if (
      !durationForThisBooking ||
      typeof durationForThisBooking.hours === 'undefined' ||
      typeof durationForThisBooking.minutes === 'undefined'
    ) {
      console.error(
        'Restaurant reservation_duration is not in the expected {hours, minutes} format for validation.'
      );
      setError('Restaurant booking duration is not configured correctly.');
      setSubmissionStatus('Error');
      return;
    }

    // Prepare data for validation
    const reservationDetailsToValidate = {
      restaurant_id: restaurant.id,
      booking_date: formData.date,
      booking_time: formData.time,
      number_of_people: formData.partySize,
      requested_duration: durationForThisBooking,
    };

    // Validate the reservation
    const validationResult = await validateReservation(reservationDetailsToValidate);

    if (!validationResult.isValid) {
      setError(validationResult.message || 'Validation failed. Please check your input.');
      setSubmissionStatus('Error');
      return;
    }

    // Get the assigned table from validation result
    const assignedTable = validationResult.assignedTable;

    setSubmissionStatus('Submitting...');

    // Calculate expected_end_time
    let calculatedEndTime = null;
    if (formData.date && formData.time && durationForThisBooking) {
      calculatedEndTime = calculateEndTime(formData.time, durationForThisBooking);
    }

    // Prepare data for Supabase - for manual entry, email and phone are optional
    const reservationData = {
      ...reservationDetailsToValidate,
      name: formData.name,
      email: formData.email || null, // Make email optional
      phone: formData.phone || null, // Make phone optional
      notes: formData.specialNotes,
      status: 'current', // Changed from 'confirmed' to 'current'
      table_id: assignedTable?.id, // Add the assigned table ID
      ...(calculatedEndTime && { expected_end_time: `${formData.date}T${calculatedEndTime}:00` }),
    };

    try {
      const newReservation = await addReservation(restaurant.id, reservationData);

      // Send confirmation emails only if email is provided
      if (formData.email) {
        try {
          await sendReservationConfirmation(newReservation, restaurant);
        } catch (emailError) {
          console.error('Failed to send confirmation emails:', emailError);
          // Don't fail the reservation if emails fail
        }
      }

      setSubmissionStatus('Success! Manual reservation has been created.');

      // Clear the form
      setFormData({
        name: '',
        email: '',
        phone: '',
        date: '',
        time: '',
        partySize: '',
        specialNotes: '',
      });

      // Navigate back to reservations page after a short delay
      setTimeout(() => {
        navigate(`/owner/reservations/${restaurantId}`);
      }, 2000);
    } catch (err) {
      console.error('Manual reservation failed:', err);
      setError('Reservation failed. Please try again. ' + (err.message || ''));
      setSubmissionStatus('Error');
    }
  };

  // Get today's date in YYYY-MM-DD format for the date input min attribute
  const today = new Date().toISOString().split('T')[0];

  // Calculate minimum and maximum booking dates based on restaurant settings
  const getMinBookingDate = () => {
    // For manual entry, we can allow same-day bookings
    return today;
  };

  const getMaxBookingDate = () => {
    const maxAdvanceDays = restaurant?.advance_booking_days || 30;
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + maxAdvanceDays);
    return maxDate.toISOString().split('T')[0];
  };

  if (loading) {
    return (
      <div className="manual-reservation-page">
        <div className="container">
          <div className="loading-container">
            <p>Loading restaurant data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error && !restaurant) {
    return (
      <div className="manual-reservation-page">
        <div className="container">
          <div className="error-container">
            <h2>Error</h2>
            <p>{error}</p>
            <button className="btn btn-primary" onClick={() => navigate('/owner-dashboard')}>
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="manual-reservation-page">
      <div className="container">
        <div className="page-header">
          <h1>Manual Reservation Entry</h1>
          <p className="subtitle">Add a reservation for {restaurant?.name || 'your restaurant'}</p>
          <div className="header-actions">
            <button
              className="btn btn-secondary"
              onClick={() => navigate(`/owner/reservations/${restaurantId}`)}
            >
              Back to Reservations
            </button>
          </div>
        </div>
        <div className="manual-reservation-content">
          <div className="formContainer">
            <div className="form-description">
              <h2>Customer Information</h2>
              <p>
                Add a reservation for a customer who called in. <b>Email and phone are optional for manual entries.</b>
              </p>
            </div>
            <form onSubmit={handleSubmit} className="reservationForm Step3Form">
              <div className="formRow">
                <div className="formGroup">
                  <label htmlFor="name">Full Name<span style={{color:'#FF7ABC'}}>*</span></label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    placeholder="E.g., John Doe"
                  />
                </div>
                <div className="formGroup">
                  <label htmlFor="partySize">Number of People<span style={{color:'#FF7ABC'}}>*</span></label>
                  <select
                    id="partySize"
                    name="partySize"
                    value={formData.partySize}
                    onChange={handleChange}
                    required
                    className="partySelect"
                  >
                    <option value="" disabled>
                      Select party size
                    </option>
                    {restaurant &&
                      Array.from({
                        length:
                          (restaurant.max_party_size || 20) -
                          (restaurant.min_party_size || 1) +
                          1,
                      }, (_, i) => (restaurant.min_party_size || 1) + i).map(size => (
                        <option key={size} value={size}>
                          {size} {size === 1 ? 'person' : 'people'}
                        </option>
                      ))}
                  </select>
                  {restaurant && (
                    <small className="field-hint">
                      Party size must be between {restaurant.min_party_size || 1} and{' '}
                      {restaurant.max_party_size || 20} people.
                    </small>
                  )}
                  {restaurant &&
                    formData.partySize &&
                    (formData.partySize < (restaurant.min_party_size || 1) ||
                      formData.partySize > (restaurant.max_party_size || 20)) && (
                      <p style={{ color: '#FF7ABC', fontSize: '0.9em', marginTop: '5px' }}>
                        ⚠️ Party size must be between {restaurant.min_party_size || 1} and{' '}
                        {restaurant.max_party_size || 20} people.
                      </p>
                    )}
                </div>
              </div>
              <div className="formRow">
                <div className="formGroup dateGroup">
                  <label htmlFor="date">Date<span style={{color:'#FF7ABC'}}>*</span></label>
                  <input
                    type="date"
                    id="date"
                    name="date"
                    value={formData.date}
                    onChange={handleChange}
                    min={getMinBookingDate()}
                    max={getMaxBookingDate()}
                    required
                    className="dateInput"
                  />
                  {restaurant && (
                    <small className="field-hint">Same-day bookings allowed for manual entry</small>
                  )}
                </div>
                <div className="formGroup">
                  <label htmlFor="time">Time<span style={{color:'#FF7ABC'}}>*</span></label>
                  <select
                    id="time"
                    name="time"
                    value={formData.time}
                    onChange={handleChange}
                    required
                    disabled={!formData.date || loadingTimes || availableTimes.length === 0}
                    className="timeSelect"
                  >
                    <option value="" disabled>
                      {loadingTimes ? 'Checking availability...' : 'Select a time'}
                    </option>
                    {availableTimes.map(timeSlot => (
                      <option key={timeSlot} value={timeSlot}>
                        {timeSlot}
                      </option>
                    ))}
                  </select>
                  {loadingTimes && (
                    <p className="loading-text">
                      Checking availability for {formData.partySize} guest
                      {formData.partySize > 1 ? 's' : ''}...
                    </p>
                  )}
                  {!loadingTimes && formData.date && !isRestaurantOpenOnDate(formData.date) && (
                    <p className="error-text">The restaurant is closed on this date.</p>
                  )}
                  {!loadingTimes &&
                    formData.date &&
                    availableTimes.length === 0 &&
                    isRestaurantOpenOnDate(formData.date) && (
                      <p className="warning-text">No available times for this date.</p>
                    )}
                </div>
              </div>
              <div className="formRow">
                <div className="formGroup">
                  <label htmlFor="email">Email Address (Optional)</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="E.g., john.doe@example.com"
                  />
                </div>
                <div className="formGroup">
                  <label htmlFor="phone">Phone Number (Optional)</label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="E.g., (555) 123-4567"
                  />
                </div>
              </div>
              <div className="formGroup">
                <label htmlFor="specialNotes">Special Requests / Notes</label>
                <textarea
                  id="specialNotes"
                  name="specialNotes"
                  value={formData.specialNotes}
                  onChange={handleChange}
                  placeholder="E.g., dietary restrictions, allergies, celebration..."
                />
              </div>
              <div className="stepActions">
                <button
                  type="submit"
                  className="submitButton"
                  disabled={submissionStatus === 'Submitting...'}
                >
                  {submissionStatus === 'Submitting...'
                    ? 'Creating Reservation...'
                    : 'Create Manual Reservation'}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => navigate(`/owner/reservations/${restaurantId}`)}
                >
                  Cancel
                </button>
              </div>
              {submissionStatus && submissionStatus !== 'Submitting...' && (
                <div
                  className={`form-message ${submissionStatus === 'Error' ? 'error' : 'success'}`}
                >
                  {error || submissionStatus}
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect, useCallback } from 'react';
import { ReservationStatusEnum } from '../types';
import { addReservation, sendReservationConfirmation } from '../lib/supabaseService';
import {
  validateReservation,
  calculateEndTime,
  getAvailableTimeSlotsForDay,
} from '../lib/reservationValidation';
import './ManualReservationEntry.css';

export default function ManualReservationEntry({ restaurant, onClose, onReservationAdded }) {
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

  // Helper function to get day name from date
  const getDayName = dateString => {
    const date = new Date(dateString);
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
        const openTime = restaurant[`${dayName}_open`];
        const closeTime = restaurant[`${dayName}_close`];

        // Generate time slots from open to close time
        const allTimes = [];
        const currentTime = new Date(`${selectedDate}T${openTime}:00`);
        const endTime = new Date(`${selectedDate}T${closeTime}:00`);

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
      [name]: value,
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
      status: ReservationStatusEnum.pending,
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
        partySize: 1,
        specialNotes: '',
      });

      // Notify parent component that a reservation was added
      if (onReservationAdded) {
        onReservationAdded(newReservation);
      }

      // Close the modal after a short delay
      setTimeout(() => {
        onClose();
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

  return (
    <div className="manual-entry-overlay">
      <div className="manual-entry-modal">
        <div className="manual-entry-header">
          <h2>Manual Reservation Entry</h2>
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="manual-entry-content">
          <p className="manual-entry-description">
            Add a reservation for a customer who called in. Email and phone are optional for manual
            entries.
          </p>

          <form onSubmit={handleSubmit} className="manual-entry-form">
            <div className="form-group">
              <label htmlFor="name">Customer Name *</label>
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

            <div className="form-row">
              <div className="form-group">
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

              <div className="form-group">
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

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="date">Date *</label>
                <input
                  type="date"
                  id="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  min={getMinBookingDate()}
                  max={getMaxBookingDate()}
                  required
                />
                {restaurant && (
                  <small className="field-hint">Same-day bookings allowed for manual entry</small>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="time">Time *</label>
                <select
                  id="time"
                  name="time"
                  value={formData.time}
                  onChange={handleChange}
                  required
                  disabled={!formData.date || loadingTimes || availableTimes.length === 0}
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
                {!loadingTimes &&
                  formData.date &&
                  availableTimes.length === 0 &&
                  isRestaurantOpenOnDate(formData.date) && (
                    <p className="warning-text">
                      No available times for this date. All tables are booked or the time slots are
                      outside operating hours.
                    </p>
                  )}
                {!loadingTimes && formData.date && !isRestaurantOpenOnDate(formData.date) && (
                  <p className="error-text">The restaurant is closed on this date.</p>
                )}
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="partySize">Number of People *</label>
              <input
                type="text"
                id="partySize"
                name="partySize"
                value={formData.partySize}
                onChange={handleChange}
                placeholder="E.g., 2"
              />
              {restaurant && (
                <small className="field-hint">
                  Party size must be between {restaurant.min_party_size || 1} and{' '}
                  {restaurant.max_party_size || 20} people.
                </small>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="specialNotes">Special Requests / Notes</label>
              <textarea
                id="specialNotes"
                name="specialNotes"
                value={formData.specialNotes}
                onChange={handleChange}
                placeholder="E.g., dietary restrictions, allergies, celebration..."
              />
            </div>

            <button
              type="submit"
              className="submit-btn"
              disabled={submissionStatus === 'Submitting...'}
            >
              {submissionStatus === 'Submitting...'
                ? 'Creating Reservation...'
                : 'Create Manual Reservation'}
            </button>

            {submissionStatus && submissionStatus !== 'Submitting...' && (
              <p className={submissionStatus === 'Error' ? 'error-message' : 'success-message'}>
                {error || submissionStatus}
              </p>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}

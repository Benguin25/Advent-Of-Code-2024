import React, { useCallback, useEffect, useState } from 'react';
import ReservelyLogoIcon from '../assets/images/ReservelyLogoIcon.png';
import { ReservationStatusEnum } from '../types';
import { useNavigate } from 'react-router-dom';
import {
  getRestaurantBySlug,
  addReservation,
  sendReservationConfirmation,
} from '../lib/supabaseService'; // Import sendReservationConfirmation
import {
  validateReservation,
  calculateEndTime,
  getAvailableTimeSlotsForDay,
} from '../lib/reservationValidation'; // Import the validation function

export default function ReservationForm({ restaurantSlug }) {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1); // Added step state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    date: '',
    time: '',
    partySize: '',
    specialNotes: '',
  });
  const [restaurant, setRestaurant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submissionStatus, setSubmissionStatus] = useState(null); // Added for submission feedback
  const [showSuccessPopup, setShowSuccessPopup] = useState(false); // Added for success popup
  const [availableTimes, setAvailableTimes] = useState([]);
  const [loadingTimes, setLoadingTimes] = useState(false); // New loading state for times

  useEffect(() => {
    if (!restaurantSlug) {
      setLoading(false);
      setError('Restaurant slug not provided.');
      return;
    }

    const fetchRestaurantDetails = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getRestaurantBySlug(restaurantSlug);
        if (data) {
          setRestaurant(data);
        } else {
          setError(`Restaurant with slug "${restaurantSlug}" not found.`);
        }
      } catch (err) {
        console.error('Error fetching restaurant details:', err);
        setError('Failed to fetch restaurant details.');
      }
      setLoading(false);
    };

    fetchRestaurantDetails();
  }, [restaurantSlug]); // Depend on restaurantSlug prop

  // Helper function to convert 24-hour time to 12-hour format
  const formatTimeTo12Hour = time24 => {
    const [hours, minutes] = time24.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'p.m.' : 'a.m.';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  // Helper function to get day name from date
  const getDayName = dateString => {
    const date = new Date(dateString + 'T12:00:00'); // Use a fixed time to avoid timezone issues
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

  // Helper function to format operating hours for display
  const formatOperatingHours = () => {
    if (!restaurant) return null;

    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const dayLabels = [
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
      'Sunday',
    ];

    const today = new Date();
    const todayIndex = today.getDay(); // 0 = Sunday, 1 = Monday, etc.

    const hours = [];

    days.forEach((day, index) => {
      const openTime = restaurant[`${day}_open`];
      const closeTime = restaurant[`${day}_close`];

      // Adjust index to match our days array (Monday = 0 in our array, but getDay() returns 1 for Monday)
      const adjustedIndex = index === 6 ? 0 : index + 1; // Sunday is last in our array but 0 in getDay()
      const isToday = todayIndex === adjustedIndex;

      if (openTime && closeTime) {
        // Format time from 24-hour to 12-hour format
        const formatTime = timeStr => {
          const [hours, minutes] = timeStr.split(':');
          const date = new Date();
          date.setHours(parseInt(hours), parseInt(minutes));
          return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
        };

        hours.push({
          day: dayLabels[index],
          open: formatTime(openTime),
          close: formatTime(closeTime),
          isOpen: true,
          isToday: isToday,
        });
      } else {
        hours.push({
          day: dayLabels[index],
          isOpen: false,
          isToday: isToday,
        });
      }
    });

    return hours;
  };

  // Generate time slots in 15-minute intervals within open hours, but only show available times
  const generateAvailableTimes = useCallback(
    async selectedDate => {
      if (!restaurant || !selectedDate || !isRestaurantOpenOnDate(selectedDate)) {
        setAvailableTimes([]);
        setLoadingTimes(false);
        return;
      }

      setLoadingTimes(true);

      const dayName = getDayName(selectedDate);
      const openTimeStr = restaurant[`${dayName}_open`]; // e.g., "09:00:00"
      const closeTimeStr = restaurant[`${dayName}_close`]; // e.g., "22:00:00"

      if (!openTimeStr || !closeTimeStr) {
        setAvailableTimes([]);
        setLoadingTimes(false);
        return;
      }

      // Generate all possible time slots
      const allTimes = [];
      const [openHour, openMinute] = openTimeStr.split(':').map(Number);
      const [closeHour, closeMinute] = closeTimeStr.split(':').map(Number);

      let currentTime = new Date(selectedDate);
      currentTime.setHours(openHour, openMinute, 0, 0);

      const closeDateTime = new Date(selectedDate);
      closeDateTime.setHours(closeHour, closeMinute, 0, 0);

      while (currentTime < closeDateTime) {
        const time24 = `${String(currentTime.getHours()).padStart(2, '0')}:${String(currentTime.getMinutes()).padStart(2, '0')}`;
        allTimes.push(time24);
        currentTime.setMinutes(currentTime.getMinutes() + 15);
      }

      // Check each time slot for availability using the optimized function
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
          formData.partySize,
          durationForBooking,
          restaurant,
          allTimes
        );

        setAvailableTimes(availableTimeSlots);
      } catch (error) {
        console.error('Error getting available time slots:', error);
        setAvailableTimes([]);
      }
      setLoadingTimes(false);
    },
    [restaurant, isRestaurantOpenOnDate, formData.partySize]
  );

  useEffect(() => {
    if (formData.date && restaurant) {
      generateAvailableTimes(formData.date);
    }
  }, [formData.date, formData.partySize, restaurant, generateAvailableTimes]);

  // Separate useEffect to handle time validation when availableTimes changes
  useEffect(() => {
    if (formData.time && availableTimes.length > 0 && !availableTimes.includes(formData.time)) {
      setFormData(prev => ({ ...prev, time: '' }));
    }
  }, [availableTimes, formData.time]);

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
          console.error(
            'Failed to parse restaurant.reservation_duration for validation:',
            parseError
          );
          setError('Could not determine reservation duration for validation.');
          setSubmissionStatus('Error');
          return;
        }
      } else {
        parsedDuration = restaurant.reservation_duration; // It's already an object
      }

      // Ensure both hours and minutes are present, defaulting minutes to 0 if necessary
      if (parsedDuration && typeof parsedDuration.hours !== 'undefined') {
        durationForThisBooking = {
          hours: parsedDuration.hours,
          minutes: typeof parsedDuration.minutes !== 'undefined' ? parsedDuration.minutes : 0,
        };
      } else if (parsedDuration && typeof parsedDuration.minutes !== 'undefined') {
        // Handle case where only minutes might be provided (less likely but good for robustness)
        durationForThisBooking = {
          hours: 0,
          minutes: parsedDuration.minutes,
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

    // Prepare data for validation, including the duration for this specific request
    const reservationDetailsToValidate = {
      restaurant_id: restaurant.id,
      booking_date: formData.date,
      booking_time: formData.time,
      number_of_people: formData.partySize,
      requested_duration: durationForThisBooking, // Pass the determined duration
    };

    // Validate the reservation
    // The second argument to validateReservation (restaurant details) was removed in a previous step,
    // as validateReservation now fetches it itself.
    const validationResult = await validateReservation(reservationDetailsToValidate);

    if (!validationResult.isValid) {
      setError(validationResult.message || 'Validation failed. Please check your input.');
      setSubmissionStatus('Error');
      return;
    }

    // Get the assigned table from validation result
    const assignedTable = validationResult.assignedTable;

    setSubmissionStatus('Submitting...');

    // Calculate expected_end_time before sending to addReservation
    let calculatedEndTime = null;
    // The durationForThisBooking from above can be reused here for calculating end time
    if (formData.date && formData.time && durationForThisBooking) {
      calculatedEndTime = calculateEndTime(formData.time, durationForThisBooking);
    } else if (formData.date && formData.time) {
      // Fallback or error if durationForThisBooking wasn't resolved but is needed
      console.warn(
        'Could not calculate end time because durationForThisBooking was not available.'
      );
      // setError('Could not calculate reservation end time due to missing duration.');
      // setSubmissionStatus('Error');
      // return;
      // Depending on requirements, you might want to stop or proceed without end_time
    }

    // Prepare data for Supabase (can be same as validation or extended)
    const reservationData = {
      ...reservationDetailsToValidate, // Use validated details
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      notes: formData.specialNotes,
      status: ReservationStatusEnum.planned,
      table_id: assignedTable?.id, // Add the assigned table ID
      // Add expected_end_time if calculated
      ...(calculatedEndTime && { expected_end_time: `${formData.date}T${calculatedEndTime}:00` }),
      // Ensure all required fields by addReservation and your DB schema are here
    };

    // Check restaurant open/close times before making Supabase call
    const dayName = getDayName(formData.date);
    const openTimeStr = restaurant[`${dayName}_open`];
    const closeTimeStr = restaurant[`${dayName}_close`];
    if (!openTimeStr || !closeTimeStr) {
      setError('Restaurant is closed on the selected day.');
      setSubmissionStatus('Error');
      return;
    }
    const bookingTime = formData.time;
    const open = openTimeStr.substring(0, 5);
    const close = closeTimeStr.substring(0, 5);
    if (bookingTime < open || bookingTime >= close) {
      setError('Reservation time is outside operating hours.');
      setSubmissionStatus('Error');
      return;
    }

    try {
      // The addReservation function in supabaseService.js expects restaurantId, not slug
      const newReservation = await addReservation(restaurant.id, reservationData);

      // Send confirmation emails
      try {
        await sendReservationConfirmation(newReservation, restaurant);
      } catch (emailError) {
        console.error('Failed to send confirmation emails:', emailError);
        // Don't fail the reservation if emails fail, just log the error
      }

      // Show success popup instead of inline message
      setShowSuccessPopup(true);
      setSubmissionStatus(null); // Clear any previous status
      // Optionally, clear the form or navigate the user
      setFormData({
        name: '',
        email: '',
        phone: '',
        date: '',
        time: '',
        partySize: 1,
        specialNotes: '',
      });
      // alert(`Reservation submitted for ${restaurant.name}!`); // Replaced by submissionStatus
    } catch (err) {
      console.error('Reservation failed:', err);
      // Check if the error is an RLS violation or other specific Supabase error
      if (err.message && err.message.includes('violates row-level security policy')) {
        setError(
          'Reservation failed due to a security policy. Please ensure you are logged in and have the necessary permissions.'
        );
      } else {
        setError('Reservation failed. Please try again. ' + (err.message || ''));
      }
      setSubmissionStatus('Error');
      // alert('Reservation failed. Please try again.'); // Replaced by submissionStatus
    }
  };

  // Get today's date in YYYY-MM-DD format for the date input min attribute
  const today = new Date().toISOString().split('T')[0];

  // Calculate minimum and maximum booking dates based on restaurant settings
  const getMinBookingDate = () => {
    const minAdvanceHours = restaurant?.min_advance_hours || 2;
    const minDate = new Date();
    minDate.setHours(minDate.getHours() + minAdvanceHours);
    return minDate.toISOString().split('T')[0];
  };

  const getMaxBookingDate = () => {
    const maxAdvanceDays = restaurant?.advance_booking_days || 30;
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + maxAdvanceDays);
    return maxDate.toISOString().split('T')[0];
  };

  if (loading) {
    return (
      <div className="edit-seating-loading-container">
        <div className="loading-content">
          <div className="loading-spinner"></div>
          <p>Loading restaurant details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="statusMessageContainer">
        <p className="statusMessage errorMessage">Error: {error}</p>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="statusMessageContainer">
        <p className="statusMessage">Restaurant not found.</p>
      </div>
    );
  }

  // If restaurant is not confirmed, show a banner and blur/disable the form
  const isUnconfirmed = restaurant && restaurant.confirmed === false;

  return (
    <>
      {/* Confirmation Status Banner */}
      {isUnconfirmed && (
        <div
          style={{
            maxWidth: '80%',
            margin: '2rem auto',
            background: 'linear-gradient(90deg, #ff9800 0%, #ffc107 100%)',
            color: '#232b4d',
            padding: '1.2rem 1.5rem',
            textAlign: 'center',
            fontWeight: 600,
            fontSize: '1.1rem',
            borderRadius: '12px',
            boxShadow: '0 2px 16px rgba(0,0,0,0.10)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.75rem',
            zIndex: 10,
            position: 'relative',
          }}
        >
          {'This restaurant is not confirmed. Online reservations are disabled until confirmation.'}
        </div>
      )}
      <style>{`
/* Step-based styling */
.mainContent {
  display: flex;
  gap: 40px;
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  align-items: center;
}

.restaurantInfoSidebar {
  flex: 0 0 450px;
  position: sticky;
  top: 20px;
  height: fit-content;
}

.restaurantDetails {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(100, 255, 218, 0.15);
  border-radius: 12px;
  padding: 25px;
  box-shadow: 0 5px 20px rgba(0, 0, 0, 0.15);
  height: 100%;
  display: flex;
  flex-direction: column;
}

.restaurantName {
  font-size: 2.4rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 15px 0;
  line-height: 1.3;
}

.restaurantInfo {
  color: rgba(255, 255, 255, 0.85);
  font-size: 1.4rem;
  margin: 12px 0;
  line-height: 1.4;
}

.operatingHours {
  margin-top: 30px;
  padding-top: 25px;
  border-top: 1px solid rgba(100, 255, 218, 0.2);
  flex: 1;
}

.hoursTitle {
  font-size: 1.4rem;
  margin-bottom: 18px;
  color: var(--accent-teal, #007bff);
  text-align: left;
  font-weight: 600;
}

.hoursGrid {
  display: grid;
  gap: 10px;
}

.hourRow {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  transition: background-color 0.2s ease;
}

.hourRow:last-child {
  border-bottom: none;
}

.hourRow.today {
  background-color: rgba(100, 255, 218, 0.1);
  padding: 10px 12px;
  margin: 0 -12px;
  border-radius: 4px;
}

.dayLabel {
  font-weight: 500;
  color: var(--text-primary);
  font-size: 1.1rem;
}

.timeLabel {
  font-size: 1.05rem;
  font-weight: 500;
}

.timeLabel.open {
  color: var(--accent-teal, #007bff);
}

.timeLabel.closed {
  color: rgba(255, 255, 255, 0.5);
}

.formContainer {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.reservationStepContainer {
  width: 100%;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(100, 255, 218, 0.15);
  border-radius: 12px;
  padding: 35px;
  box-shadow: 0 5px 20px rgba(0, 0, 0, 0.15);
  height: 100%;
  display: flex;
  flex-direction: column;
}

.stepHeader {
  text-align: center;
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 1px solid rgba(100, 255, 218, 0.2);
}

.stepTitleRow {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  margin-bottom: 10px;
  position: relative;
}

.stepTitle {
  font-size: 1.8rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.stepBackHeader {
  background: rgba(100, 255, 218, 0.1);
  border: 1px solid rgba(100, 255, 218, 0.3);
  color: var(--accent-teal, #007bff);
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  position: absolute;
  left: 0;
}

.stepBackHeader:hover {
  background: rgba(100, 255, 218, 0.2);
  border-color: rgba(100, 255, 218, 0.5);
  transform: translateY(-1px);
}

.stepIndicator {
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 15px;
}

.reservationSummary {
  background: rgba(100, 255, 218, 0.1);
  border: 1px solid rgba(100, 255, 218, 0.3);
  border-radius: 8px;
  padding: 12px 20px;
  margin-top: 15px;
}

.summaryText {
  color: var(--accent-teal);
  font-weight: 500;
  font-size: 1rem;
}

.step1Form {
  max-width: 500px;
  margin: 0 auto;
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.partySelect, .dateInput, .timeSelect {
  font-size: 1.1rem !important;
  padding: 16px 20px !important;
  text-align: center;
  background: rgba(0, 0, 0, 0.15);
  border: 1px solid rgba(100, 255, 218, 0.2);
  border-radius: 6px;
  color: var(--text-primary);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  width: 100%;
  box-sizing: border-box;
  padding-right: 40px;
  color-scheme: dark;
}

.partySelect:focus, .dateInput:focus, .timeSelect:focus {
  outline: none;
  border-color: var(--accent-teal, #007bff);
  box-shadow: 0 0 0 3px rgba(100, 255, 218, 0.25);
}

.partySelect option, .timeSelect option {
  color: var(--text-primary);
  background: rgba(0, 0, 0, 0.9);
}

.timeSelect {
  margin-top: 15px;
}

.dateHint {
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.85rem;
  display: block;
  margin-top: 8px;
  text-align: center;
}

.timeSelectionSection {
  margin-top: 25px;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.timeSelectionSection label {
  font-size: 1.2rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 15px;
  display: block;
  text-align: center;
}

.timePrompt {
  text-align: center;
  color: rgba(255, 255, 255, 0.6);
  font-style: italic;
  margin: 20px 0;
}

.timeLoading {
  text-align: center;
  color: var(--accent-teal);
  margin: 20px 0;
}

.noTimesAvailable {
  text-align: center;
  color: var(--accent-pink);
  margin: 20px 0;
}

.stepActions {
  display: flex;
  gap: 15px;
  justify-content: center;
  margin-top: auto;
  padding-top: 30px;
}

.nextButton {
  background: var(--accent-gradient);
  color: var(--primary-bg);
  border: none;
  padding: 14px 40px;
  border-radius: 8px;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 200px;
}

.nextButton:hover:not(:disabled) {
  transform: translateY(-2px);
}

.nextButton:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.stepBack {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(100, 255, 218, 0.3);
  color: var(--text-primary);
  padding: 14px 30px;
  font-size: 1rem;
  min-width: auto;
}

.stepBack:hover {
  background: rgba(100, 255, 218, 0.1);
  border-color: rgba(100, 255, 218, 0.5);
}

/* Responsive adjustments for steps */
@media (max-width: 900px) {
  .mainContent {
    flex-direction: column;
    gap: 25px;
  }
  
  .restaurantInfoSidebar {
    flex: none;
    position: static;
  }
  
  .restaurantDetails {
    padding: 20px;
  }
  
  .restaurantName {
    font-size: 1.6rem;
  }
  
  .pageContainer {
    padding: 30px 15px;
  }
  
  .formContainer {
    padding: 25px 20px;
  }
}

@media (max-width: 768px) {
  .pageContainer {
    padding: 20px 10px;
  }
  
  .formContainer {
    padding: 20px 15px;
  }
  
  .mainTitle {
    font-size: 2.2rem;
  }
  
  .stepIndicator {
    font-size: 0.8rem;
  }
  
  .stepTitle {
    font-size: 1.6rem;
  }
  
  .restaurantDetails {
    padding: 15px;
  }
}

@media (max-width: 600px) {
  .stepActions {
    flex-direction: column;
    align-items: center;
    gap: 15px;
  }
  
  .nextButton {
    min-width: 250px;
    width: 100%;
  }
  
  .backButton {
    width: 100%;
    max-width: 250px;
  }
  
  .mainContent {
    gap: 20px;
  }
  
  .restaurantInfoSidebar {
    order: 2;
  }
  
  .formContainer {
    order: 1;
    padding: 15px;
  }
  
  .formCard {
    padding: 20px 15px;
  }
  
  .submitButton {
    padding: 18px;
    font-size: 1.1rem;
  }
}

@media (max-width: 480px) {
  .pageContainer {
    padding: 15px 5px;
  }
  
  .formContainer {
    padding: 10px;
  }
  
  .formCard {
    padding: 15px 10px;
  }
  
  .mainTitle {
    font-size: 2rem;
  }
  
  .stepTitle {
    font-size: 1.4rem;
  }
  
  .restaurantDetails {
    padding: 10px;
  }
  
  .formGroup input,
  .formGroup textarea {
    padding: 12px 15px;
    font-size: 0.95rem;
  }
}

/* CSS from ReservationForm.module.css */
.pageContainer {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  min-height: 80vh;
  padding: 40px 20px;
  width: 100%;
  box-sizing: border-box;
  background-color: var(--background-primary);
}
.contentSection {
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 30px;
}
.headerText {
  text-align: center;
  width: 100%;
}
.mainTitle {
  font-size: 2.8rem;
  margin-bottom: 25px;
  color: var(--accent-blue);
  font-weight: 600;
}
.formContainer {
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
  padding: 35px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(100, 255, 218, 0.15);
  border-radius: 12px;
  box-sizing: border-box;
  box-shadow: 0 5px 20px rgba(0, 0, 0, 0.15);
}
.reservationForm {
  display: grid;
  gap: 28px;
  width: 100%;
  flex: 1;
}

.Step3Form {
  display: flex;
  flex-direction: column;
  gap: 28px;
  flex: 1;
}
.formGroup label {
  margin-bottom: 10px;
  display: block;
  font-weight: 500;
  font-size: 1.05rem;
  color: var(--text-primary);
}
.formGroup input[type="text"],
.formGroup input[type="email"],
.formGroup input[type="tel"],
.formGroup input[type="date"],
.formGroup input[type="time"],
.formGroup input[type="number"],
.formGroup textarea {
  padding: 14px 18px;
  font-size: 1rem;
  width: 100%;
  box-sizing: border-box;
  background: rgba(0, 0, 0, 0.15);
  border: 1px solid rgba(100, 255, 218, 0.2);
  border-radius: 6px;
  color: var(--text-primary);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}
.formGroup input[type="date"],
.formGroup input[type="time"] {
  color-scheme: dark;
}
.formGroup input:focus,
.formGroup textarea:focus {
  outline: none;
  border-color: var(--accent-teal, #007bff);
  box-shadow: 0 0 0 3px rgba(100, 255, 218, 0.25);
}
.formGroup textarea {
  min-height: 130px;
  resize: vertical;
}
.formRow {
  display: grid;
  grid-template-columns: 1fr;
  gap: 28px;
}
@media (min-width: 600px) {
  .formRow {
    grid-template-columns: 1fr 1fr;
  }
}
.submitButton {
  width: 100%;
  margin-top: 15px;
  padding: 16px;
  font-size: 1.15rem;
  font-weight: 600;
  background: var(--accent-gradient);
  color: var(--primary-bg);
  border: none;
  border-radius: 8px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: transform 0.3s ease;
}
.submitButton:hover {
  transform: translateY(-3px);
}
.submitButton:active {
  transform: translateY(1px);
}
.statusMessageContainer {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: 60vh;
  padding: 40px;
  text-align: center;
  position: relative;
}
.statusMessage {
  font-size: 1.5rem;
  color: var(--accent-blue);
  background-color: rgba(255, 255, 255, 0.05);
  padding: 40px;
  border-radius: 12px;
  border: 1px solid rgba(100, 255, 218, 0.2);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
  width: 100%;
  max-width: 600px;
  position: relative;
}
.statusMessage::before {
  content: "";
  display: block;
  width: 60px;
  height: 60px;
  border: 4px solid rgba(100, 255, 218, 0.1);
  border-top: 4px solid var(--accent-blue);
  border-radius: 50%;
  animation: spinner 1.5s cubic-bezier(0.68, -0.55, 0.27, 1.55) infinite;
  margin: 0 auto 30px;
}
@keyframes spinner {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
.errorMessage {
  color: var(--accent-pink);
}
.errorMessage::before {
  border-top-color: var(--accent-pink);
}
.formGroup input[type="number"]::-webkit-inner-spin-button,
.formGroup input[type="number"]::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
.formGroup input[type="number"] {
  -moz-appearance: textfield;
}
.formGroup input::placeholder,
.formGroup textarea::placeholder {
  color: rgba(255, 255, 255, 0.4);
  opacity: 1;
}
.successMessageText {
  color: var(--accent-teal, #007bff);
  font-size: 1rem;
  margin-top: 15px;
  text-align: center;
}
.errorMessageText {
  color: var(--accent-pink, #FF7ABC);
  font-size: 1rem;
  margin-top: 15px;
  text-align: center;
}

/* Success Popup Styles */
.popupOverlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  animation: fadeIn 0.3s ease-out;
}

.successPopup {
  background: #1a2332;
  border: 1px solid rgba(100, 255, 218, 0.3);
  border-radius: 16px;
  padding: 40px;
  max-width: 500px;
  width: 90%;
  text-align: center;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
  animation: slideUp 0.3s ease-out;
}

.successPopup h3 {
  color: var(--accent-teal, #007bff);
  font-size: 1.8rem;
  margin: 0 0 15px 0;
  font-weight: 600;
}

.successPopup p {
  color: rgba(255, 255, 255, 0.9);
  font-size: 1.1rem;
  line-height: 1.5;
  margin: 0 0 25px 0;
}

.successPopup button {
  background: var(--accent-gradient);
  color: var(--primary-bg);
  border: none;
  padding: 12px 30px;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s ease;
}

.successPopup button:hover {
  transform: translateY(-2px);
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from { 
    opacity: 0;
    transform: translateY(30px);
  }
  to { 
    opacity: 1;
    transform: translateY(0);
  }
}
      `}</style>
      <style jsx>{`
        .navigationHeader {
          position: relative;
          width: 100%;
          height: 50px;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
        }
        .backButton {
          position: absolute;
          left: 0;
          background: rgba(100, 255, 218, 0.1);
          border: 1px solid rgba(100, 255, 218, 0.3);
          color: var(--accent-teal, #007bff);
          padding: 10px 20px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.95rem;
          font-weight: 500;
          transition: all 0.2s ease;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          z-index: 10;
        }
        .backButton:hover {
          background: rgba(100, 255, 218, 0.2);
          border-color: rgba(100, 255, 218, 0.5);
          transform: translateY(-1px);
        }
        .backButton:active {
          transform: translateY(0);
        }
      `}</style>
      <div className="pageContainer">
        <div className="contentSection">
          <div className="navigationHeader">
            <button className="backButton" onClick={() => navigate('/')} type="button">
              ← Back to Restaurants
            </button>
          </div>
          <div className="headerText">
            <h1 className="mainTitle">Make a Reservation</h1>
          </div>
          <div className="mainContent">
            <div className="restaurantInfoSidebar">
              <div className="restaurantDetails">
                <h2 className="restaurantName" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {restaurant.logo_url && (
                    <img
                      src={restaurant.logo_url}
                      alt={`${restaurant.name} Logo`}
                      style={{ width: '100px', objectFit: 'contain', marginRight: '4px', borderRadius: '6px' }}
                    />
                  )}
                  {restaurant.name}
                </h2>
                <p className="restaurantInfo">{restaurant.cuisine}</p>
                <p className="restaurantInfo">📍 {restaurant.address}</p>

                <div className="operatingHours">
                  <h3 className="hoursTitle">Operating Hours</h3>
                  <div className="hoursGrid">
                    {formatOperatingHours()?.map((dayInfo, index) => (
                      <div key={index} className={`hourRow ${dayInfo.isToday ? 'today' : ''}`}>
                        <span className="dayLabel">
                          {dayInfo.day}
                          {dayInfo.isToday ? ' (Today)' : ''}
                        </span>
                        <span className={`timeLabel ${dayInfo.isOpen ? 'open' : 'closed'}`}>
                          {dayInfo.isOpen ? `${dayInfo.open} - ${dayInfo.close}` : 'Closed'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="formContainer" style={isUnconfirmed ? { filter: 'blur(1.5px) grayscale(0.3) opacity(0.7)', pointerEvents: 'none', position: 'relative' } : {}}>
              {currentStep === 1 ? (
                <div className="reservationStepContainer">
                  <div className="stepHeader">
                    <h2 className="stepTitle">Make a reservation</h2>
                    <div className="stepIndicator">Step 1 of 2</div>
                  </div>

                  <form className="reservationForm step1Form">
                    <div className="formGroup">
                      <label htmlFor="partySize">Number of People</label>
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
                          Array.from(
                            {
                              length:
                                (restaurant.max_party_size || 20) -
                                (restaurant.min_party_size || 1) +
                                1,
                            },
                            (_, i) => restaurant.min_party_size + i || 1 + i
                          ).map(size => (
                            <option key={size} value={size}>
                              {size} {size === 1 ? 'person' : 'people'}
                            </option>
                          ))}
                      </select>
                    </div>{' '}
                    <div className="formGroup">
                      <label htmlFor="date">Select date</label>
                      <input
                        type="date"
                        id="date"
                        name="date"
                        value={formData.date}
                        onChange={handleChange}
                        min={restaurant ? getMinBookingDate() : today}
                        max={restaurant ? getMaxBookingDate() : undefined}
                        required
                        className="dateInput"
                      />
                      {restaurant && (
                        <small className="dateHint">
                          Bookings must be made at least {restaurant.min_advance_hours || 2} hours
                          in advance, up to {restaurant.advance_booking_days || 30} days ahead.
                        </small>
                      )}
                    </div>
                    <div className="timeSelectionSection">
                      <label htmlFor="time">Select a time</label>
                      {!formData.date || !formData.partySize ? (
                        <p className="timePrompt">Please select date and party size first</p>
                      ) : loadingTimes ? (
                        <div className="timeLoading">
                          <p>
                            Checking availability for {formData.partySize} guest
                            {formData.partySize > 1 ? 's' : ''}...
                          </p>
                        </div>
                      ) : availableTimes.length === 0 ? (
                        <div className="noTimesAvailable">
                          {isRestaurantOpenOnDate(formData.date) ? (
                            <p>No available times for this date. All tables are booked.</p>
                          ) : (
                            <p>The restaurant is closed on this date.</p>
                          )}
                        </div>
                      ) : (
                        <select
                          id="time"
                          name="time"
                          value={formData.time}
                          onChange={handleChange}
                          required
                          className="timeSelect"
                        >
                          <option value="" disabled>
                            Select a time
                          </option>
                          {availableTimes.map(timeSlot => (
                            <option key={timeSlot} value={timeSlot}>
                              {formatTimeTo12Hour(timeSlot)}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>{' '}
                    <div className="stepActions">
                      <button
                        type="button"
                        className="nextButton"
                        disabled={!formData.date || !formData.time || !formData.partySize}
                        onClick={() => setCurrentStep(2)}
                      >
                        Continue to Details
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                <div className="reservationStepContainer">
                  <div className="stepHeader">
                    <div className="stepTitleRow">
                      <button
                        type="button"
                        className="backButton stepBackHeader"
                        onClick={() => setCurrentStep(1)}
                      >
                        ← Back
                      </button>
                      <h2 className="stepTitle">Your Details</h2>
                    </div>
                    <div className="stepIndicator">Step 2 of 2</div>
                    <div className="reservationSummary">
                      <span className="summaryText">
                        {formData.partySize} people •{' '}
                        {(() => {
                          if (!formData.date) return '';
                          // Convert date to EST (America/New_York)
                          const estDate = new Date(
                            new Date(formData.date + 'T12:00:00Z').toLocaleString('en-US', {
                              timeZone: 'America/New_York',
                            })
                          );
                          return estDate.toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          });
                        })()}{' '}
                        • {formData.time ? formatTimeTo12Hour(formData.time) : ''}
                      </span>
                    </div>
                  </div>

                  <form onSubmit={handleSubmit} className="reservationForm Step3Form">
                    <div className="formGroup">
                      <label htmlFor="name">Full Name</label>
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
                      <label htmlFor="email">Email Address</label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        placeholder="E.g., john.doe@example.com"
                      />
                    </div>

                    <div className="formGroup">
                      <label htmlFor="phone">Phone Number</label>
                      <input
                        type="tel"
                        id="phone"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        required
                        placeholder="E.g., (555) 123-4567"
                      />
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
                          ? 'Submitting...'
                          : 'Complete Reservation'}
                      </button>
                    </div>

                    {submissionStatus && submissionStatus !== 'Submitting...' && (
                      <p
                        className={
                          submissionStatus === 'Error' ? 'errorMessageText' : 'successMessageText'
                        }
                      >
                        {error || submissionStatus}
                      </p>
                    )}
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Success Popup */}
      {showSuccessPopup && (
        <div className="popupOverlay">
          <div className="successPopup">
            <h3>Reservation Confirmed!</h3>
            <p>
              Your reservation has been successfully submitted and confirmation emails have been
              sent.
            </p>
            <button
              onClick={() => {
                setShowSuccessPopup(false);
                navigate('/');
              }}
            >
              Back to Restaurants
            </button>
          </div>
        </div>
      )}
    </>
  );
}

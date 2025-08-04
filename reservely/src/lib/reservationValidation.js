// src/lib/reservationValidation.js
import { getTables, getReservations, getRestaurantById } from './supabaseService';

/**
 * Calculates the expected end time of a reservation.
 * @param {string} bookingTime - The start time of the booking (e.g., "14:30").
 * @param {{hours: number, minutes: number}} duration - The duration of the reservation.
 * @returns {string} The calculated end time in HH:MM format.
 */
export function calculateEndTime(bookingTime, duration) {
  if (
    !bookingTime ||
    !duration ||
    typeof duration.hours === 'undefined' ||
    typeof duration.minutes === 'undefined'
  ) {
    console.error('Invalid input for calculateEndTime:', { bookingTime, duration });
    // Return a default or throw an error, depending on desired handling
    return null;
  }

  const [hours, minutes] = bookingTime.split(':').map(Number);
  let endHours = hours + duration.hours;
  let endMinutes = minutes + duration.minutes;

  if (endMinutes >= 60) {
    endHours += Math.floor(endMinutes / 60);
    endMinutes %= 60;
  }

  // Handle cases where booking might cross midnight, though typically restaurants might not allow this.
  // For simplicity, this example doesn't explicitly handle crossing over to the next day,
  // but it formats hours that might exceed 23 (e.g., 25:00 would be 01:00 next day).
  // Supabase time fields might need specific handling for this.
  endHours %= 24;

  return `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;
}

/**
 * Checks if the restaurant is open at the given date and time.
 * @param {object} restaurant - The restaurant object, including opening hours.
 * @param {Date} dateTime - The requested date and time for the reservation.
 * @returns {boolean} True if the restaurant is open, false otherwise.
 */
export function isRestaurantOpen(restaurant, dateTime) {
  if (!restaurant || !restaurant.monday_open || !dateTime) {
    // Basic check
    console.error('Restaurant data or dateTime missing for isRestaurantOpen');
    return false;
  }

  const dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][
    dateTime.getDay()
  ];
  const openTimeStr = restaurant[`${dayOfWeek}_open`]; // e.g., restaurant.monday_open
  const closeTimeStr = restaurant[`${dayOfWeek}_close`]; // e.g., restaurant.monday_close

  if (!openTimeStr || !closeTimeStr) {
    return false; // Not open on this day
  }

  const requestedTime = `${String(dateTime.getHours()).padStart(2, '0')}:${String(dateTime.getMinutes()).padStart(2, '0')}`;

  // Assuming openTimeStr and closeTimeStr are in "HH:MM:SS" or "HH:MM" format
  const open = openTimeStr.substring(0, 5); // Take HH:MM
  const close = closeTimeStr.substring(0, 5);

  return requestedTime >= open && requestedTime < close;
}

/**
 * Finds available tables for a given reservation request.
 * @param {string} restaurantId - The ID of the restaurant.
 * @param {Date} bookingDateTime - The desired date and time of the reservation.
 * @param {number} partySize - The number of people in the party.
 * @param {{hours: number, minutes: number}} requestedReservationDuration - The duration of the reservation.
 * @param {object} restaurantData - The fetched restaurant object.
 * @returns {Promise<Array<object>>} A list of available tables.
 */
export async function findAvailableTables(
  restaurantId,
  bookingDateTime,
  partySize,
  requestedReservationDuration, // Renamed from reservationDuration
  restaurantData // Added: This is the fetched restaurant object
) {
  try {
    // const restaurant = await getRestaurantById(restaurantId); // REMOVED: restaurantData is now passed in
    if (!restaurantData || !restaurantData.reservation_duration) {
      console.error('Restaurant data or reservation_duration not provided to findAvailableTables.');
      return [];
    }

    const restaurantDefaultDuration =
      typeof restaurantData.reservation_duration === 'string'
        ? JSON.parse(restaurantData.reservation_duration)
        : restaurantData.reservation_duration;

    // Use the specifically requested duration if provided, otherwise fall back to restaurant's default
    const durationForNewBooking = requestedReservationDuration || restaurantDefaultDuration;

    if (
      !durationForNewBooking ||
      typeof durationForNewBooking.hours === 'undefined' ||
      typeof durationForNewBooking.minutes === 'undefined'
    ) {
      console.error('Invalid reservation duration format for the new booking.');
      return [];
    }

    const allTables = await getTables(restaurantId); // Still need restaurantId for this
    const suitableTables = allTables.filter(
      table => table.capacity >= partySize && table.status === 'available'
    ); // Assuming 'available' is a valid status string

    if (suitableTables.length === 0) {
      return []; // No tables with enough capacity or suitable status
    }

    const existingBookings = await getReservations(restaurantId);

    const bookingDateStr = bookingDateTime.toISOString().split('T')[0];
    const requestedStartTimeStr = `${String(bookingDateTime.getHours()).padStart(2, '0')}:${String(bookingDateTime.getMinutes()).padStart(2, '0')}`;
    const requestedEndTimeStr = calculateEndTime(requestedStartTimeStr, durationForNewBooking); // Use durationForNewBooking

    if (!requestedEndTimeStr) {
      console.error('Could not calculate reservation end time.');
      return [];
    }

    const availableTables = suitableTables.filter(table => {
      const bookingsForTableOnDate = existingBookings.filter(
        booking => booking.table_id === table.id && booking.booking_date === bookingDateStr
      );

      return !bookingsForTableOnDate.some(booking => {
        const existingStartTime = booking.booking_time.substring(0, 5); // HH:MM
        // Calculate existing booking's end time. Need its duration.
        // This part is tricky: we need the duration of *existing* bookings.
        // For now, let's assume all bookings at a restaurant use the *current* restaurant.reservation_duration.
        // A more robust solution would store duration with each booking or have a way to determine it.
        const existingEndTime = booking.expected_end_time
          ? booking.expected_end_time.substring(11, 16)
          : calculateEndTime(existingStartTime, restaurantDefaultDuration); // Use restaurantDefaultDuration for existing

        if (!existingEndTime) return true; // If we can't calculate end time, assume conflict

        // Check for overlap:
        // Requested: [S1, E1)
        // Existing:  [S2, E2)
        // Overlap if S1 < E2 AND S2 < E1
        return requestedStartTimeStr < existingEndTime && existingStartTime < requestedEndTimeStr;
      });
    });

    return availableTables;
  } catch (error) {
    console.error('Error finding available tables:', error);
    throw error;
  }
}

/**
 * Finds a specific available table for a reservation request.
 * @param {string} restaurantId - The ID of the restaurant.
 * @param {Date} bookingDateTime - The desired date and time of the reservation.
 * @param {number} partySize - The number of people in the party.
 * @param {{hours: number, minutes: number}} requestedReservationDuration - The duration of the reservation.
 * @param {object} restaurantData - The fetched restaurant object.
 * @returns {Promise<object|null>} The assigned table object or null if none available.
 */
export async function findAndAssignTable(
  restaurantId,
  bookingDateTime,
  partySize,
  requestedReservationDuration,
  restaurantData
) {
  const availableTables = await findAvailableTables(
    restaurantId,
    bookingDateTime,
    partySize,
    requestedReservationDuration,
    restaurantData
  );

  if (availableTables.length === 0) {
    return null;
  }

  // Table size optimization: select the smallest table that fits the party
  // This maximizes restaurant efficiency by saving larger tables for larger parties
  const optimizedTable = availableTables.reduce((bestTable, currentTable) => {
    // If no best table yet, use current table
    if (!bestTable) return currentTable;

    // Prefer tables with smaller capacity (but still adequate for party size)
    if (currentTable.capacity < bestTable.capacity) {
      return currentTable;
    }

    // If capacities are equal, prefer table with lower ID for consistency
    if (currentTable.capacity === bestTable.capacity) {
      return currentTable.id < bestTable.id ? currentTable : bestTable;
    }

    // Keep the current best table
    return bestTable;
  }, null);

  return optimizedTable;
}

/**
 * Gets all available time slots for a specific date by fetching data once and filtering locally.
 * @param {string} restaurantId - The ID of the restaurant.
 * @param {string} bookingDate - The date in YYYY-MM-DD format.
 * @param {number} partySize - The number of people in the party.
 * @param {{hours: number, minutes: number}} duration - The duration of the reservation.
 * @param {object} restaurant - The restaurant object with opening hours.
 * @param {Array<string>} timeSlots - Array of time slots to check (e.g., ["09:00", "09:15", "09:30"]).
 * @returns {Promise<Array<string>>} Array of available time slots.
 */
export async function getAvailableTimeSlotsForDay(
  restaurantId,
  bookingDate,
  partySize,
  duration,
  restaurant,
  timeSlots
) {
  try {
    // Get all tables and reservations for the day in one call each
    const [allTables, existingBookings] = await Promise.all([
      getTables(restaurantId),
      getReservations(restaurantId),
    ]);

    // Filter tables that can accommodate the party size
    const suitableTables = allTables.filter(
      table => table.capacity >= partySize && table.status === 'available'
    );

    if (suitableTables.length === 0) {
      return []; // No suitable tables
    }

    // Filter existing bookings to only those on the requested date
    const bookingsForDate = existingBookings.filter(
      booking => booking.booking_date === bookingDate
    );

    // Get restaurant's default duration for calculating existing booking end times
    const restaurantDefaultDuration =
      typeof restaurant.reservation_duration === 'string'
        ? JSON.parse(restaurant.reservation_duration)
        : restaurant.reservation_duration;

    // Check each time slot for availability
    const availableTimeSlots = [];

    // Get current time for advance booking check
    const now = new Date();
    // Get min advance hours from restaurant or default to 2
    const minAdvanceHours = restaurant?.min_advance_hours || 2;

    for (const timeSlot of timeSlots) {
      // Combine bookingDate and timeSlot to a Date object
      const slotDateTime = new Date(`${bookingDate}T${timeSlot}:00`);
      // Only allow slots at least minAdvanceHours in the future
      const diffMs = slotDateTime.getTime() - now.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);
      if (diffHours < minAdvanceHours) continue;

      const requestedEndTime = calculateEndTime(timeSlot, duration);
      if (!requestedEndTime) continue;

      // Check if any suitable table is available for this time slot
      const hasAvailableTable = suitableTables.some(table => {
        const bookingsForTable = bookingsForDate.filter(booking => booking.table_id === table.id);

        // Check if this time slot conflicts with any existing booking for this table
        const hasConflict = bookingsForTable.some(booking => {
          const existingStartTime = booking.booking_time.substring(0, 5); // HH:MM
          const existingEndTime = booking.expected_end_time
            ? booking.expected_end_time.substring(11, 16)
            : calculateEndTime(existingStartTime, restaurantDefaultDuration);

          if (!existingEndTime) return true; // Assume conflict if can't calculate

          // Check for overlap: requested [timeSlot, requestedEndTime) vs existing [existingStartTime, existingEndTime)
          return timeSlot < existingEndTime && existingStartTime < requestedEndTime;
        });

        return !hasConflict; // Table is available if no conflicts
      });

      if (hasAvailableTable) {
        availableTimeSlots.push(timeSlot);
      }
    }

    return availableTimeSlots;
  } catch (error) {
    console.error('Error getting available time slots for day:', error);
    throw error;
  }
}

/**
 * Validates a reservation request.
 * @param {object} reservationData - The data for the proposed reservation.
 *   Expected: { restaurant_id, booking_date, booking_time, number_of_people, requested_duration, ... }
 * @returns {Promise<{isValid: boolean, message: string, availableTables: Array<object>}>} Validation result.
 */
export async function validateReservation(reservationData) {
  // Basic check for essential reservationData fields
  if (
    !reservationData ||
    !reservationData.restaurant_id ||
    !reservationData.booking_date ||
    !reservationData.booking_time ||
    typeof reservationData.number_of_people === 'undefined' ||
    !reservationData.requested_duration || // Check for requested_duration
    typeof reservationData.requested_duration.hours === 'undefined' ||
    typeof reservationData.requested_duration.minutes === 'undefined'
  ) {
    return {
      isValid: false,
      message:
        'Missing critical reservation data (restaurant ID, date, time, party size, or valid duration).',
      availableTables: [],
    };
  }

  const { restaurant_id, booking_date, booking_time, number_of_people, requested_duration } =
    reservationData;
  let fetchedRestaurantDetails;

  try {
    fetchedRestaurantDetails = await getRestaurantById(restaurant_id);
  } catch (error) {
    console.error(`Failed to fetch restaurant details for ID ${restaurant_id}:`, error);
    return {
      isValid: false,
      message: 'Could not load restaurant information. Please try again later.',
      availableTables: [],
    };
  }

  // Check fetched restaurant details (this replaces the user's selected lines context)
  if (!fetchedRestaurantDetails || !fetchedRestaurantDetails.reservation_duration) {
    console.error('Fetched restaurant details are incomplete or missing reservation_duration.');
    return {
      isValid: false,
      message: 'Restaurant information is incomplete or reservation duration is not configured.',
      availableTables: [],
    };
  }

  // Combine date and time into a Date object
  // Ensure booking_date is in 'YYYY-MM-DD' and booking_time is 'HH:MM'
  const bookingDateTime = new Date(`${booking_date}T${booking_time}:00`);
  if (isNaN(bookingDateTime.getTime())) {
    return { isValid: false, message: 'Invalid date or time format.', availableTables: [] };
  }

  // 1. Check if restaurant is open
  if (!isRestaurantOpen(fetchedRestaurantDetails, bookingDateTime)) {
    // Use fetchedRestaurantDetails
    return {
      isValid: false,
      message: 'Restaurant is closed at the selected time.',
      availableTables: [],
    };
  }

  // 2. Find available tables
  // The duration for the booking is now passed in as reservationData.requested_duration
  // No need to parse restaurantDetails.reservation_duration here for this purpose.
  // We still need restaurantDetails for other parts of findAvailableTables (like its own default duration for existing bookings).

  // Call findAndAssignTable to get a specific table assignment
  const assignedTable = await findAndAssignTable(
    restaurant_id,
    bookingDateTime,
    number_of_people,
    requested_duration,
    fetchedRestaurantDetails
  );

  if (!assignedTable) {
    return {
      isValid: false,
      message: 'No tables available for the selected time, party size, or duration.',
      availableTables: [],
      assignedTable: null,
    };
  }

  return {
    isValid: true,
    message: 'Reservation slot is potentially available.',
    availableTables: [assignedTable],
    assignedTable,
  };
}

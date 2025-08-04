// Get available tables for a restaurant, party size, and time
export async function getAvailableTables(restaurantId, bookingDate, bookingTime, partySize) {
  // 1. Get all tables for the restaurant
  const { data: tables, error: tablesError } = await supabase
    .from('tables')
    .select('*')
    .eq('restaurant_id', restaurantId);
  if (tablesError) throw tablesError;

  // 2. Get all bookings for the restaurant at the given date and time
  // We'll consider a table unavailable if it is booked at the same date and time
  const { data: bookings, error: bookingsError } = await supabase
    .from('bookings')
    .select('table_id, booking_date, booking_time')
    .eq('restaurant_id', restaurantId)
    .eq('booking_date', bookingDate)
    .eq('booking_time', bookingTime);
  if (bookingsError) throw bookingsError;

  const bookedTableIds = new Set(bookings.map(b => b.table_id));

  // 3. Filter tables by capacity and availability
  const available = tables.filter(table => {
    // If table is already booked, skip
    if (bookedTableIds.has(table.id)) return false;
    // If table has a max_capacity, check if it fits the party size
    if (table.max_capacity && partySize > table.max_capacity) return false;
    if (table.min_capacity && partySize < table.min_capacity) return false;
    return true;
  });
  return available;
}
// Fetch a single reservation by its ID
export async function getReservationById(reservationId) {
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('id', reservationId)
    .single();
  if (error) throw error;
  return data;
}
// Update reservation details (time, tables, etc)
export async function updateReservationDetails(reservationId, updateData) {
  // Only allow updating certain fields
  const allowedFields = [
    'booking_date',
    'booking_time',
    'number_of_people',
    'tables',
    'notes',
    'table_id',
    'table_name',
  ];
  const payload = {};
  for (const field of allowedFields) {
    if (Object.prototype.hasOwnProperty.call(updateData, field)) {
      payload[field] = updateData[field];
    }
  }
  const { data, error } = await supabase
    .from('bookings')
    .update(payload)
    .eq('id', reservationId)
    .select();
  if (error) throw error;
  return data[0];
}
import { supabase } from './supabaseClient';
import { signOut, getSessionUser } from './supabaseAuth';

// --- Restaurant Management ---
export async function getOverviewRestaurants() {  
  const { data, error } = await supabase.from('restaurants').select('*');

  if (error) {
    console.error('Error fetching restaurants:', error);
    throw error;
  }
  return data;
}

export async function getOwnedRestaurants(ownerId) {
  const { data, error } = await supabase.from('restaurants').select('*').eq('owner_id', ownerId);
  if (error) {
    console.error('Error fetching owned restaurants:', error);
    throw error;
  }
  return data;
}

export async function getRestaurantBySlug(slug) {
  const { data, error } = await supabase.from('restaurants').select('*').eq('slug', slug).single();

  if (error) {
    console.error('Error fetching restaurant by slug:', error);
    throw error;
  }
  return data;
}

export async function getRestaurantById(id) {
  const { data, error } = await supabase.from('restaurants').select('*').eq('id', id).single();

  if (error) {
    console.error('Error fetching restaurant by ID:', error);
    throw error;
  }

  return data;
}

export async function createRestaurant(restaurantData) {
  // Get current user to add their email to the restaurant
  const { user } = await getSessionUser();

  // Add owner_email to the restaurant data
  const dataWithOwnerEmail = {
    ...restaurantData,
    owner_email: user?.email || null,
  };

  const { data, error } = await supabase.from('restaurants').insert([dataWithOwnerEmail]).select();
  if (error) {
    console.error('Error creating restaurant:', error);
    throw error;
  }
  return data[0];
}

export async function updateRestaurant(id, restaurantData) {
  const payload = {};
  const allowedFields = [
    'name',
    'description',
    'cuisine',
    'address',
    'logo_url',
    'phone_number',
    'monday_open',
    'monday_close',
    'tuesday_open',
    'tuesday_close',
    'wednesday_open',
    'wednesday_close',
    'thursday_open',
    'thursday_close',
    'friday_open',
    'friday_close',
    'saturday_open',
    'saturday_close',
    'sunday_open',
    'sunday_close',
    'reservation_duration',
    'max_party_size',
    'min_party_size',
    'advance_booking_days',
    'min_advance_hours',
    'restaurant_map',
  ];

  for (const field of allowedFields) {
    if (Object.prototype.hasOwnProperty.call(restaurantData, field)) {
      payload[field] = restaurantData[field];
    }
  }

  // If name is part of the data to be updated, also generate/update the slug.
  if (Object.prototype.hasOwnProperty.call(payload, 'name')) {
    payload.slug = generateSlug(payload.name);
  }

  const { data, error } = await supabase.from('restaurants').update(payload).eq('id', id).select();

  if (error) {
    console.error('Error updating restaurant:', error);
    throw error;
  }
  return data[0];
}

// --- Table Management ---
export async function getTables(restaurantId) {
  // Changed from restaurantSlug to restaurantId
  const { data, error } = await supabase
    .from('tables')
    .select('*')
    .eq('restaurant_id', restaurantId); // Changed to restaurant_id
  if (error) throw error;
  return data;
}

export async function addTable(restaurantId, tableData) {
  // Changed from restaurantSlug to restaurantId
  const { data, error } = await supabase
    .from('tables')
    .insert([{ ...tableData, restaurant_id: restaurantId }])
    .select(); // Changed to restaurant_id
  if (error) throw error;
  return data[0];
}

export async function updateTable(tableId, tableData) {
  const { data, error } = await supabase
    .from('tables')
    .update(tableData)
    .eq('id', tableId)
    .select();
  if (error) throw error;
  return data[0];
}

export async function deleteTable(tableId) {
  const { error } = await supabase.from('tables').delete().eq('id', tableId);
  if (error) throw error;
  return { id: tableId, deleted: true };
}

function getLogoFilenameFromUrl(url) {
  const match = url.match(/\/logos\/(.+)$/);
  return match ? match[1] : null;
}

// Delete a restaurant by ID
export async function deleteRestaurant(restaurantId) {

  // First delete all bookings at this restaurant
  const { error: bookingsError } = await supabase
    .from('bookings')
    .delete()
    .eq('restaurant_id', restaurantId);
  if (bookingsError) {
    throw bookingsError;
  }

  // Delete all tables
  const { error: tablesError } = await supabase
    .from('tables')
    .delete()
    .eq('restaurant_id', restaurantId);
  if (tablesError) {
    throw tablesError;
  }

  // Remove logo from storage if logo_url exists and is a Supabase Storage URL
  
  const { data: restaurant, error: restaurantError } = await supabase
    .from('restaurants')
    .select('logo_url')
    .eq('id', restaurantId)
    .single();
  if (restaurantError) {
    throw restaurantError;
  }

  if (restaurant && restaurant.logo_url) {
      const fileName = getLogoFilenameFromUrl(restaurant.logo_url);
      const { error: storageError } = await supabase.storage.from('logos').remove([fileName]);
  }
  const { error } = await supabase.from('restaurants').delete().eq('id', restaurantId);
  if (error) throw error;

  return { id: restaurantId, deleted: true };
}

// --- Reservation Management ---
export async function getReservations(restaurantId) {
  const { data: bookings, error: bookingsError } = await supabase
    .from('bookings')
    .select('*')
    .eq('restaurant_id', restaurantId);

  if (bookingsError) throw bookingsError;

  const { data: tables, error: tablesError } = await supabase
    .from('tables')
    .select('id, name')
    .eq('restaurant_id', restaurantId);

  if (tablesError) throw tablesError;

  const tableMap = tables.reduce((acc, table) => {
    acc[table.id] = table.name;
    return acc;
  }, {});

  const bookingsWithTableNames = bookings.map(booking => ({
    ...booking,
    table_name: booking.table_id ? tableMap[booking.table_id] : null,
  }));

  return bookingsWithTableNames;
}

export async function getDefaultReservationLength(restaurantId) {
  const { data, error } = await supabase
    .from('restaurants')
    .select('reservation_duration')
    .eq('id', restaurantId)
    .single();

  if (error) {
    console.error('Error fetching default reservation length:', error);
    throw error;
  }
  return data.reservation_duration;
}

export async function addReservation(restaurantId, reservationData) {

  // Use current user if signed in, otherwise sign in as guest
  let userId;
  const currentUser = supabase.auth.getUser ? (await supabase.auth.getUser()).data.user : null;
  if (currentUser && currentUser.id) {
    userId = currentUser.id;
  } else {
    // Sign in as guest user
    let guestUser, guestSession;
    try {
      const signInResult = await supabase.auth.signInWithPassword({
        email: 'guest@guest.com',
        password: import.meta.env.VITE_GUEST_PASSWORD,
      });
      guestUser = signInResult.data.user;
      guestSession = signInResult.data.session;
      window.__cachedSession = guestSession;
      window.__cachedUser = guestUser;
      if (!guestUser || !guestUser.id) {
        throw new Error('Guest user is not signed in. Cannot create reservation.');
      }
      userId = guestUser.id;
    } catch (err) {
      console.error('Guest sign-in failed:', err);
      throw new Error('Could not sign in as guest');
    }
  }

  // Add user_id to reservation data
  const dataWithId = {
    ...reservationData,
    user_id: userId,
    restaurant_id: restaurantId,
  };

  // Proceed with insert
  const { data, error } = await supabase.from('bookings').insert([dataWithId]).select();

  if (error) {
    console.error('Insert failed:', error);
    throw error;
  }

  return data[0];
}

export async function updateReservationStatus(reservationId, status) {
  const { data, error } = await supabase
    .from('bookings')
    .update({ status })
    .eq('id', reservationId)
    .select();
  if (error) throw error;
  return data[0];
}

export async function deleteReservation(reservationId) {
  const { error } = await supabase.from('bookings').delete().eq('id', reservationId);
  if (error) throw error;
  return { id: reservationId, deleted: true };
}

// Helper to generate slug
export function generateSlug(name) {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

// Get restaurant owner's email
export async function getRestaurantOwnerEmail(restaurantId) {
  try {
    // Get the restaurant with owner_email
    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .select('owner_email, owner_id')
      .eq('id', restaurantId)
      .single();

    if (restaurantError) {
      console.error('Error fetching restaurant:', restaurantError);
      throw restaurantError;
    }

    if (!restaurant) {
      throw new Error('Restaurant not found');
    }

    // If owner_email is available, use it
    if (restaurant.owner_email) {
      return restaurant.owner_email;
    }

    // Fallback: if current user is the owner, return their email
    const { user } = await getSessionUser();
    if (user && user.id === restaurant.owner_id) {
      return user.email;
    }

    throw new Error('Restaurant owner email not found');
  } catch (error) {
    console.error('Error getting restaurant owner email:', error);
    throw error;
  }
}

// Send reservation confirmation emails
export async function sendReservationConfirmation(reservationData, restaurantData) {
  try {
    // Get restaurant owner's email
    const ownerEmail = await getRestaurantOwnerEmail(restaurantData.id);

    // Prepare email data
    const emailData = {
      customerEmail: reservationData.email,
      restaurantOwnerEmail: ownerEmail,
      customerName: reservationData.name,
      restaurantName: restaurantData.name,
      date: reservationData.booking_date,
      time: reservationData.booking_time,
      partySize: reservationData.number_of_people,
      reservationId: reservationData.id,
      specialNotes: reservationData.notes,
    };

    // Send request to the email server
    const response = await fetch('https://reservely-backend.onrender.com/api/reservation-confirmation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailData),
    });

    if (!response.ok) {
      throw new Error(`Email service responded with status: ${response.status}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error sending reservation confirmation:', error);
    throw error;
  }
}

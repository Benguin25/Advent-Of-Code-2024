# Manual Reservation Entry Feature

This feature allows restaurant owners to manually add reservations for customers who call in, providing flexibility for phone-based bookings.

## Features

### Manual Entry Page

- Dedicated page for manual reservation entry (separate from the main reservations view)
- Accessible via "📞 Manual Entry" button from the "View Reservations" page
- Clean, focused interface for adding phone-based reservations

### Flexible Contact Information

- **Required Fields**: Customer name, date, time, party size
- **Optional Fields**: Email address and phone number
- Allows restaurant owners to book reservations even when customers don't provide all contact details

### Smart Booking Logic

- Uses the same availability checking system as online bookings
- Respects restaurant hours and existing reservations
- Shows real-time availability for selected dates and party sizes
- Allows same-day bookings for manual entries (bypassing advance notice requirements)

### Automatic Current Status

- Manual entries are automatically set to 'current' status
- Sends confirmation emails only if customer email is provided
- Integrates seamlessly with the existing reservation management system

## Simplified Status System

The booking system now uses a simplified two-status approach:

- **Current**: Active reservations (replaces the previous "pending" and "confirmed" statuses)
- **Cancelled**: Cancelled reservations

This eliminates the need for a confirmation workflow and streamlines reservation management.

## How to Use

1. Navigate to the "View Reservations" page from the owner dashboard
2. Click the "📞 Manual Entry" button at the top of the page
3. You'll be taken to a dedicated manual entry page
4. Fill in the customer details (name is required, email/phone optional)
5. Select date, time, and party size
6. Add any special notes if needed
7. Click "Create Manual Reservation"
8. The system will automatically navigate back to the reservations page

## Technical Implementation

- **Component**: `ManualReservationPage.jsx` (replaces the modal-based approach)
- **Styling**: `ManualReservationPage.css`
- **Route**: `/owner/manual-reservation/:restaurantId`
- **Integration**: Button in `ViewReservations.jsx` navigates to the new page
- **Validation**: Uses existing reservation validation system
- **Email**: Conditional email sending based on customer email availability

## Benefits

- Dedicated page provides better user experience than a modal
- Accommodates customers who prefer phone bookings
- Maintains consistent reservation management workflow
- Provides flexibility for last-minute bookings
- Preserves customer privacy (email/phone optional)
- Simplified status system reduces complexity
- Ensures no double-bookings through real-time availability checking

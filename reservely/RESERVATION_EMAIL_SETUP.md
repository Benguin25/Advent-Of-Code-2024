# Reservation Confirmation Email System Setup

## Overview

This system automatically sends confirmation emails when reservations are created. It sends emails to both the customer and restaurant owner with different information and actions.

## Features Implemented

### 1. Email Notifications

- ✅ **Customer Confirmation Email**: Sent immediately after reservation creation
- ✅ **Restaurant Owner Notification**: Sent to restaurant owner when new reservation is received
- ✅ **Professional Email Templates**: HTML formatted emails with restaurant branding
- ✅ **Reservation Details**: Complete reservation information in both emails

### 2. Customer Features

- ✅ **Reservation Management Link**: Customers can view and manage their reservations
- ✅ **Cancellation Option**: Customers can cancel their reservations
- ✅ **Reservation Details Page**: Complete view of reservation information
- ✅ **Status Tracking**: Visual status indicators (pending, confirmed, cancelled)

### 3. Restaurant Owner Features

- ✅ **Instant Notifications**: Immediate email when new reservations are received
- ✅ **Customer Contact Information**: Direct access to customer email and phone
- ✅ **Reservation Management**: Link to dashboard for managing reservations
- ✅ **Special Notes**: View any special requests from customers

## Technical Implementation

### Database Changes

1. **Added owner_email field to restaurants table**
   - Run `migration_add_owner_email.sql` in your Supabase SQL editor
   - This stores the restaurant owner's email for easy access

### API Endpoints

- **POST `/api/reservation-confirmation`**: Sends confirmation emails
- **GET `/api/health`**: Health check endpoint

### New Components

- **ReservationManager**: Customer-facing reservation management page
- **Email Templates**: Professional HTML email templates

## Setup Instructions

### 1. Database Migration

Run the SQL migration in your Supabase SQL editor:

```sql
-- Add owner_email column to restaurants table
ALTER TABLE public.restaurants
ADD COLUMN IF NOT EXISTS owner_email TEXT;

-- Create an index for performance
CREATE INDEX IF NOT EXISTS idx_restaurants_owner_email ON public.restaurants USING btree (owner_email);
```

### 2. Environment Variables

Ensure your `.env` file contains:

```
GMAIL_USER=benprobert25@gmail.com
GMAIL_PASS=wocsmauzcdeqczkb
FRONTEND_URL=http://localhost:5173
```

### 3. Server Setup

Make sure your server is running:

```bash
# Terminal 1 (Backend)
cd server
npm run dev

# Terminal 2 (Frontend)
npm run dev
```

## Email Templates

### Customer Confirmation Email

- 🎉 Celebration header with reservation confirmation
- 📅 Complete reservation details (date, time, party size)
- 🔗 Link to view/modify reservation
- ℹ️ Important information and policies
- 👥 Restaurant contact information

### Restaurant Owner Notification

- 🍽️ Professional header for new reservation
- 👤 Customer contact information
- 📊 Reservation details and status
- 🔗 Link to reservation management dashboard
- 📝 Next steps and actions needed

## URL Structure

### Customer URLs

- `/reservation/{reservationId}` - View and manage reservation
- `/{restaurantSlug}/book` - Make a reservation

### Owner URLs

- `/owner/reservations/{restaurantId}` - Manage all reservations
- `/owner-dashboard` - Restaurant owner dashboard

## Testing the System

### 1. Create a Test Reservation

1. Navigate to a restaurant booking page
2. Fill out the reservation form
3. Submit the reservation
4. Check both email addresses for confirmation emails

### 2. Test Reservation Management

1. Click the "View or Modify Reservation" link in the customer email
2. Verify reservation details are displayed correctly
3. Test the cancellation functionality

### 3. Test Owner Dashboard

1. Click the "Manage Reservations" link in the owner email
2. Verify the reservation appears in the owner dashboard
3. Test status updates and management features

## Email Content Examples

### Customer Email Subject

"Reservation Confirmed - [Restaurant Name]"

### Owner Email Subject

"New Reservation - [Restaurant Name]"

## Error Handling

- ✅ Graceful handling of email sending failures
- ✅ Reservation creation continues even if emails fail
- ✅ Clear error messages for troubleshooting
- ✅ Console logging for debugging

## Security Features

- ✅ No authentication required for viewing reservation (uses unique ID)
- ✅ Reservation IDs are UUIDs (not guessable)
- ✅ Email validation on both frontend and backend
- ✅ Rate limiting on email endpoints

## Future Enhancements

- [ ] SMS notifications option
- [ ] Email templates customization by restaurant
- [ ] Automated reminder emails
- [ ] Calendar integration
- [ ] Reservation modification (not just cancellation)
- [ ] Bulk reservation management

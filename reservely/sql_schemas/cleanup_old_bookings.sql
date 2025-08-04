-- Delete all bookings over two weeks old
DELETE FROM bookings
WHERE booking_date < (CURRENT_DATE - INTERVAL '14 days');

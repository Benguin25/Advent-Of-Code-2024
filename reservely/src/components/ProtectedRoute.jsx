import React, { useState, useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient'; // Using supabase client directly for session
import { getSessionUser } from '../lib/supabaseAuth';

export default function ProtectedRoute() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const { session: currentSession } = await getSessionUser();
        setSession(currentSession);
      } catch (error) {
        console.error('Error fetching session:', error);
      }
      setLoading(false);
    };

    fetchSession();

    // Listen for auth state changes
    const { data: authListenerData } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      // If loading was true and we get a session, it might mean the initial fetchSession missed it
      // or an event occurred quickly. Ensure loading is false.
      if (loading && newSession) {
        setLoading(false);
      }
    });

    return () => {
      // The unsubscribe function is on the subscription object within the data returned by onAuthStateChange
      authListenerData?.subscription?.unsubscribe();
    };
  }, [loading]); // Added loading to dependency array to re-evaluate if it was true

  if (loading) {
    return <div>Loading...</div>; // Or a spinner component
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (session.user.email === 'guest@guest.com') {
    return <Navigate to="/login" replace />;
  }

  // Optional: Check for email verification if needed for specific routes
  // if (!session.user.email_confirmed_at) {
  //   // Redirect to a page that tells them to verify email, or back to login with a message
  //   return <Navigate to="/login?message=verify_email" replace />;
  // }

  return <Outlet />; // Renders the child route's element
}

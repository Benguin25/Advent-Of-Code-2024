import { supabase } from './supabaseClient';
// Central session manager
let cachedSession = null;
let cachedUser = null;

function isSessionValid(session) {
  if (!session || !session.expires_at) return false;
  return session.expires_at * 1000 > Date.now();
}

export async function getSessionUser() {
  // Try to use cached session/user
  if (isSessionValid(cachedSession) && cachedUser) {
    return { user: cachedUser, session: cachedSession };
  }
  // Get session from supabase
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  cachedSession = sessionData.session;
  // Get user from supabase
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  cachedUser = userData.user;
  return { user: cachedUser, session: cachedSession };
}

// Sign up a new user with email and password
export async function signUp(email, password) {
  const { user, session, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  return { user, session };
}

// Sign in an existing user with email and password
export async function signIn(email, password) {
  const { user, session, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    console.error('Supabase signIn error:', error);
    throw error;
  }
  return { user, session };
}

// Sign out the current user
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  cachedSession = null;
  cachedUser = null;
  if (error) throw error;
}

// Get the current logged-in user (or null)
export async function getUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error) {
    console.error('Error fetching user:', error);
    return null;
  }
  return user;
}

// Listen for auth state changes
export function onAuthStateChange(callback) {
  return supabase.auth.onAuthStateChange(callback);
}

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import ReservelyLogoIcon from '../assets/images/ReservelyLogoIcon.png';

export default function BusinessLayout({ children }) {
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const fetchSession = async () => {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();
      if (error) {
        console.error('Error fetching session:', error);
        return;
      }
      setCurrentUser(session?.user || null);
    };

    fetchSession();

    const { data: authListenerData } = supabase.auth.onAuthStateChange((event, session) => {
      setCurrentUser(session?.user || null);
    });

    return () => {
      authListenerData?.subscription?.unsubscribe();
    };
  }, []);

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <Link to="/for-businesses" className="logo" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
            <img src={ReservelyLogoIcon} alt="Reservely Logo Icon" style={{ height: 36, width: 36, objectFit: 'contain', marginRight: 4 }} />
            <span>Reservely for Businesses</span>
          </Link>
          <nav className="nav-menu">
            <Link to="/for-businesses/about" className="nav-link">
              About
            </Link>
            <Link to="/for-businesses/contact" className="nav-link">
              Contact
            </Link>
            <Link to="/for-businesses/faqs" className="nav-link">
              FAQs
            </Link>
            <Link to="/for-businesses/pricing" className="nav-link">
              Pricing
            </Link>
            {currentUser ? (
              <Link to="/owner-dashboard" className="nav-link btn-link-style btn-logout-text">
                Dashboard
              </Link>
            ) : (
              <Link to="/login" className="nav-link btn-link-style btn-logout-text">
                Login
              </Link>
            )}
            <Link to="/" className="nav-link customer-view-btn">
              ← Customer View
            </Link>
          </nav>
        </div>
      </header>

      <main className="main">{children}</main>

      <footer className="footer">
        <div className="container">
          <p>&copy; 2025 Reservely. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

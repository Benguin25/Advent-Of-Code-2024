import React from 'react';
import { Link } from 'react-router-dom';
import ReservelyLogoIcon from '../assets/images/ReservelyLogoIcon.png';

export default function CustomerLayout({ children }) {
  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <Link to="/" className="logo" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
            <img src={ReservelyLogoIcon} alt="Reservely Logo Icon" style={{ height: 36, width: 36, objectFit: 'contain', marginRight: 4 }} />
            <span>Reservely</span>
          </Link>
          <nav className="nav-menu">
            <Link to="/for-businesses" className="nav-link btn-link-style btn-logout-text">
              For Businesses
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

import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function ForBusinesses() {
  const navigate = useNavigate();

  return (
    <div className="business-page-container">
      <div className="hero business-hero" style={{ marginBottom: 0 }}>
        <div className="business-hero-content">
          <h1>Reservely for Businesses</h1>
          <p className="tagline" style={{ marginTop: '1em', marginBottom: 0 }}>
            Affordable reservation booking and management system for small businesses.<br />
            <a href="/login" style={{ color: '#007bff', textDecoration: 'underline' }}>Create your restaurant now</a> for completely free, no credit card required.<br />
            <a href="/for-businesses/contact" style={{ color: '#007bff', textDecoration: 'underline' }}>Contact us</a> to book a personalized demo or to ask any questions—our team is happy to help.
          </p>
        </div>
      </div>
      <div className="content-section business-content" style={{ marginTop: 0 }}>
        <section className="features-section">
          <h2>Why Choose Reservely?</h2>
          <div className="features-grid">
            <div className="feature-card">
              <h3>💰 Affordable Pricing</h3>
              <p>
                No per-reservation fees. One simple monthly price that grows with your business.
              </p>
            </div>
            <div className="feature-card">
              <h3>⚡ Easy Setup</h3>
              <p>Get up and running in minutes. No technical expertise required.</p>
            </div>
            <div className="feature-card">
              <h3>📱 Mobile Friendly</h3>
              <p>Manage reservations from anywhere with our mobile-optimized dashboard.</p>
            </div>
            <div className="feature-card">
              <h3>🔧 Simple Management</h3>
              <p>Intuitive interface designed for busy restaurant staff.</p>
            </div>
          </div>
        </section>

        <section className="cta-section">
          <h2>Ready to Get Started?</h2>
          <p>Join hundreds of restaurants already using Reservely to manage their reservations.</p>
          <button className="btn btn-primary btn-large" onClick={() => navigate('/login')}>
            Start Your Free Trial
          </button>
        </section>
      </div>
    </div>
  );
}

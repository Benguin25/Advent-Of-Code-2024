import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function Pricing() {
  const navigate = useNavigate();

  return (
    <div className="page-container">
      <div className="content-section">
        <h1>Simple, Transparent Pricing</h1>
        <p className="pricing-subtitle">
          No hidden fees, no per-reservation charges. Just one simple monthly price.
        </p>

        <div className="pricing-grid">
          <div className="pricing-card featured single-plan">
            <h3>Reservely</h3>
            <div className="price">
              <span className="currency">$</span>
              <span className="amount">50</span>
              <span className="period">/month</span>
            </div>
            <ul className="features-list">
              <li>Unlimited reservations</li>
              <li>Table management</li>
              <li>Email confirmations</li>
              <li>Customer database & history</li>
              <li>Mobile-friendly dashboard</li>
              <li>Regular updates</li>
            </ul>
            <button
              className="btn btn-primary"
              onClick={() => navigate('/login')}
              style={{ padding: '10px 20px', width: 'auto', maxWidth: '200px' }}
            >
              Start Free Trial
            </button>
          </div>
        </div>

        <div className="pricing-features">
          <h2>What's Included</h2>
          <div className="included-features">
            <div className="feature-row">
              <span className="checkmark">✓</span>
              <span>14-day free trial</span>
            </div>
            <div className="feature-row">
              <span className="checkmark">✓</span>
              <span>No setup fees</span>
            </div>
            <div className="feature-row">
              <span className="checkmark">✓</span>
              <span>Cancel anytime</span>
            </div>
            <div className="feature-row">
              <span className="checkmark">✓</span>
              <span>No per-reservation charges</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

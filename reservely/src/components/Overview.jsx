import React from 'react';
import { Analytics } from "@vercel/analytics/next";

export default function Overview() {
  return (
    <div className="page-container">
      <div className="content-section">
        <h1>What is Reservely?</h1>

        <div className="overview-content">
          <section className="intro-section">
            <h2>Simple Reservation Management</h2>
            <p>
              Reservely is a comprehensive reservation management system designed specifically for
              small restaurants and food service businesses. We provide an easy-to-use platform that
              helps you manage bookings, track customer preferences, and optimize your table
              turnover.
            </p>
          </section>

          <section className="what-we-do-section">
            <h2>What We Do</h2>
            <div className="features-list">
              <div className="feature-item">
                <h3>🗓️ Reservation Management</h3>
                <p>Accept, modify, and track reservations from a single dashboard</p>
              </div>
              <div className="feature-item">
                <h3>📊 Table Management</h3>
                <p>Optimize your seating arrangements and maximize capacity</p>
              </div>
              <div className="feature-item">
                <h3>👥 Customer Database</h3>
                <p>Keep track of customer preferences and dining history</p>
              </div>
              <div className="feature-item">
                <h3>📧 Automated Communications</h3>
                <p>Send confirmation emails and reminders automatically</p>
              </div>
              <div className="feature-item">
                <h3>📱 Online Booking</h3>
                <p>Let customers book tables directly from your website</p>
              </div>
              <div className="feature-item">
                <h3>📈 Analytics & Reporting</h3>
                <p>Track booking trends and restaurant performance</p>
              </div>
            </div>
          </section>

          <section className="how-it-works-section">
            <h2>How It Works</h2>
            <div className="steps-grid">
              <div className="step-item">
                <div className="step-number">1</div>
                <h3>Sign Up</h3>
                <p>Create your restaurant profile and customize your settings</p>
              </div>
              <div className="step-item">
                <div className="step-number">2</div>
                <h3>Set Up Tables</h3>
                <p>Configure your seating layout and availability</p>
              </div>
              <div className="step-item">
                <div className="step-number">3</div>
                <h3>Start Taking Reservations</h3>
                <p>Accept bookings online or add them manually</p>
              </div>
              <div className="step-item">
                <div className="step-number">4</div>
                <h3>Manage & Optimize</h3>
                <p>Use our dashboard to manage reservations and optimize operations</p>
              </div>
            </div>
          </section>

          <section className="target-section">
            <h2>Built for Small Businesses</h2>
            <p>
              Unlike expensive enterprise solutions, Reservely is designed specifically for small to
              medium-sized restaurants. We understand your budget constraints and operational needs,
              which is why we offer transparent pricing and features that actually matter to your
              business.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

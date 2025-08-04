import React from 'react';

export default function FAQs() {
  return (
    <div className="page-container">
      <div className="content-section">
        <h1>Frequently Asked Questions</h1>
        <div className="faq-content">
          <div className="faq-item">
            <h2>What is Reservely?</h2>
            <p>
              Reservely is an affordable reservation management system designed specifically for
              small businesses. We provide easy-to-use tools to manage bookings and enhance your
              customers' experience.
            </p>
          </div>

          <div className="faq-item">
            <h2>Why Reservely instead of OpenTable?</h2>
            <p>
              Unlike OpenTable and other major platforms that charge high fees per reservation,
              Reservely offers a more affordable solution specifically designed for small
              restaurants. We don't take a cut of each booking, have no cover fees, and provide
              personalized customer support. Our platform is simpler to use while still giving you
              all the essential features you need to manage reservations effectively.
            </p>
          </div>

          <div className="faq-item">
            <h2>How do I get started?</h2>
            <p>
              We believe in providing personalized service from day one. To get started with Reservely, simply reach out to our team directly. We'll work with you one-on-one to set up your account, configure your restaurant's specific needs, and get you started with your free trial. This hands-on approach ensures you're fully comfortable with the platform before you begin accepting reservations.
            </p>
          </div>

          <div className="faq-coming-soon">
            <p>
              <em>More FAQs coming soon...</em>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

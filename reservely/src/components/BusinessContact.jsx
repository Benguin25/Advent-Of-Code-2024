import React from 'react';
import ContactForm from './ContactForm';

export default function BusinessContact() {
  return (
    <div className="business-page-container">
      <div className="content-section">
        <h1>Contact Us</h1>
        <div className="contact-message-section">
          <div className="contact-message">
            <div className="contact-header">
              <h2>Get in Touch</h2>
              <p className="intro-text">
                We'd love to hear from you! Whether you have questions about our reservation system,
                need help getting started, or want to learn more about how{' '}
                <span className="brand-highlight">Reservely</span> can benefit your restaurant,
                we're here to help.
              </p>
            </div>
            <ContactForm />
          </div>
        </div>
      </div>
    </div>
  );
}

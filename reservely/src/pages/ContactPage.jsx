import React from 'react';
import ContactForm from '../components/ContactForm';

export default function ContactPage() {
  return (
    <div className="contact-page-container">
      <div className="hero business-hero" style={{ marginBottom: 0 }}>
        <div className="business-hero-content">
          <h1>Contact Reservely</h1>
          <p className="tagline" style={{ marginTop: '1em', marginBottom: 0 }}>
            Fill out the form below and our team will get back to you as soon as possible.
          </p>
        </div>
      </div>
      <ContactForm />
    </div>
  );
}

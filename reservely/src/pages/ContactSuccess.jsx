
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function ContactSuccess() {
  const navigate = useNavigate();

  useEffect(() => {
    window.gtag?.('event', 'conversion', {
      send_to: 'AW-17412776758/_wSdCKP1yPsaELbGh-9A',
      value: 1.0,
      currency: 'CAD'
    });
  }, []);

  return (
    <div className="contact-success-page" style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
      <h1 style={{ color: '#22c55e', fontSize: 36, marginBottom: 16 }}>Thank you for contacting us!</h1>
      <p style={{ fontSize: 20, marginBottom: 8 }}>Our team will be in contact shortly.</p>
      <p style={{ fontSize: 18, marginBottom: 24 }}>If your request is urgent, please call us at <strong>(437) 982-5665</strong>.</p>
      <button
        onClick={() => navigate('/for-businesses')}
        style={{ fontWeight: 700, fontSize: 18, padding: '0.7em 2.2em', borderRadius: 8, background: 'linear-gradient(90deg,#3b82f6,#a78bfa)', color: '#fff', border: 'none', boxShadow: '0 2px 12px #3b82f633', cursor: 'pointer', marginTop: 8 }}
      >
        Return to Home
      </button>
    </div>
  );
}

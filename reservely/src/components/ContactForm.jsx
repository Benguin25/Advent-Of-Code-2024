import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function ContactForm() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [status, setStatus] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('Sending...');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setForm({ name: '', email: '', subject: '', message: '' });
        navigate('/for-businesses/contact-success');
      } else {
        setStatus('Failed to send. Please try again later.');
      }
    } catch {
      setStatus('Failed to send. Please try again later.');
    }
  };

  return (
    <div style={{ maxWidth: 700, margin: '2em auto', background: 'rgba(20,30,50,0.95)', borderRadius: 16, boxShadow: '0 4px 24px #0002', padding: '2.5em 2em' }}>
      <h2 style={{ color: '#e0e8ff', marginBottom: 8 }}>Contact Us</h2>
      <div style={{ color: '#b0b8c9', fontSize: 16, marginBottom: 18, fontWeight: 500 }}>
        Reach out to book a personalized demo or for any questions about Reservely—our team is happy to help!
      </div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 6 }}>
          <span style={{ fontSize: 22, color: '#7ecfff' }}>📧</span>
          <span style={{ color: '#fff', fontWeight: 500 }}>support@reservely.ca</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 22, color: '#7ecfff' }}>📞</span>
          <span style={{ color: '#fff', fontWeight: 500 }}>(437) 982-5665</span>
        </div>
        <div style={{ color: '#b0b8c9', fontSize: 14, marginTop: 6 }}>You can reach us by email, phone, or the form below.</div>
      </div>
      <form className="contact-form" onSubmit={handleSubmit} autoComplete="off" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <label htmlFor="contact-name" style={{ color: '#b0b8c9', fontWeight: 500, marginBottom: 4 }}>Name</label>
            <input id="contact-name" type="text" name="name" value={form.name} onChange={handleChange} required style={inputStyle} />
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <label htmlFor="contact-email" style={{ color: '#b0b8c9', fontWeight: 500, marginBottom: 4 }}>Email</label>
            <input id="contact-email" type="email" name="email" value={form.email} onChange={handleChange} required style={inputStyle} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <label htmlFor="contact-subject" style={{ color: '#b0b8c9', fontWeight: 500, marginBottom: 4 }}>Subject</label>
            <input id="contact-subject" type="text" name="subject" value={form.subject} onChange={handleChange} required style={inputStyle} />
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <label htmlFor="contact-message" style={{ color: '#b0b8c9', fontWeight: 500, marginBottom: 4 }}>Message</label>
          <textarea id="contact-message" name="message" value={form.message} onChange={handleChange} required rows={5} style={{ ...inputStyle, resize: 'vertical', minHeight: 90 }} />
        </div>
        <button type="submit" className="btn btn-primary" style={{ fontWeight: 700, fontSize: 18, padding: '0.7em 2.2em', borderRadius: 8, background: 'linear-gradient(90deg,#3b82f6,#a78bfa)', color: '#fff', border: 'none', boxShadow: '0 2px 12px #3b82f633', cursor: 'pointer', marginTop: 8 }}>SEND</button>
        {status && <div className="form-status" style={{ marginTop: '1em', color: status.startsWith('Message sent') ? '#4ade80' : '#f87171', fontWeight: 500 }}>{status}</div>}
      </form>
    </div>
  );
}

const inputStyle = {
  padding: '0.7em 1em',
  borderRadius: 6,
  border: '1px solid #334155',
  background: '#1e293b',
  color: '#e0e8ff',
  fontSize: 16,
  outline: 'none',
  marginBottom: 0,
  fontWeight: 500,
  boxSizing: 'border-box',
};

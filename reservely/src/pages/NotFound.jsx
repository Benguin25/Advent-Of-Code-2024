import React from "react";
import ReservelyLogoIcon from '../assets/images/ReservelyLogoIcon.png';
import { useNavigate } from "react-router-dom";
import "../index.css";

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      background: "var(--primary-bg)",
      color: "var(--text-primary)",
      textAlign: "center"
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <img src={ReservelyLogoIcon} alt="Reservely Logo" style={{ height: 40, width: 40, objectFit: 'contain', marginRight: 4 }} />
        <span style={{
          fontSize: 40,
          fontWeight: 700,
          background: "var(--accent-gradient)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text"
        }}>Reservely</span>
      </div>
      <h1 style={{ fontSize: 64, margin: 0 }}>404</h1>
      <p style={{ color: "var(--text-secondary)", fontSize: 20, marginBottom: 32 }}>
        Oops! The page you are looking for does not exist.
      </p>
      <button
        onClick={() => navigate("/")}
        className="btn-primary"
        style={{ fontSize: 18, padding: "12px 32px", marginTop: 8 }}
      >
        Return to Home
      </button>
    </div>
  );
}

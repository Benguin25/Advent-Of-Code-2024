<div className="team-member"></div>;
import BPImage from '../assets/images/ben.jpg';
import NPImage from '../assets/images/nate.png';

export default function About() {
  return (
    <div className="page-container">
      <div className="content-section">
        {' '}
        <h1>About the Creators</h1>
        <div className="about-content">
          <section className="story-section">
            <h2>Our Story</h2>
            <p>
              Founded in 2025, Reservely emerged from a simple observation: small businesses needed
              a better, more affordable way to manage their reservations. We're dedicated to helping
              small restaurants succeed through innovative technology and entrepreneurship.
            </p>
          </section>

          <section className="mission-section">
            <h2>Our Mission</h2>
            <p>
              We believe that every business deserves access to powerful reservation tools. Our
              mission is to democratize access to reservation technology by providing affordable,
              user-friendly solutions specifically designed for small businesses.
            </p>
          </section>

          <section className="team-section">
            <h2>Meet the Team</h2>
            <div className="team-grid">
              <a
                className="team-member"
                href="https://www.linkedin.com/in/benjamin-probert/"
                target="_blank"
                rel="noopener noreferrer"
                style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
              >
                <div className="member-photo">
                  <img
                    src={BPImage}
                    alt="Benjamin Probert"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                  />
                </div>
                <h3>Benjamin Probert</h3>
                <p>CEO & Head of Product</p>
                <p style={{color: 'var(--accent-purple)', fontSize: '0.9rem', margin: '4px 0 0 0'}}>benjaminprobert@reservely.ca</p>
                <p style={{textDecoration: 'underline', color: 'var(--accent-blue)', fontSize: '0.9rem', margin: '4px 0 0 0'}}>LinkedIn</p>
              </a>
              <a
                className="team-member"
                href="https://www.linkedin.com/in/nathanprobert/"
                target="_blank"
                rel="noopener noreferrer"
                style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
              >
                <div className="member-photo">
                  <img
                    src={NPImage}
                    alt="Nathan Probert"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                  />
                </div>
                <h3>Nathan Probert</h3>
                <p>Software Developer</p>
                <p style={{color: 'var(--accent-purple)', fontSize: '0.9rem', margin: '4px 0 0 0'}}>nathanprobert@reservely.ca</p>
                <p style={{textDecoration: 'underline', color: 'var(--accent-blue)', fontSize: '0.9rem', margin: '4px 0 0 0'}}>LinkedIn</p>
              </a>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

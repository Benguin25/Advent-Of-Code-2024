import React, { useState } from 'react';

export default function BusinessFAQs() {
  const [openFAQ, setOpenFAQ] = useState(null);

  const toggleFAQ = index => {
    setOpenFAQ(openFAQ === index ? null : index);
  };

  const faqs = [
    {
      category: 'Getting Started',
      questions: [
        {
          question: 'How do I get started with Reservely?',
          answer:
            'We believe in providing personalized service from day one. To get started with Reservely, simply reach out to our team directly. We\'ll work with you one-on-one to set up your account, configure your restaurant\'s specific needs, and get you started with your free trial. This hands-on approach ensures you\'re fully comfortable with the platform before you begin accepting reservations.',
        },
        {
          question: "What's included in the free trial?",
          answer:
            'Our free trial gives you complete access to the full Reservely experience. Everything is included - no feature restrictions, no hidden limitations. You\'ll have access to our reservation management system, customer booking portal, email notifications, manual booking capabilities, and all the tools you need to run your restaurant efficiently. It\'s a true taste of what your restaurant can achieve with Reservely.',
        },
        {
          question: 'Can customers book online?',
          answer:
            'Absolutely! Every restaurant using Reservely gets their own custom booking page that integrates seamlessly with your website or social media. Customers can view real-time availability, select their preferred time slots, and book tables instantly - 24 hours a day, 7 days a week. This means you never miss a reservation opportunity, even when you\'re busy running your restaurant.',
        },
      ],
    },
  ];

  return (
    <div className="page-container">
      <div className="content-section">
        <h1>Frequently Asked Questions</h1>
        <p className="faq-subtitle">
          Find answers to common questions about Reservely for restaurants and small businesses.
        </p>

        <div className="faq-content">
          {faqs.map((category, categoryIndex) => (
            <section key={categoryIndex} className="faq-category">
              <h2>{category.category}</h2>
              <div className="faq-list">
                {category.questions.map((faq, questionIndex) => {
                  const globalIndex = categoryIndex * 100 + questionIndex;
                  return (
                    <div key={globalIndex} className="faq-item">
                      <button
                        className={`faq-question ${openFAQ === globalIndex ? 'active' : ''}`}
                        onClick={() => toggleFAQ(globalIndex)}
                      >
                        {faq.question}
                        <span className="faq-toggle">{openFAQ === globalIndex ? '−' : '+'}</span>
                      </button>
                      {openFAQ === globalIndex && (
                        <div className="faq-answer">
                          <p>{faq.answer}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        <section className="faq-footer">
          <p>
            <em>More FAQs coming soon...</em>
          </p>
        </section>
      </div>
    </div>
  );
}

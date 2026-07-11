import React from 'react';

export default function SDGBanner() {
  return (
    <div className="sdg-banner">
      <div className="sdg-banner-title">United Nations Sustainable Development Goals Alignment</div>
      <div className="sdg-cards">
        <div className="sdg-card sdg-card-4">
          <div className="sdg-card-number">SDG 4</div>
          <div className="sdg-card-label">Quality Education</div>
        </div>
        <div className="sdg-card sdg-card-8">
          <div className="sdg-card-number">SDG 8</div>
          <div className="sdg-card-label">Decent Work &amp; Economic Growth</div>
        </div>
        <div className="sdg-card sdg-card-10">
          <div className="sdg-card-number">SDG 10</div>
          <div className="sdg-card-label">Reduced Inequalities</div>
        </div>
      </div>
      <p style={{ marginTop: '16px', fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>
        This platform democratizes access to career development tools, professional coaching, and interview preparation — empowering students regardless of their background.
      </p>
    </div>
  );
}

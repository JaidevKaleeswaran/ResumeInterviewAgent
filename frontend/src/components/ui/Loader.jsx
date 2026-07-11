import React from 'react';

/**
 * Loading skeleton and dot loader components.
 */
export function Skeleton({ lines = 3 }) {
  return (
    <div>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="skeleton skeleton-line" />
      ))}
    </div>
  );
}

export function LoaderDots() {
  return (
    <div className="loader-dots">
      <div className="loader-dot" />
      <div className="loader-dot" />
      <div className="loader-dot" />
    </div>
  );
}

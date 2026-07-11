import React from 'react';

/**
 * Animated circular score ring with SVG.
 */
export default function ScoreRing({ score, size = 140, strokeWidth = 8, label = 'Score' }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (score / 100) * circumference;

  // Color based on score
  const getColor = () => {
    if (score >= 70) return '#1d4ed8'; // deep blue
    if (score >= 40) return '#3b82f6'; // medium blue
    return '#60a5fa'; // light blue
  };

  return (
    <div className="score-ring-container" style={{ width: size, height: size }}>
      <svg className="score-ring-svg" width={size} height={size}>
        <circle
          className="score-ring-bg"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
        />
        <circle
          className="score-ring-fill"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          stroke={getColor()}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="score-ring-text">
        <span className="score-ring-value" style={{ color: getColor() }}>
          {score}
        </span>
        <span className="score-ring-label">{label}</span>
      </div>
    </div>
  );
}

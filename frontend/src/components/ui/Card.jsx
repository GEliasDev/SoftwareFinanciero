import React from 'react';

export const Card = ({ title, children, className = '', headerActions }) => {
  return (
    <div className={`card ${className}`}>
      {(title || headerActions) && (
        <div className="card-header">
          {title && <h3 className="card-title">{title}</h3>}
          {headerActions && <div>{headerActions}</div>}
        </div>
      )}
      <div className="card-body">
        {children}
      </div>
    </div>
  );
};

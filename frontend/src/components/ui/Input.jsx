import React from 'react';

export const Input = ({ label, id, className = '', ...props }) => {
  return (
    <div className={`form-group ${className}`}>
      {label && <label htmlFor={id} className="form-label">{label}</label>}
      <input id={id} className="form-input" {...props} />
    </div>
  );
};

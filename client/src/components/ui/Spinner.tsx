import React from 'react';
import './Spinner.css';

interface SpinnerProps {
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

const Spinner: React.FC<SpinnerProps> = ({ size = 'medium', className = '' }) => {
  return (
    <div className={`spinner spinner-${size} ${className}`}>
      <div className="spinner-circle"></div>
    </div>
  );
};

export default Spinner;
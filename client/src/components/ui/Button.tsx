import React from 'react';

interface ButtonProps {
  children: React.ReactNode;
  type?: 'button' | 'submit' | 'reset';
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  onClick?: () => void;
}

const Button: React.FC<ButtonProps> = ({
  children,
  type = 'button',
  variant = 'primary',
  disabled = false,
  onClick
}) => {
  const baseStyle = {
    padding: '0.75rem 1.5rem',
    border: 'none',
    borderRadius: '4px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.6 : 1,
    fontSize: '0.875rem',
    fontWeight: 500
  };

  const variants = {
    primary: {
      background: '#667eea',
      color: 'white'
    },
    secondary: {
      background: '#e2e8f0',
      color: '#4a5568'
    },
    danger: {
      background: '#e53e3e',
      color: 'white'
    }
  };

  const style = { ...baseStyle, ...variants[variant] };

  return (
    <button
      type={type}
      style={style}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
};

export default Button;
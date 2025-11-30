import React from 'react';

interface InputProps {
  type: string;
  placeholder?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  name?: string;
  required?: boolean;
}

const Input: React.FC<InputProps> = ({
  type,
  placeholder,
  value,
  onChange,
  name,
  required = false
}) => {
  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      name={name}
      required={required}
      style={{
        width: '100%',
        padding: '0.75rem',
        border: '1px solid #cbd5e0',
        borderRadius: '4px',
        fontSize: '1rem'
      }}
    />
  );
};

export default Input;
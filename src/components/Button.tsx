import type { ButtonHTMLAttributes } from 'react';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'quiet' };

export function Button({ variant = 'primary', className = '', type = 'button', ...props }: Props) {
  return <button type={type} className={`button ${variant} ${className}`} {...props} />;
}

import type { HTMLAttributes } from 'react';
import './Card.css';

export function Card({ className, ...rest }: HTMLAttributes<HTMLElement>) {
  return <section className={['card', className].filter(Boolean).join(' ')} {...rest} />;
}

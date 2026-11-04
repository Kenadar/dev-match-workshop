import type { InputHTMLAttributes } from 'react';
import styles from './Form.module.css';

/**
 * A labelled input with its validation message, addressable by role and name in tests.
 * The message sits outside the <label> so it never becomes part of the field's accessible name.
 */
export function Field({ id, label, error, ...input }: { id: string; label: string; error?: string } & InputHTMLAttributes<HTMLInputElement>) {
  const errorId = `${id}-error`;
  return (
    <div className={styles.field}>
      <label htmlFor={id}>{label}</label>
      <input id={id} {...input} aria-invalid={error ? true : undefined} aria-describedby={error ? errorId : undefined} />
      {error && (
        <p id={errorId} className={styles.error}>
          {error}
        </p>
      )}
    </div>
  );
}

import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { updateProfileSchema } from '@devmatch/shared';
import { Field } from '../forms/Field.js';
import styles from '../forms/Form.module.css';
import { fieldErrors } from '../forms/fieldErrors.js';
import { useMe, useUpdateProfile } from '../queries/auth.js';

// US-01: the Telegram contact. sc.2 / sc.3 are blocked here with the shared schema and checked again by the API.

export function OnboardingPage() {
  const me = useMe();
  const [telegram, setTelegram] = useState<string | null>(null);
  const [error, setError] = useState<string>();
  const update = useUpdateProfile();
  const navigate = useNavigate();
  const value = telegram ?? me.data?.telegram ?? '';

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const invalid = fieldErrors(updateProfileSchema, { telegram: value });
    setError(invalid?.telegram);
    if (invalid) return;
    // sc.1: saved → the project management panel
    update.mutate({ telegram: value }, { onSuccess: () => navigate('/my/projects', { replace: true }) });
  }

  return (
    <section>
      <h1>Telegram contact</h1>
      <p className="muted">Candidates you approve will contact you there.</p>
      <form className={styles.form} onSubmit={onSubmit} noValidate>
        <Field id="telegram" label="Telegram username" placeholder="@your_username" value={value}
          error={error ?? update.error?.message} onChange={(e) => setTelegram(e.target.value)} />
        <button className={styles.submit} type="submit" disabled={update.isPending}>Save</button>
      </form>
    </section>
  );
}

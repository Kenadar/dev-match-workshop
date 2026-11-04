import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { loginSchema, registerSchema } from '@devmatch/shared';
import { Field } from '../forms/Field.js';
import styles from '../forms/Form.module.css';
import { fieldErrors } from '../forms/fieldErrors.js';
import { pathAfterSignIn, useLogin, useRegister } from '../queries/auth.js';

// ADR-0006: sign in / register. After success, pathAfterSignIn sends users without Telegram to /onboarding (US-01).

export function LoginPage() {
  const [values, setValues] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string> | null>(null);
  const login = useLogin();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const invalid = fieldErrors(loginSchema, values);
    setErrors(invalid);
    if (invalid) return;
    login.mutate(values, { onSuccess: (user) => navigate(pathAfterSignIn(user, params.get('next')), { replace: true }) });
  }

  return (
    <section>
      <h1>Sign in</h1>
      <form className={styles.form} onSubmit={onSubmit} noValidate>
        <Field id="email" label="Email" type="email" autoComplete="email" value={values.email} error={errors?.email}
          onChange={(e) => setValues({ ...values, email: e.target.value })} />
        <Field id="password" label="Password" type="password" autoComplete="current-password" value={values.password}
          error={errors?.password} onChange={(e) => setValues({ ...values, password: e.target.value })} />
        {login.error && <p role="alert" className={styles.error}>{login.error.message}</p>}
        <button className={styles.submit} type="submit" disabled={login.isPending}>Sign in</button>
      </form>
      <p className="muted">
        No account yet? <Link to={`/register${params.size ? `?${params}` : ''}`}>Register</Link>
      </p>
    </section>
  );
}

export function RegisterPage() {
  const [values, setValues] = useState({ displayName: '', email: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string> | null>(null);
  const register = useRegister();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const invalid = fieldErrors(registerSchema, values);
    setErrors(invalid);
    if (invalid) return;
    register.mutate(values, { onSuccess: (user) => navigate(pathAfterSignIn(user, params.get('next')), { replace: true }) });
  }

  return (
    <section>
      <h1>Register</h1>
      <form className={styles.form} onSubmit={onSubmit} noValidate>
        <Field id="displayName" label="Name" autoComplete="name" value={values.displayName} error={errors?.displayName}
          onChange={(e) => setValues({ ...values, displayName: e.target.value })} />
        <Field id="email" label="Email" type="email" autoComplete="email" value={values.email} error={errors?.email}
          onChange={(e) => setValues({ ...values, email: e.target.value })} />
        <Field id="password" label="Password" type="password" autoComplete="new-password" value={values.password}
          error={errors?.password} onChange={(e) => setValues({ ...values, password: e.target.value })} />
        {register.error && <p role="alert" className={styles.error}>{register.error.message}</p>}
        <button className={styles.submit} type="submit" disabled={register.isPending}>Create account</button>
      </form>
      <p className="muted">
        Already registered? <Link to={`/login${params.size ? `?${params}` : ''}`}>Sign in</Link>
      </p>
    </section>
  );
}

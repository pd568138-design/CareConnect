function AuthScreen({ onLogin, notify, notice }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    code: ''
  });

  const [pending, setPending] = useState(false);
  const [demoOTP, setDemoOTP] = useState('');
  const [busy, setBusy] = useState(false);

  const update = (e) => {
    const { name, value } = e.target;

    if (name === 'code') {
      setForm((old) => ({
        ...old,
        code: value.replace(/\D/g, '').slice(0, 6)
      }));
    } else {
      setForm((old) => ({
        ...old,
        [name]: value
      }));
    }
  };

  const submit = async (e) => {
    e.preventDefault();

    if (busy) return;

    setBusy(true);

    try {
      // STEP 1: REGISTER AND GENERATE OTP
      if (mode === 'register' && !pending) {
        const response = await api('auth/register', {
          method: 'POST',
          body: json({
            name: form.name.trim(),
            email: form.email.trim(),
            phone: form.phone.trim(),
            password: form.password
          })
        });

        if (!response.success) {
          throw new Error(response.message || 'Registration failed.');
        }

        if (!response.demoOTP) {
          throw new Error(
            'OTP was generated but the server did not return the demo OTP.'
          );
        }

        setDemoOTP(String(response.demoOTP));
        setForm((old) => ({
          ...old,
          phone: response.phone || old.phone,
          code: ''
        }));

        setPending(true);
        notify('OTP generated successfully. Check the OTP displayed below.');
      }

      // STEP 2: VERIFY OTP
      else if (mode === 'register' && pending) {
        if (!/^\d{6}$/.test(form.code)) {
          throw new Error('Enter the 6-digit OTP.');
        }

        const response = await api('auth/verify-otp', {
          method: 'POST',
          body: json({
            phone: form.phone.trim(),
            code: form.code.trim()
          })
        });

        if (!response.token || !response.user) {
          throw new Error(
            response.message || 'OTP verification failed.'
          );
        }

        setDemoOTP('');
        onLogin(response.token, response.user);
      }

      // LOGIN
      else {
        const response = await api('auth/login', {
          method: 'POST',
          body: json({
            identifier: form.phone.trim(),
            password: form.password
          })
        });

        if (!response.token || !response.user) {
          throw new Error(response.message || 'Login failed.');
        }

        onLogin(response.token, response.user);
      }
    } catch (error) {
      notify(error.message || 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  const switchMode = () => {
    setMode(mode === 'register' ? 'login' : 'register');
    setPending(false);
    setDemoOTP('');

    setForm({
      name: '',
      email: '',
      phone: '',
      password: '',
      code: ''
    });
  };

  return (
    <div className="auth-page">
      <div className="auth-left">
        <div className="auth-brand">
          <span className="brand-mark">
            <HeartPulse />
          </span>
          Care<span>Connect</span>
        </div>

        <div className="auth-copy">
          <div className="eyebrow light">CARE THAT CONNECTS</div>

          <h1>
            Better care starts with a <em>clearer connection.</em>
          </h1>

          <p>
            Find the right specialist, book with confidence, and keep every
            step of your care journey in one place.
          </p>

          <div className="auth-proof">
            <div>
              <b>01</b>
              <span>Discover trusted hospitals</span>
            </div>

            <div>
              <b>02</b>
              <span>Choose your doctor & time</span>
            </div>

            <div>
              <b>03</b>
              <span>Stay connected to your care</span>
            </div>
          </div>
        </div>

        <div className="auth-footer">
          A more thoughtful way to manage healthcare.
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-form-wrap">
          <div className="eyebrow">WELCOME TO CARECONNECT</div>

          <h2>
            {mode === 'register'
              ? pending
                ? 'Verify your phone'
                : 'Create your account'
              : 'Welcome back'}
          </h2>

          <p className="muted">
            {mode === 'register'
              ? pending
                ? 'Your demo OTP is displayed below. Enter it to verify your mobile number.'
                : 'A few details to get your care journey started.'
              : 'Sign in to continue to your personal care space.'}
          </p>

          <form onSubmit={submit}>
            {mode === 'register' && !pending && (
              <>
                <label>
                  Full name
                  <input
                    name="name"
                    value={form.name}
                    onChange={update}
                    placeholder="Your name"
                    required
                  />
                </label>

                <label>
                  Email address
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={update}
                    placeholder="you@example.com"
                    required
                  />
                </label>
              </>
            )}

            <label>
              Mobile number
              <input
                name="phone"
                value={form.phone}
                onChange={update}
                placeholder="+91 98765 43210"
                disabled={mode === 'register' && pending}
                required
              />
            </label>

            {mode === 'register' && pending ? (
              <>
                <div className="demo-otp-box">
                  <div className="demo-otp-heading">
                    <ShieldCheck size={18} />
                    Your Demo OTP
                  </div>

                  <div className="demo-otp-number">
                    {demoOTP || '------'}
                  </div>

                  <p>
                    This is a demo OTP for testing. Enter this 6-digit code
                    in the box below.
                  </p>
                </div>

                <label>
                  Enter 6-digit OTP
                  <input
                    name="code"
                    value={form.code}
                    onChange={update}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    placeholder="Enter OTP"
                    required
                  />
                </label>
              </>
            ) : (
              <label>
                Password
                <input
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={update}
                  minLength={8}
                  placeholder="At least 8 characters"
                  required
                />
              </label>
            )}

            <button className="primary-button full" disabled={busy}>
              {busy
                ? 'Please wait…'
                : mode === 'register'
                  ? pending
                    ? 'Verify & create account'
                    : 'Generate OTP'
                  : 'Sign in'}

              <span>→</span>
            </button>

            {mode === 'register' && pending && (
              <button
                type="button"
                className="text-button"
                disabled={busy}
                onClick={() => {
                  setPending(false);
                  setDemoOTP('');
                  setForm((old) => ({
                    ...old,
                    code: ''
                  }));
                }}
              >
                Go back and register again
              </button>
            )}
          </form>

          <div className="auth-switch">
            {mode === 'register'
              ? 'Already have an account?'
              : 'New to CareConnect?'}

            <button type="button" onClick={switchMode}>
              {mode === 'register' ? 'Sign in' : 'Create an account'}
            </button>
          </div>

          <div className="secure-note">
            <ShieldCheck size={16} />
            Your account is protected with secure authentication.
          </div>
        </div>
      </div>

      {notice && <div className="toast">{notice}</div>}
    </div>
  );
}

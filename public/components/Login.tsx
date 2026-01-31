import { createSignal } from 'solid-js';

interface LoginProps {
  onLogin: (user: { id: number; username: string }, token: string) => void;
}

export default function Login(props: LoginProps) {
  const [username, setUsername] = createSignal('');
  const [password, setPassword] = createSignal('');
  const [error, setError] = createSignal('');
  const [loading, setLoading] = createSignal(false);

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: username(),
          password: password(),
        }),
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        setError(data.error || 'Login failed');
        return;
      }

      props.onLogin(data.user, data.token);
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div class="login-container">
      <div class="login-box">
        <h2>Login</h2>
        <form onSubmit={handleSubmit}>
          <div class="form-group">
            <label for="username">Username</label>
            <input
              id="username"
              type="text"
              value={username()}
              onInput={(e) => setUsername(e.currentTarget.value)}
              required
              disabled={loading()}
            />
          </div>
          <div class="form-group">
            <label for="password">Password</label>
            <input
              id="password"
              type="password"
              value={password()}
              onInput={(e) => setPassword(e.currentTarget.value)}
              required
              disabled={loading()}
            />
          </div>
          {error() && <div class="error">{error()}</div>}
          <button type="submit" disabled={loading()}>
            {loading() ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}

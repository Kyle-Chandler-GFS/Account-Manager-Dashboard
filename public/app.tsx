import { render } from 'solid-js/web';
import { createSignal, Show, For, onMount } from 'solid-js';
import Login from './components/Login';
import CustomerList from './components/CustomerList';
import CustomerDetails from './components/CustomerDetails';

interface User {
  id: number;
  username: string;
}

interface Customer {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
}

function App() {
  const [user, setUser] = createSignal<User | null>(null);
  const [token, setToken] = createSignal<string | null>(null);
  const [selectedCustomer, setSelectedCustomer] = createSignal<Customer | null>(null);

  onMount(async () => {
    // Check if user is already logged in
    const savedToken = localStorage.getItem('auth-token');
    if (savedToken) {
      setToken(savedToken);
      try {
        const response = await fetch('/api/me', {
          headers: {
            'Authorization': `Bearer ${savedToken}`,
          },
        });
        if (response.ok) {
          const data = await response.json();
          setUser({ id: data.userId, username: data.username || 'User' });
        }
      } catch (error) {
        localStorage.removeItem('auth-token');
      }
    }
  });

  const handleLogin = (userData: User, authToken: string) => {
    setUser(userData);
    setToken(authToken);
    localStorage.setItem('auth-token', authToken);
  };

  const handleLogout = async () => {
    await fetch('/api/logout', { method: 'POST' });
    setUser(null);
    setToken(null);
    setSelectedCustomer(null);
    localStorage.removeItem('auth-token');
  };

  return (
    <div class="app">
      <Show when={!user()} fallback={
        <div class="main-container">
          <header>
            <h1>Customer Information</h1>
            <div class="user-info">
              <span>Welcome, {user()?.username}</span>
              <button onClick={handleLogout}>Logout</button>
            </div>
          </header>
          
          <Show when={!selectedCustomer()} fallback={
            <CustomerDetails 
              customer={selectedCustomer()!} 
              onBack={() => setSelectedCustomer(null)}
            />
          }>
            <CustomerList 
              token={token()!} 
              onSelectCustomer={setSelectedCustomer}
            />
          </Show>
        </div>
      }>
        <Login onLogin={handleLogin} />
      </Show>
    </div>
  );
}

render(() => <App />, document.getElementById('app')!);

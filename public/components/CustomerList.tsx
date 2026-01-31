import { createSignal, onMount, For, Show } from 'solid-js';

interface Customer {
  id: number;
  company?: string;
  COMPANY?: string;
}

interface CustomerListProps {
  token: string;
  onSelectCustomer: (customer: Customer) => void;
}

export default function CustomerList(props: CustomerListProps) {
  const [customers, setCustomers] = createSignal<Customer[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal('');

  onMount(async () => {
    try {
      const response = await fetch('/api/customers', {
        headers: {
          'Authorization': `Bearer ${props.token}`,
        },
      });

      if (!response.ok) {
        setError('Failed to load customers');
        return;
      }

      const data = await response.json();
      console.log('Customers data received:', data.customers);
      setCustomers(data.customers || []);
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  });

  return (
    <div class="customer-list">
      <h2>Your Customers</h2>
      
      <Show when={loading()}>
        <div class="loading">Loading customers...</div>
      </Show>

      <Show when={error()}>
        <div class="error">{error()}</div>
      </Show>

      <Show when={!loading() && !error()}>
        <Show when={customers().length === 0} fallback={
          <div class="customer-grid">
            <For each={customers()}>
              {(customer) => (
                <div 
                  class="customer-card"
                  onClick={() => props.onSelectCustomer(customer)}
                >
                  <h3>{customer.company || customer.COMPANY || 'No Company Name'}</h3>
                  <span class="view-details">View Details →</span>
                </div>
              )}
            </For>
          </div>
        }>
          <div class="empty-state">No customers assigned to you.</div>
        </Show>
      </Show>
    </div>
  );
}

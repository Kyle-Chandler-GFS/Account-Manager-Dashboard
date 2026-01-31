import { createSignal, onMount, Show } from 'solid-js';

interface Customer {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
}

interface CustomerDetailsProps {
  customer: Customer;
  onBack: () => void;
}

export default function CustomerDetails(props: CustomerDetailsProps) {
  const [details, setDetails] = createSignal<any>(null);
  const [loading, setLoading] = createSignal(true);

  onMount(async () => {
    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch(`/api/customers/${props.customer.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setDetails(data.customer);
      }
    } catch (err) {
      console.error('Failed to load customer details', err);
    } finally {
      setLoading(false);
    }
  });

  return (
    <div class="customer-details">
      <button class="back-button" onClick={props.onBack}>← Back to List</button>
      
      <Show when={loading()} fallback={
        <div class="details-content">
          <h2>{props.customer.name}</h2>
          
          <div class="detail-section">
            <h3>Contact Information</h3>
            {details()?.EMAIL && (
              <p><strong>Email:</strong> {details().EMAIL}</p>
            )}
            {details()?.PHONE && (
              <p><strong>Phone:</strong> {details().PHONE}</p>
            )}
            {details()?.ADDRESS && (
              <p><strong>Address:</strong> {details().ADDRESS}</p>
            )}
          </div>

          {/* Add more detail sections based on your database schema */}
        </div>
      }>
        <div class="loading">Loading details...</div>
      </Show>
    </div>
  );
}

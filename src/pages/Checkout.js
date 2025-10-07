import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';

const Checkout = () => {
  const navigate = useNavigate();
  const { cart, getCartTotal, getDeliveryFee, getGrandTotal, clearCart } = useCart();
  const [products, setProducts] = useState([]);
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    governorate: '',
    postalCode: '',
    notes: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const governorates = [
    'Tunis', 'Ariana', 'Ben Arous', 'Manouba', 'Bizerte', 'Nabeul', 'Zaghouan',
    'Beja', 'Jendouba', 'Kef', 'Siliana', 'Sousse', 'Monastir', 'Mahdia',
    'Sfax', 'Kairouan', 'Kasserine', 'Sidi Bouzid', 'Gabes', 'Medenine',
    'Tataouine', 'Gafsa', 'Tozeur', 'Kebili'
  ];

  useEffect(() => {
    fetchProducts();
    if (cart.length === 0) {
      navigate('/cart');
    }
  }, [cart, navigate]);

  const fetchProducts = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/products');
      const data = await response.json();
      setProducts(data);
    } catch (error) {
      console.error('Failed to fetch products:', error);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('fr-TN', { 
      style: 'currency', 
      currency: 'TND', 
      minimumFractionDigits: 3 
    }).format(price);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const validateForm = () => {
    const { fullName, phone, address, city, postalCode, governorate } = formData;
    
    if (!fullName || !phone || !address || !city || !postalCode || !governorate) {
      return 'Please fill in all required fields.';
    }

    const phoneDigits = phone.match(/\d/g)?.join('') || '';
    if (phoneDigits.length < 8) {
      return 'Please provide a valid phone number (at least 8 digits).';
    }

    if (!/^\d{4}$/.test(postalCode)) {
      return 'Postal code should be 4 digits.';
    }

    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    // Check stock availability
    const cartItems = cart.map(cartItem => {
      const product = products.find(p => p.id === cartItem.id);
      return product ? { ...product, cartQty: cartItem.qty } : null;
    }).filter(Boolean);

    for (const item of cartItems) {
      if (item.stock < item.cartQty) {
        setError(`Not enough stock for ${item.name}.`);
        return;
      }
    }

    setLoading(true);

    try {
      const subtotal = getCartTotal(products);
      const deliveryFee = getDeliveryFee(subtotal);
      const total = getGrandTotal(products);

      const orderData = {
        items: cartItems.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          qty: item.cartQty
        })),
        customer: formData,
        subtotal,
        deliveryFee,
        total
      };

      const response = await fetch('http://localhost:5000/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      });

      if (response.ok) {
        setSuccess('Order placed successfully! You will pay cash on delivery.');
        clearCart();
        setTimeout(() => {
          navigate('/');
        }, 2000);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to place order.');
      }
    } catch (error) {
      setError('Failed to place order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const subtotal = getCartTotal(products);
  const deliveryFee = getDeliveryFee(subtotal);
  const total = getGrandTotal(products);

  return (
    <div>
      <div className="panel">
        <h2 style={{ margin: '0 0 8px' }}>Checkout — Cash on Delivery</h2>
        <p className="muted" style={{ marginBottom: '24px' }}>
          Provide your delivery details. You will pay cash upon delivery.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: '16px' }}>
            <div style={{ display: 'grid', gap: '8px' }}>
              <label className="muted" style={{ fontSize: '13px', fontWeight: '600' }}>
                Full Name *
              </label>
              <input
                name="fullName"
                required
                placeholder="e.g., Ahmed Ben Salah"
                value={formData.fullName}
                onChange={handleInputChange}
              />
            </div>
            <div style={{ display: 'grid', gap: '8px' }}>
              <label className="muted" style={{ fontSize: '13px', fontWeight: '600' }}>
                Phone *
              </label>
              <input
                name="phone"
                required
                placeholder="e.g., 22 123 456"
                value={formData.phone}
                onChange={handleInputChange}
              />
            </div>
            <div style={{ display: 'grid', gap: '8px' }}>
              <label className="muted" style={{ fontSize: '13px', fontWeight: '600' }}>
                Email (optional)
              </label>
              <input
                name="email"
                type="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={handleInputChange}
              />
            </div>
            <div style={{ display: 'grid', gap: '8px' }}>
              <label className="muted" style={{ fontSize: '13px', fontWeight: '600' }}>
                Governorate *
              </label>
              <select
                name="governorate"
                required
                value={formData.governorate}
                onChange={handleInputChange}
              >
                <option value="">Select Governorate</option>
                {governorates.map(gov => (
                  <option key={gov} value={gov}>{gov}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'grid', gap: '8px' }}>
              <label className="muted" style={{ fontSize: '13px', fontWeight: '600' }}>
                City *
              </label>
              <input
                name="city"
                required
                placeholder="City"
                value={formData.city}
                onChange={handleInputChange}
              />
            </div>
            <div style={{ display: 'grid', gap: '8px' }}>
              <label className="muted" style={{ fontSize: '13px', fontWeight: '600' }}>
                Postal Code *
              </label>
              <input
                name="postalCode"
                required
                placeholder="4 digits"
                value={formData.postalCode}
                onChange={handleInputChange}
              />
            </div>
            <div style={{ display: 'grid', gap: '8px', gridColumn: '1/-1' }}>
              <label className="muted" style={{ fontSize: '13px', fontWeight: '600' }}>
                Address *
              </label>
              <input
                name="address"
                required
                placeholder="Street, building, floor, apartment"
                value={formData.address}
                onChange={handleInputChange}
              />
            </div>
            <div style={{ display: 'grid', gap: '8px', gridColumn: '1/-1' }}>
              <label className="muted" style={{ fontSize: '13px', fontWeight: '600' }}>
                Order Notes
              </label>
              <textarea
                name="notes"
                rows="3"
                placeholder="Any special instructions for delivery"
                value={formData.notes}
                onChange={handleInputChange}
              />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <input
              type="checkbox"
              required
              style={{ width: 'auto', accentColor: 'var(--accent-primary)' }}
            />
            <label className="muted">
              I agree to pay cash on delivery and accept the order terms.
            </label>
          </div>

          <div style={{ display: 'grid', gap: '10px', paddingTop: '16px', borderTop: '2px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div className="muted" style={{ fontWeight: '600' }}>Subtotal:</div>
              <div className="price" style={{ marginLeft: 'auto' }}>{formatPrice(subtotal)}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div className="muted" style={{ fontWeight: '600' }}>Delivery fee:</div>
              <div className="price" style={{ marginLeft: 'auto' }}>{formatPrice(deliveryFee)}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div className="muted" style={{ fontWeight: '800' }}>Grand total:</div>
              <div className="price price-large" style={{ marginLeft: 'auto' }}>{formatPrice(total)}</div>
              <button 
                type="submit" 
                className="btn-primary"
                disabled={loading}
              >
                {loading ? 'Placing Order...' : 'Place Order'}
              </button>
            </div>
          </div>

          {error && <div className="message-error">{error}</div>}
          {success && <div className="message-success">{success}</div>}
        </form>
      </div>
    </div>
  );
};

export default Checkout;

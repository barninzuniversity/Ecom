import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Admin = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('products');
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [showOnlyVisible, setShowOnlyVisible] = useState(true);
  const [orderStatusFilter, setOrderStatusFilter] = useState('');
  const [orderSearch, setOrderSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Product form state
  const [productForm, setProductForm] = useState({
    id: '',
    name: '',
    category: '',
    price: '',
    stock: '',
    imageUrl: '',
    description: ''
  });

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (activeTab === 'products') {
      fetchProducts();
    } else if (activeTab === 'orders') {
      fetchOrders();
    }
  }, [activeTab]);

  useEffect(() => {
    filterOrders();
  }, [orders, orderStatusFilter, orderSearch]);

  const checkAuth = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/admin/check', {
        credentials: 'include'
      });
      if (!response.ok) {
        navigate('/admin/login');
      }
    } catch (error) {
      navigate('/admin/login');
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/admin/products', {
        credentials: 'include'
      });
      const data = await response.json();
      setProducts(data);
    } catch (error) {
      console.error('Failed to fetch products:', error);
    }
  };

  const fetchOrders = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/admin/orders', {
        credentials: 'include'
      });
      const data = await response.json();
      setOrders(data);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    }
  };

  const filterOrders = () => {
    let filtered = orders;
    
    if (orderStatusFilter) {
      filtered = filtered.filter(order => order.status === orderStatusFilter);
    }
    
    if (orderSearch) {
      const searchTerm = orderSearch.toLowerCase();
      filtered = filtered.filter(order => 
        order.id.toLowerCase().includes(searchTerm) ||
        order.customer.fullName.toLowerCase().includes(searchTerm) ||
        order.customer.phone.toLowerCase().includes(searchTerm)
      );
    }
    
    setFilteredOrders(filtered);
  };

  const handleProductSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('http://localhost:5000/api/admin/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(productForm),
      });

      if (response.ok) {
        setSuccess(productForm.id ? 'Product updated successfully!' : 'Product added successfully!');
        setProductForm({
          id: '',
          name: '',
          category: '',
          price: '',
          stock: '',
          imageUrl: '',
          description: ''
        });
        fetchProducts();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to save product');
      }
    } catch (error) {
      setError('Failed to save product. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEditProduct = (product) => {
    setProductForm({
      id: product.id,
      name: product.name,
      category: product.category || '',
      price: product.price,
      stock: product.stock,
      imageUrl: product.imageUrl || '',
      description: product.description || ''
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteProduct = async (productId) => {
    if (!window.confirm('Delete this product?')) return;
    
    const password = window.prompt('Enter product action password to confirm deletion:');
    if (password !== 'prod123') {
      alert('Incorrect password.');
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/admin/products/${productId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ password }),
      });

      if (response.ok) {
        setSuccess('Product deleted successfully!');
        fetchProducts();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to delete product');
      }
    } catch (error) {
      setError('Failed to delete product. Please try again.');
    }
  };

  const handleUpdateOrderStatus = async (orderId, status, restock = false) => {
    try {
      const response = await fetch(`http://localhost:5000/api/admin/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ status, restock }),
      });

      if (response.ok) {
        setSuccess('Order status updated successfully!');
        fetchOrders();
        fetchProducts(); // Refresh products in case stock was updated
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to update order status');
      }
    } catch (error) {
      setError('Failed to update order status. Please try again.');
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('http://localhost:5000/api/admin/logout', {
        method: 'POST',
        credentials: 'include'
      });
      navigate('/admin/login');
    } catch (error) {
      navigate('/admin/login');
    }
  };

  const exportCSV = () => {
    const cols = [
      'id', 'date', 'customer', 'phone', 'address', 'governorate', 'postalCode',
      'status', 'subtotal', 'deliveryFee', 'total', 'items'
    ];
    
    const toCsv = (v) => '"' + String(v).replace(/"/g, '""') + '"';
    const lines = [cols.join(',')];
    
    filteredOrders.forEach(order => {
      const addr = `${order.customer.address}, ${order.customer.city}`;
      const items = order.items.map(i => `${i.name} x${i.qty}`).join('; ');
      const row = [
        order.id,
        new Date(order.date).toLocaleString(),
        order.customer.fullName,
        order.customer.phone,
        addr,
        order.customer.governorate,
        order.customer.postalCode,
        order.status,
        formatPrice(order.subtotal || 0),
        formatPrice(order.deliveryFee || 0),
        formatPrice(order.total || 0),
        items,
      ].map(toCsv);
      lines.push(row.join(','));
    });
    
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orders_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('fr-TN', { 
      style: 'currency', 
      currency: 'TND', 
      minimumFractionDigits: 3 
    }).format(price);
  };

  // Calculate stats
  const completedOrders = orders.filter(o => o.status === 'Completed');
  const totalRevenue = completedOrders.reduce((sum, o) => sum + (o.total || 0), 0);
  const totalItemsSold = completedOrders.reduce((sum, o) => 
    sum + o.items.reduce((n, i) => n + (i.qty || 0), 0), 0
  );

  const displayProducts = showOnlyVisible 
    ? products.filter(p => p.active !== false)
    : products;

  return (
    <div>
      <div className="panel">
        <h2 style={{ margin: '0 0 8px' }}>Admin Dashboard</h2>
        <p className="muted" style={{ marginBottom: '20px' }}>
          Manage products, prices (TND), stock and orders.
        </p>

        <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', alignItems: 'center' }}>
          <button 
            className={`nav-btn ${activeTab === 'products' ? 'active' : ''}`}
            onClick={() => setActiveTab('products')}
            style={activeTab === 'products' ? {
              background: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
              color: 'white',
              boxShadow: 'var(--shadow-glow-purple)'
            } : {}}
          >
            Products
          </button>
          <button 
            className={`nav-btn ${activeTab === 'orders' ? 'active' : ''}`}
            onClick={() => setActiveTab('orders')}
            style={activeTab === 'orders' ? {
              background: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
              color: 'white',
              boxShadow: 'var(--shadow-glow-purple)'
            } : {}}
          >
            Orders
          </button>
          <div style={{ marginLeft: 'auto' }}>
            <button className="nav-btn" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '16px', marginBottom: '24px' }}>
          <div className="panel" style={{ padding: '20px' }}>
            <div className="muted" style={{ fontSize: '12px', textTransform: 'uppercase' }}>Total Revenue</div>
            <div className="price" style={{ fontSize: '28px', fontWeight: '800' }}>{formatPrice(totalRevenue)}</div>
          </div>
          <div className="panel" style={{ padding: '20px' }}>
            <div className="muted" style={{ fontSize: '12px', textTransform: 'uppercase' }}>Orders</div>
            <div className="price" style={{ fontSize: '28px', fontWeight: '800' }}>{orders.length}</div>
          </div>
          <div className="panel" style={{ padding: '20px' }}>
            <div className="muted" style={{ fontSize: '12px', textTransform: 'uppercase' }}>Items Sold</div>
            <div className="price" style={{ fontSize: '28px', fontWeight: '800' }}>{totalItemsSold}</div>
          </div>
        </div>

        {error && <div className="message-error">{error}</div>}
        {success && <div className="message-success">{success}</div>}

        {/* Products Tab */}
        {activeTab === 'products' && (
          <div>
            <h3 style={{ margin: '16px 0', fontSize: '22px' }}>Add / Edit Product</h3>
            <form onSubmit={handleProductSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: '16px', marginBottom: '32px' }}>
              <div style={{ display: 'grid', gap: '8px' }}>
                <label className="muted" style={{ fontSize: '13px', fontWeight: '600' }}>Product Name *</label>
                <input
                  name="name"
                  required
                  value={productForm.name}
                  onChange={(e) => setProductForm(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div style={{ display: 'grid', gap: '8px' }}>
                <label className="muted" style={{ fontSize: '13px', fontWeight: '600' }}>Category</label>
                <input
                  name="category"
                  placeholder="e.g., Electronics, Apparel"
                  value={productForm.category}
                  onChange={(e) => setProductForm(prev => ({ ...prev, category: e.target.value }))}
                />
              </div>
              <div style={{ display: 'grid', gap: '8px' }}>
                <label className="muted" style={{ fontSize: '13px', fontWeight: '600' }}>Price (TND) *</label>
                <input
                  name="price"
                  type="number"
                  min="0"
                  step="0.001"
                  required
                  value={productForm.price}
                  onChange={(e) => setProductForm(prev => ({ ...prev, price: e.target.value }))}
                />
              </div>
              <div style={{ display: 'grid', gap: '8px' }}>
                <label className="muted" style={{ fontSize: '13px', fontWeight: '600' }}>Stock Quantity *</label>
                <input
                  name="stock"
                  type="number"
                  min="0"
                  step="1"
                  required
                  value={productForm.stock}
                  onChange={(e) => setProductForm(prev => ({ ...prev, stock: e.target.value }))}
                />
              </div>
              <div style={{ display: 'grid', gap: '8px' }}>
                <label className="muted" style={{ fontSize: '13px', fontWeight: '600' }}>Image URL</label>
                <input
                  name="imageUrl"
                  placeholder="https://..."
                  value={productForm.imageUrl}
                  onChange={(e) => setProductForm(prev => ({ ...prev, imageUrl: e.target.value }))}
                />
              </div>
              <div style={{ display: 'grid', gap: '8px' }}>
                <label className="muted" style={{ fontSize: '13px', fontWeight: '600' }}>Description</label>
                <input
                  name="description"
                  placeholder="Short product description"
                  value={productForm.description}
                  onChange={(e) => setProductForm(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>
              <div style={{ gridColumn: '1/-1', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button 
                  type="button" 
                  className="nav-btn"
                  onClick={() => setProductForm({
                    id: '', name: '', category: '', price: '', stock: '', imageUrl: '', description: ''
                  })}
                >
                  Clear Form
                </button>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Saving...' : 'Save Product'}
                </button>
              </div>
            </form>

            <h3 style={{ margin: '24px 0 16px', fontSize: '22px' }}>Product List</h3>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', margin: '8px 0 16px' }}>
              <label className="pill" style={{ cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={showOnlyVisible}
                  onChange={(e) => setShowOnlyVisible(e.target.checked)}
                  style={{ accentColor: 'var(--accent-primary)', marginRight: '6px' }}
                />
                Show only shop-visible products
              </label>
            </div>
            <div style={{ overflow: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Price</th>
                    <th>Stock</th>
                    <th>Status</th>
                    <th style={{ width: '280px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {displayProducts.map(product => (
                    <ProductRow
                      key={product.id}
                      product={product}
                      onEdit={handleEditProduct}
                      onDelete={handleDeleteProduct}
                      formatPrice={formatPrice}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Orders Tab */}
        {activeTab === 'orders' && (
          <div>
            <h3 style={{ margin: '16px 0', fontSize: '22px' }}>Order Management</h3>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', margin: '8px 0 16px' }}>
              <select
                value={orderStatusFilter}
                onChange={(e) => setOrderStatusFilter(e.target.value)}
                className="nav-btn"
                style={{ padding: '10px 12px' }}
              >
                <option value="">All statuses</option>
                <option>New</option>
                <option>Processing</option>
                <option>Completed</option>
                <option>Cancelled</option>
              </select>
              <input
                placeholder="Search by name, phone, ID"
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
                style={{ flex: 1 }}
              />
              <button className="nav-btn" onClick={exportCSV}>
                Export CSV
              </button>
            </div>
            <div style={{ overflow: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Date</th>
                    <th>Customer</th>
                    <th>Address</th>
                    <th>Items</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th style={{ width: '300px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="muted" style={{ textAlign: 'center', padding: '40px 16px' }}>
                        No orders yet.
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map(order => (
                      <OrderRow
                        key={order.id}
                        order={order}
                        onUpdateStatus={handleUpdateOrderStatus}
                        formatPrice={formatPrice}
                      />
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const ProductRow = ({ product, onEdit, onDelete, formatPrice }) => {
  const [stock, setStock] = useState(product.stock);
  const [active, setActive] = useState(product.active);

  const handleStockChange = async (delta) => {
    const newStock = Math.max(0, stock + delta);
    setStock(newStock);
    // In a real app, you'd make an API call here to update the stock
  };

  const handleToggleActive = () => {
    setActive(!active);
    // In a real app, you'd make an API call here to toggle active status
  };

  return (
    <tr>
      <td>
        <div style={{ fontWeight: '600' }}>{product.name}</div>
        <div className="muted" style={{ fontSize: '13px', maxWidth: '420px' }}>
          {product.description || ''}
        </div>
      </td>
      <td className="price" style={{ fontSize: '16px' }}>{formatPrice(product.price)}</td>
      <td style={{ fontWeight: '600' }}>{stock}</td>
      <td>
        {active ? (
          <span className="pill" style={{ background: 'rgba(16, 185, 129, 0.1)', borderColor: 'rgba(16, 185, 129, 0.2)', color: 'var(--accent-success)' }}>
            Active
          </span>
        ) : (
          <span className="pill">Hidden</span>
        )}
      </td>
      <td>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button className="nav-btn" onClick={() => onEdit(product)}>Edit</button>
          <button className="nav-btn" onClick={() => handleStockChange(1)}>+1</button>
          <button className="nav-btn" onClick={() => handleStockChange(-1)}>-1</button>
          <button className="nav-btn" onClick={handleToggleActive}>
            {active ? 'Hide' : 'Show'}
          </button>
          <button className="btn-danger" onClick={() => onDelete(product.id)}>Delete</button>
        </div>
      </td>
    </tr>
  );
};

const OrderRow = ({ order, onUpdateStatus, formatPrice }) => {
  const [restock, setRestock] = useState(false);

  const getStatusStyle = (status) => {
    const styles = {
      New: {
        background: 'rgba(59, 130, 246, 0.1)',
        borderColor: 'rgba(59, 130, 246, 0.2)',
        color: 'var(--accent-info)'
      },
      Processing: {
        background: 'rgba(245, 158, 11, 0.1)',
        borderColor: 'rgba(245, 158, 11, 0.2)',
        color: 'var(--accent-primary)'
      },
      Completed: {
        background: 'rgba(16, 185, 129, 0.1)',
        borderColor: 'rgba(16, 185, 129, 0.2)',
        color: 'var(--accent-success)'
      },
      Cancelled: {
        background: 'rgba(239, 68, 68, 0.1)',
        borderColor: 'rgba(239, 68, 68, 0.2)',
        color: 'var(--accent-danger)'
      }
    };
    return styles[status] || {};
  };

  const itemsSummary = order.items.map(i => `${i.name} × ${i.qty}`).join('<br/>');

  return (
    <tr>
      <td style={{ fontFamily: 'monospace', fontSize: '13px' }}>{order.id.slice(-8)}</td>
      <td style={{ fontSize: '13px' }}>{new Date(order.date).toLocaleString()}</td>
      <td>
        <div style={{ fontWeight: '600' }}>{order.customer.fullName}</div>
        <div className="muted" style={{ fontSize: '13px' }}>{order.customer.phone}</div>
      </td>
      <td style={{ fontSize: '13px' }}>
        {order.customer.address}, {order.customer.city}<br/>
        {order.customer.governorate} {order.customer.postalCode}
      </td>
      <td style={{ fontSize: '13px' }} dangerouslySetInnerHTML={{ __html: itemsSummary }} />
      <td className="price" style={{ fontSize: '16px' }}>{formatPrice(order.total)}</td>
      <td>
        <span className="pill" style={getStatusStyle(order.status)}>{order.status}</span>
      </td>
      <td>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          <button 
            className="nav-btn" 
            onClick={() => onUpdateStatus(order.id, 'New')}
            style={{ fontSize: '12px', padding: '6px 12px' }}
          >
            New
          </button>
          <button 
            className="nav-btn" 
            onClick={() => onUpdateStatus(order.id, 'Processing')}
            style={{ fontSize: '12px', padding: '6px 12px' }}
          >
            Processing
          </button>
          <button 
            className="nav-btn" 
            onClick={() => onUpdateStatus(order.id, 'Completed')}
            style={{ fontSize: '12px', padding: '6px 12px' }}
          >
            Completed
          </button>
          <button 
            className="btn-danger" 
            onClick={() => onUpdateStatus(order.id, 'Cancelled', restock)}
            style={{ fontSize: '12px', padding: '6px 12px' }}
          >
            Cancel
          </button>
          <label className="pill" style={{ cursor: 'pointer', userSelect: 'none' }}>
            <input
              type="checkbox"
              checked={restock}
              onChange={(e) => setRestock(e.target.checked)}
              style={{ accentColor: 'var(--accent-success)', marginRight: '4px' }}
            />
            Restock
          </label>
        </div>
      </td>
    </tr>
  );
};

export default Admin;

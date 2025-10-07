import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';

const Cart = () => {
  const [products, setProducts] = useState([]);
  const [cartItems, setCartItems] = useState([]);
  const { cart, updateCartItem, removeFromCart, clearCart, getCartTotal, getDeliveryFee, getGrandTotal } = useCart();

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    if (products.length > 0) {
      const items = cart.map(cartItem => {
        const product = products.find(p => p.id === cartItem.id);
        return product ? { ...product, cartQty: cartItem.qty } : null;
      }).filter(Boolean);
      setCartItems(items);
    }
  }, [cart, products]);

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

  const handleQuantityChange = (productId, newQuantity) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      const maxQuantity = Math.max(0, product.stock);
      const quantity = Math.min(maxQuantity, Math.max(0, newQuantity));
      updateCartItem(productId, quantity);
    }
  };

  const handleRemoveItem = (productId) => {
    removeFromCart(productId);
  };

  const handleClearCart = () => {
    clearCart();
  };

  const subtotal = getCartTotal(products);
  const deliveryFee = getDeliveryFee(subtotal);
  const grandTotal = getGrandTotal(products);

  return (
    <div>
      <div className="panel">
        <h2 style={{ margin: '0 0 20px' }}>Shopping Cart</h2>
        
        {cartItems.length === 0 ? (
          <div className="muted" style={{ textAlign: 'center', padding: '40px 0' }}>
            Your cart is empty.
          </div>
        ) : (
          <>
            <div>
              {cartItems.map(item => (
                <CartItem
                  key={item.id}
                  item={item}
                  onQuantityChange={handleQuantityChange}
                  onRemove={handleRemoveItem}
                  formatPrice={formatPrice}
                />
              ))}
            </div>
            
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '12px', 
              marginTop: '24px', 
              paddingTop: '24px', 
              borderTop: '2px solid var(--border)' 
            }}>
              <div style={{ 
                display: 'grid', 
                gap: '8px', 
                marginLeft: 'auto', 
                textAlign: 'right' 
              }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div className="muted" style={{ fontWeight: '600' }}>Subtotal:</div>
                  <div className="price">{formatPrice(subtotal)}</div>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div className="muted" style={{ fontWeight: '600' }}>Delivery fee:</div>
                  <div className="price">{formatPrice(deliveryFee)}</div>
                </div>
                <div style={{ 
                  display: 'flex', 
                  gap: '12px', 
                  alignItems: 'center', 
                  borderTop: '1px dashed var(--border)', 
                  paddingTop: '6px' 
                }}>
                  <div className="muted" style={{ fontWeight: '800' }}>Grand total:</div>
                  <div className="price price-large">{formatPrice(grandTotal)}</div>
                </div>
              </div>
              <button 
                className="nav-btn" 
                onClick={handleClearCart}
                disabled={cartItems.length === 0}
              >
                Clear Cart
              </button>
              <Link 
                to="/checkout" 
                className="btn-primary"
                style={{ 
                  pointerEvents: cartItems.length === 0 ? 'none' : 'auto',
                  opacity: cartItems.length === 0 ? 0.6 : 1
                }}
              >
                Proceed to Checkout
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const CartItem = ({ item, onQuantityChange, onRemove, formatPrice }) => {
  return (
    <div style={{ 
      display: 'grid', 
      gridTemplateColumns: '80px 1fr auto', 
      gap: '20px', 
      alignItems: 'center', 
      padding: '20px 0', 
      borderBottom: '1px solid var(--border)' 
    }}>
      <div className="product-image" style={{ width: '80px', height: '80px' }}>
        {item.imageUrl && <img src={item.imageUrl} alt={item.name} />}
      </div>
      <div>
        <div style={{ fontWeight: '600', fontSize: '16px', marginBottom: '6px' }}>
          {item.name}
        </div>
        <div className="muted" style={{ fontSize: '13px', marginBottom: '12px' }}>
          Unit: {formatPrice(item.price)} — Stock: {item.stock}
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="qty-control">
            <button 
              className="qty-btn" 
              onClick={() => onQuantityChange(item.id, item.cartQty - 1)}
            >
              −
            </button>
            <input
              type="number"
              min="0"
              step="1"
              value={item.cartQty}
              onChange={(e) => onQuantityChange(item.id, parseInt(e.target.value) || 0)}
              className="qty-input"
            />
            <button 
              className="qty-btn" 
              onClick={() => onQuantityChange(item.id, item.cartQty + 1)}
            >
              +
            </button>
          </div>
          <button 
            className="btn-danger" 
            onClick={() => onRemove(item.id)}
          >
            Remove
          </button>
        </div>
      </div>
      <div className="price">{formatPrice(item.price * item.cartQty)}</div>
    </div>
  );
};

export default Cart;

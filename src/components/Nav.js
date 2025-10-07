import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useCart } from '../context/CartContext';

const Nav = () => {
  const { getCartCount } = useCart();
  const location = useLocation();

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <header className="nav">
      <div className="brand">
        <div className="brand-logo" aria-hidden="true"></div>
        <strong>TND Shop</strong>
        <span className="pill">TND</span>
        <span className="pill">Cash on Delivery</span>
      </div>
      <nav className="nav-actions">
        <Link 
          to="/" 
          className={`nav-btn ${isActive('/') ? 'active' : ''}`}
          style={isActive('/') ? {
            background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
            color: 'white',
            boxShadow: 'var(--shadow-glow-purple)'
          } : {}}
        >
          Shop
        </Link>
        <Link 
          to="/cart" 
          className={`nav-btn ${isActive('/cart') ? 'active' : ''}`}
          style={isActive('/cart') ? {
            background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
            color: 'white',
            boxShadow: 'var(--shadow-glow-purple)'
          } : {}}
        >
          Cart
          <span className="pill">{getCartCount()}</span>
        </Link>
        <Link 
          to="/admin/login" 
          className={`nav-btn ${isActive('/admin') || isActive('/admin/login') ? 'active' : ''}`}
          style={(isActive('/admin') || isActive('/admin/login')) ? {
            background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
            color: 'white',
            boxShadow: 'var(--shadow-glow-purple)'
          } : {}}
        >
          Admin
        </Link>
      </nav>
    </header>
  );
};

export default Nav;

import React, { useState, useEffect } from 'react';
import { useCart } from '../context/CartContext';

const Shop = () => {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [sortBy, setSortBy] = useState('popular');
  const [categories, setCategories] = useState([]);
  const { addToCart } = useCart();

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    filterAndSortProducts();
  }, [products, searchTerm, selectedCategory, sortBy]);

  const fetchProducts = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/products');
      const data = await response.json();
      setProducts(data);
      
      // Extract unique categories
      const uniqueCategories = [...new Set(data.map(p => p.category).filter(Boolean))].sort();
      setCategories(uniqueCategories);
    } catch (error) {
      console.error('Failed to fetch products:', error);
    }
  };

  const filterAndSortProducts = () => {
    let filtered = products.filter(product => {
      const matchesSearch = !searchTerm || 
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.description.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = !selectedCategory || product.category === selectedCategory;
      
      return matchesSearch && matchesCategory;
    });

    // Sort products
    switch (sortBy) {
      case 'price-asc':
        filtered.sort((a, b) => a.price - b.price);
        break;
      case 'price-desc':
        filtered.sort((a, b) => b.price - a.price);
        break;
      case 'newest':
        filtered.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        break;
      default:
        // Keep original order for 'popular'
        break;
    }

    setFilteredProducts(filtered);
  };

  const handleAddToCart = (productId, quantity) => {
    addToCart(productId, quantity);
    alert('Added to cart successfully!');
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('fr-TN', { 
      style: 'currency', 
      currency: 'TND', 
      minimumFractionDigits: 3 
    }).format(price);
  };

  return (
    <div>
      <div className="panel">
        <h2 style={{ margin: '0 0 8px' }}>Shop</h2>
        <p className="muted">Discover our curated collection of premium products with prices in TND and cash on delivery.</p>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 200px 160px', gap: '12px', marginTop: '16px' }}>
          <input
            type="text"
            placeholder="Search products by name or description"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="">All categories</option>
            {categories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="popular">Sort: Popular</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
            <option value="newest">Newest</option>
          </select>
        </div>
      </div>

      <div className="grid">
        {filteredProducts.length === 0 ? (
          <div className="panel" style={{ textAlign: 'center', padding: '60px 20px' }}>
            <p className="muted">No products available yet.</p>
          </div>
        ) : (
          filteredProducts.map(product => (
            <ProductCard
              key={product.id}
              product={product}
              onAddToCart={handleAddToCart}
              formatPrice={formatPrice}
            />
          ))
        )}
      </div>
    </div>
  );
};

const ProductCard = ({ product, onAddToCart, formatPrice }) => {
  const [quantity, setQuantity] = useState(1);

  const stockText = product.stock > 0 
    ? `${product.stock} in stock` 
    : <span style={{ color: 'var(--accent-danger)' }}>Out of stock</span>;

  return (
    <div className="card">
      <div className="product-image">
        {product.imageUrl ? (
          <img src={product.imageUrl} alt={product.name} />
        ) : (
          <div className="pill">No image</div>
        )}
      </div>
      <div style={{ display: 'grid', gap: '12px' }}>
        <div>
          <div style={{ fontWeight: '600', fontSize: '18px', marginBottom: '6px' }}>
            {product.name}
          </div>
          <div className="muted" style={{ fontSize: '14px' }}>
            {product.description}
          </div>
          {product.category && (
            <div className="pill" style={{ marginTop: '6px', display: 'inline-block' }}>
              {product.category}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="price">{formatPrice(product.price)}</div>
          <div className="muted" style={{ fontSize: '13px' }}>{stockText}</div>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="qty-control">
            <button 
              className="qty-btn" 
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
            >
              −
            </button>
            <input
              type="number"
              min="1"
              step="1"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              className="qty-input"
            />
            <button 
              className="qty-btn" 
              onClick={() => setQuantity(quantity + 1)}
            >
              +
            </button>
          </div>
          <button
            className="btn-primary"
            disabled={product.stock <= 0}
            style={{ flex: 1 }}
            onClick={() => onAddToCart(product.id, quantity)}
          >
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  );
};

export default Shop;

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Data storage paths
const DATA_DIR = path.join(__dirname, 'data');
const PRODUCTS_FILE = path.join(DATA_DIR, 'products.json');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');

// Ensure data directory exists
async function ensureDataDir() {
  try {
    await fs.access(DATA_DIR);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
  }
}

// Read JSON file safely
async function readJsonFile(filePath, defaultValue = []) {
  try {
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch {
    return defaultValue;
  }
}

// Write JSON file
async function writeJsonFile(filePath, data) {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

// Seed initial products
async function seedProducts() {
  const products = await readJsonFile(PRODUCTS_FILE);
  if (products.length === 0) {
    const initialProducts = [
      {
        id: 'prod_1',
        name: 'Classic T-Shirt',
        category: 'Apparel',
        price: 39.9,
        stock: 15,
        description: '100% cotton, unisex fit.',
        imageUrl: 'https://via.placeholder.com/300x200?text=T-Shirt',
        active: true,
        createdAt: Date.now()
      },
      {
        id: 'prod_2',
        name: 'Wireless Earbuds',
        category: 'Electronics',
        price: 129.0,
        stock: 8,
        description: 'Bluetooth 5.1, 24h battery.',
        imageUrl: 'https://via.placeholder.com/300x200?text=Earbuds',
        active: true,
        createdAt: Date.now()
      },
      {
        id: 'prod_3',
        name: 'Ceramic Mug',
        category: 'Home',
        price: 19.5,
        stock: 24,
        description: 'Dishwasher safe 350ml mug.',
        imageUrl: 'https://via.placeholder.com/300x200?text=Mug',
        active: true,
        createdAt: Date.now()
      },
      {
        id: 'prod_4',
        name: 'Notebook A5',
        category: 'Stationery',
        price: 8.9,
        stock: 50,
        description: 'Soft cover, 120 pages.',
        imageUrl: 'https://via.placeholder.com/300x200?text=Notebook',
        active: true,
        createdAt: Date.now()
      }
    ];
    await writeJsonFile(PRODUCTS_FILE, initialProducts);
  }
}

// Admin auth middleware
function requireAdmin(req, res, next) {
  const adminToken = req.cookies.admin_token;
  if (adminToken === 'admin123') {
    next();
  } else {
    res.status(401).json({ error: 'Unauthorized' });
  }
}

// Routes

// Products API
app.get('/api/products', async (req, res) => {
  try {
    const products = await readJsonFile(PRODUCTS_FILE);
    const activeProducts = products.filter(p => p.active !== false);
    res.json(activeProducts);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

app.get('/api/admin/products', requireAdmin, async (req, res) => {
  try {
    const products = await readJsonFile(PRODUCTS_FILE);
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

app.post('/api/admin/products', requireAdmin, async (req, res) => {
  try {
    const { name, category, price, stock, imageUrl, description, id } = req.body;
    
    if (!name || !price || stock === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const products = await readJsonFile(PRODUCTS_FILE);
    
    if (id) {
      // Update existing product
      const index = products.findIndex(p => p.id === id);
      if (index === -1) {
        return res.status(404).json({ error: 'Product not found' });
      }
      products[index] = {
        ...products[index],
        name,
        category: category || '',
        price: Number(price),
        stock: Number(stock),
        imageUrl: imageUrl || '',
        description: description || ''
      };
    } else {
      // Create new product
      const newProduct = {
        id: 'prod_' + Date.now(),
        name,
        category: category || '',
        price: Number(price),
        stock: Number(stock),
        imageUrl: imageUrl || '',
        description: description || '',
        active: true,
        createdAt: Date.now()
      };
      products.unshift(newProduct);
    }

    await writeJsonFile(PRODUCTS_FILE, products);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save product' });
  }
});

app.delete('/api/admin/products/:id', requireAdmin, async (req, res) => {
  try {
    const { password } = req.body;
    if (password !== 'prod123') {
      return res.status(401).json({ error: 'Invalid password' });
    }

    const products = await readJsonFile(PRODUCTS_FILE);
    const filteredProducts = products.filter(p => p.id !== req.params.id);
    await writeJsonFile(PRODUCTS_FILE, filteredProducts);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

// Orders API
app.get('/api/admin/orders', requireAdmin, async (req, res) => {
  try {
    const orders = await readJsonFile(ORDERS_FILE);
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

app.post('/api/orders', async (req, res) => {
  try {
    const { items, customer, subtotal, deliveryFee, total } = req.body;
    
    if (!items || !customer || !subtotal || !total) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const orders = await readJsonFile(ORDERS_FILE);
    const newOrder = {
      id: 'order_' + Date.now(),
      date: new Date().toISOString(),
      items,
      subtotal: Number(subtotal),
      deliveryFee: Number(deliveryFee),
      total: Number(total),
      paymentMethod: 'Cash on Delivery',
      status: 'New',
      customer
    };

    orders.unshift(newOrder);
    await writeJsonFile(ORDERS_FILE, orders);

    // Update product stock
    const products = await readJsonFile(PRODUCTS_FILE);
    items.forEach(item => {
      const product = products.find(p => p.id === item.id);
      if (product) {
        product.stock = Math.max(0, product.stock - item.qty);
      }
    });
    await writeJsonFile(PRODUCTS_FILE, products);

    res.json({ success: true, orderId: newOrder.id });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create order' });
  }
});

app.put('/api/admin/orders/:id/status', requireAdmin, async (req, res) => {
  try {
    const { status, restock } = req.body;
    const orders = await readJsonFile(ORDERS_FILE);
    const orderIndex = orders.findIndex(o => o.id === req.params.id);
    
    if (orderIndex === -1) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orders[orderIndex];
    
    // Handle restock for cancelled orders
    if (status === 'Cancelled' && order.status !== 'Cancelled' && restock) {
      const products = await readJsonFile(PRODUCTS_FILE);
      order.items.forEach(item => {
        const product = products.find(p => p.id === item.id);
        if (product) {
          product.stock += item.qty;
        }
      });
      await writeJsonFile(PRODUCTS_FILE, products);
    }

    orders[orderIndex] = { ...order, status };
    await writeJsonFile(ORDERS_FILE, orders);
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update order' });
  }
});

// Admin auth
app.post('/api/admin/login', async (req, res) => {
  const { password } = req.body;
  if (password === 'admin123') {
    res.cookie('admin_token', 'admin123', { 
      httpOnly: true, 
      secure: false, 
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });
    res.json({ success: true });
  } else {
    res.status(401).json({ error: 'Invalid password' });
  }
});

app.post('/api/admin/logout', (req, res) => {
  res.clearCookie('admin_token');
  res.json({ success: true });
});

app.get('/api/admin/check', requireAdmin, (req, res) => {
  res.json({ authenticated: true });
});

// Initialize server
async function startServer() {
  await ensureDataDir();
  await seedProducts();
  
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer().catch(console.error);

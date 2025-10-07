;(() => {
  // Storage keys and admin settings
  const LS = {
    products: "tndshop_products_v1",
    cart: "tndshop_cart_v1",
    orders: "tndshop_orders_v1",
  }
  const ADMIN_PASSWORD = "admin123"
  const PRODUCT_ACTION_PASSWORD = "prod123"

  // Currency: Tunisian Dinar (TND)
  const fmt = new Intl.NumberFormat("fr-TN", { style: "currency", currency: "TND", minimumFractionDigits: 3 })
  const price = (n) => fmt.format(Number(n || 0))

  // Utils
  const uid = () => "id_" + Math.random().toString(36).slice(2) + Date.now().toString(36)
  const escapeHtml = (s) =>
    String(s || "").replace(
      /[&<>"']/g,
      (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
    )

  // Data access
  const loadProducts = () => JSON.parse(localStorage.getItem(LS.products) || "[]")
  const saveProducts = (arr) => localStorage.setItem(LS.products, JSON.stringify(arr))
  const loadCart = () => JSON.parse(localStorage.getItem(LS.cart) || "[]")
  const saveCart = (arr) => localStorage.setItem(LS.cart, JSON.stringify(arr))
  const loadOrders = () => JSON.parse(localStorage.getItem(LS.orders) || "[]")
  const saveOrders = (arr) => localStorage.setItem(LS.orders, JSON.stringify(arr))

  // Seed demo products once
  function seedProductsIfEmpty() {
    const existing = loadProducts()
    if (Array.isArray(existing) && existing.length) return
    const demo = [
      {
        id: uid(),
        name: "Classic T-Shirt",
        category: "Apparel",
        price: 39.9,
        stock: 15,
        description: "100% cotton, unisex fit.",
        imageUrl: "https://via.placeholder.com/300x200?text=T-Shirt",
        active: true,
      },
      {
        id: uid(),
        name: "Wireless Earbuds",
        category: "Electronics",
        price: 129.0,
        stock: 8,
        description: "Bluetooth 5.1, 24h battery.",
        imageUrl: "https://via.placeholder.com/300x200?text=Earbuds",
        active: true,
      },
      {
        id: uid(),
        name: "Ceramic Mug",
        category: "Home",
        price: 19.5,
        stock: 24,
        description: "Dishwasher safe 350ml mug.",
        imageUrl: "https://via.placeholder.com/300x200?text=Mug",
        active: true,
      },
      {
        id: uid(),
        name: "Notebook A5",
        category: "Stationery",
        price: 8.9,
        stock: 50,
        description: "Soft cover, 120 pages.",
        imageUrl: "https://via.placeholder.com/300x200?text=Notebook",
        active: true,
      },
    ]
    saveProducts(demo)
  }

  // Cart helpers
  function cartItemsDetailed() {
    const products = loadProducts()
    const cart = loadCart()
    return (cart || [])
      .map((ci) => {
        const p = products.find((x) => x.id === ci.id)
        return p ? { ...p, cartQty: ci.qty | 0 } : null
      })
      .filter(Boolean)
  }
  function cartTotal() {
    return cartItemsDetailed().reduce((sum, x) => sum + Number(x.price || 0) * (x.cartQty | 0), 0)
  }
  function deliveryFee(subtotal) {
    const s = Number(subtotal || 0)
    if (s === 0) return 0
    // Flat delivery fee logic: free over 200 TND
    return s >= 200 ? 0 : 7.5
  }
  function cartGrandTotal() {
    const sub = cartTotal()
    return sub + deliveryFee(sub)
  }
  function cartCount() {
    return (loadCart() || []).reduce((n, i) => n + (i.qty | 0), 0)
  }
  function setCartQty(productId, qty) {
    const products = loadProducts()
    const p = products.find((x) => x.id === productId)
    const cart = loadCart()
    const ex = cart.find((i) => i.id === productId)
    if (!ex) return
    const max = Math.max(0, p ? p.stock | 0 : 0)
    const v = Math.min(max, Math.max(0, qty | 0))
    if (v <= 0) {
      const idx = cart.indexOf(ex)
      if (idx >= 0) cart.splice(idx, 1)
    } else {
      ex.qty = v
    }
    saveCart(cart)
    updateCartCount()
  }
  function removeFromCart(productId) {
    const cart = loadCart()
    const idx = cart.findIndex((i) => i.id === productId)
    if (idx >= 0) {
      cart.splice(idx, 1)
      saveCart(cart)
      updateCartCount()
    }
  }
  function addToCart(productId, qty) {
    const products = loadProducts()
    const p = products.find((x) => x.id === productId && x.active !== false)
    if (!p) {
      alert("Product unavailable")
      return
    }
    const max = Math.max(0, p.stock | 0)
    if (max <= 0) {
      alert("Out of stock")
      return
    }
    const cart = loadCart()
    const ex = cart.find((i) => i.id === productId)
    if (ex) {
      ex.qty = Math.min(max, (ex.qty | 0) + (qty | 0))
    } else {
      cart.push({ id: productId, qty: Math.min(max, Math.max(1, qty | 0)) })
    }
    saveCart(cart)
    updateCartCount()
  }

  function decrementStockFromOrder(order) {
    const products = loadProducts()
    order.items.forEach((item) => {
      const p = products.find((pp) => pp.id === item.id)
      if (p) p.stock = Math.max(0, (p.stock | 0) - (item.qty | 0))
    })
    saveProducts(products)
  }

  // Admin auth helpers
  function isAdminAuthed() {
    return sessionStorage.getItem("tndshop_admin_auth") === "1"
  }
  function setAdminAuthed(v, remember) {
    if (v) {
      sessionStorage.setItem("tndshop_admin_auth", "1")
      if (remember) {
        localStorage.setItem("tndshop_admin_remember", "1")
      } else {
        localStorage.removeItem("tndshop_admin_remember")
      }
    } else {
      sessionStorage.removeItem("tndshop_admin_auth")
      localStorage.removeItem("tndshop_admin_remember")
    }
  }
  function restoreAdminRemember() {
    if (localStorage.getItem("tndshop_admin_remember") === "1") {
      sessionStorage.setItem("tndshop_admin_auth", "1")
    }
  }
  function requireAdminOrRedirect() {
    if (isAdminAuthed()) return true
    location.href = "admin-login.html"
    return false
  }
  function logoutAdmin() {
    setAdminAuthed(false)
    location.href = "index.html"
  }

  // Common UI
  function updateCartCount() {
    const el = document.getElementById("cart-count")
    if (el) el.textContent = String(cartCount())
  }

  function setupNav() {
    const logoutBtn = document.getElementById("admin-logout")
    if (logoutBtn) logoutBtn.addEventListener("click", logoutAdmin)
    updateCartCount()
  }

  // Shop page
  function renderShop() {
    const grid = document.getElementById("product-grid")
    if (!grid) return
    const products = loadProducts().filter((p) => p.active !== false)

    // populate categories
    const categorySelect = document.getElementById("shop-category")
    if (categorySelect && !categorySelect.dataset.filled) {
      const cats = Array.from(
        new Set(products.map((p) => (p.category || "Misc").trim()).filter(Boolean)),
      ).sort()
      cats.forEach((c) => {
        const o = document.createElement("option")
        o.value = c
        o.textContent = c
        categorySelect.appendChild(o)
      })
      categorySelect.dataset.filled = "1"
    }

    // read filters
    const query = (document.getElementById("shop-search") || { value: "" }).value.toLowerCase().trim()
    const selectedCategory = (categorySelect && categorySelect.value) || ""
    const sortBy = (document.getElementById("shop-sort") || { value: "popular" }).value

    let list = products
      .filter((p) => {
        const inCat = !selectedCategory || (p.category || "Misc") === selectedCategory
        if (!inCat) return false
        if (!query) return true
        const hay = `${p.name} ${p.description}`.toLowerCase()
        return hay.includes(query)
      })

    if (sortBy === "price-asc") list = list.sort((a, b) => (a.price || 0) - (b.price || 0))
    else if (sortBy === "price-desc") list = list.sort((a, b) => (b.price || 0) - (a.price || 0))
    else if (sortBy === "newest") list = list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))

    grid.innerHTML = ""
    if (!list.length) {
      grid.innerHTML =
        '<div class="panel" style="text-align:center; padding: 60px 20px;"><p class="muted">No products available yet.</p></div>'
      return
    }
    list.forEach((p) => {
      const card = document.createElement("div")
      card.className = "card"
      const stockText =
        (p.stock | 0) > 0 ? `${p.stock | 0} in stock` : '<span style="color:var(--accent-danger)">Out of stock</span>'
      card.innerHTML = `
        <div class="product-image">
          ${p.imageUrl ? `<img src="${escapeHtml(p.imageUrl)}" alt="${escapeHtml(p.name)}" />` : `<div class="pill">No image</div>`}
        </div>
        <div style="display:grid; gap:12px;">
          <div>
            <div style="font-weight:600; font-size:18px; margin-bottom: 6px;">${escapeHtml(p.name)}</div>
            <div class="muted" style="font-size:14px;">${escapeHtml(p.description || "")}</div>
            ${p.category ? `<div class="pill" style="margin-top:6px; display:inline-block;">${escapeHtml(p.category)}</div>` : ""}
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div class="price">${price(p.price)}</div>
            <div class="muted" style="font-size:13px;">${stockText}</div>
          </div>
          <div style="display:flex; gap:12px; align-items:center; justify-content:space-between;">
            <div class="qty-control">
              <button class="qty-btn" data-act="dec">−</button>
              <input type="number" min="1" step="1" value="1" class="qty-input" />
              <button class="qty-btn" data-act="inc">+</button>
            </div>
            <button class="btn-primary" ${(p.stock | 0) <= 0 ? "disabled" : ""} style="flex: 1;">Add to Cart</button>
          </div>
        </div>
      `
      const qtyEl = card.querySelector(".qty-input")
      card
        .querySelector("[data-act=dec]")
        .addEventListener("click", () => (qtyEl.value = Math.max(1, (qtyEl.value | 0) - 1)))
      card
        .querySelector("[data-act=inc]")
        .addEventListener("click", () => (qtyEl.value = Math.max(1, (qtyEl.value | 0) + 1)))
      const addBtn = card.querySelector(".btn-primary")
      addBtn.addEventListener("click", () => {
        const q = Math.max(1, qtyEl.value | 0)
        addToCart(p.id, q)
        alert("Added to cart successfully!")
      })
      grid.appendChild(card)
    })
  }
  function initShopPage() {
    renderShop()
    const wire = (id) => {
      const el = document.getElementById(id)
      if (el) el.addEventListener("input", renderShop)
      if (el) el.addEventListener("change", renderShop)
    }
    wire("shop-search")
    wire("shop-category")
    wire("shop-sort")
  }

  // Cart page
  function renderCart() {
    const items = cartItemsDetailed()
    const wrap = document.getElementById("cart-items")
    const empty = document.getElementById("cart-empty")
    const totalEl = document.getElementById("cart-total")
    if (!wrap || !empty || !totalEl) return
    wrap.innerHTML = ""
    empty.style.display = items.length ? "none" : ""
    items.forEach((p) => {
      const row = document.createElement("div")
      row.style.display = "grid"
      row.style.gridTemplateColumns = "80px 1fr auto"
      row.style.gap = "20px"
      row.style.alignItems = "center"
      row.style.padding = "20px 0"
      row.style.borderBottom = "1px solid var(--border)"
      row.innerHTML = `
        <div class="product-image" style="width:80px;height:80px;">${p.imageUrl ? `<img src="${escapeHtml(p.imageUrl)}" alt="${escapeHtml(p.name)}" />` : ""}</div>
        <div>
          <div style="font-weight:600; font-size: 16px; margin-bottom: 6px;">${escapeHtml(p.name)}</div>
          <div class="muted" style="font-size:13px; margin-bottom: 12px;">Unit: ${price(p.price)} — Stock: ${p.stock | 0}</div>
          <div style="display:flex; gap:12px; align-items:center; flex-wrap:wrap;">
            <div class="qty-control">
              <button class="qty-btn" data-act="dec">−</button>
              <input type="number" min="0" step="1" value="${p.cartQty}" class="qty-input" />
              <button class="qty-btn" data-act="inc">+</button>
            </div>
            <button data-act="remove" class="btn-danger">Remove</button>
          </div>
        </div>
        <div class="price">${price((p.price || 0) * (p.cartQty || 0))}</div>
      `
      const qtyEl = row.querySelector(".qty-input")
      row.querySelector("[data-act=dec]").addEventListener("click", () => {
        const v = Math.max(0, (qtyEl.value | 0) - 1)
        qtyEl.value = v
        setCartQty(p.id, v)
        renderCart()
      })
      row.querySelector("[data-act=inc]").addEventListener("click", () => {
        const v = Math.min(p.stock | 0, (qtyEl.value | 0) + 1)
        qtyEl.value = v
        setCartQty(p.id, v)
        renderCart()
      })
      qtyEl.addEventListener("change", () => {
        let v = qtyEl.value | 0
        if (v < 0) v = 0
        if (v > (p.stock | 0)) v = p.stock | 0
        qtyEl.value = v
        setCartQty(p.id, v)
        renderCart()
      })
      row.querySelector("[data-act=remove]").addEventListener("click", () => {
        removeFromCart(p.id)
        renderCart()
      })
      wrap.appendChild(row)
    })
    totalEl.textContent = price(cartTotal())
    let feeEl = document.getElementById("cart-delivery-fee")
    let grandEl = document.getElementById("cart-grand-total")
    if (feeEl && grandEl) {
      const sub = cartTotal()
      feeEl.textContent = price(deliveryFee(sub))
      grandEl.textContent = price(cartGrandTotal())
    }
    const clearBtn = document.getElementById("clear-cart")
    if (clearBtn) {
      clearBtn.disabled = items.length === 0
      clearBtn.onclick = () => {
        saveCart([])
        renderCart()
        updateCartCount()
      }
    }
    const checkoutLink = document.getElementById("checkout-link")
    if (checkoutLink) {
      const disabled = items.length === 0
      checkoutLink.style.pointerEvents = disabled ? "none" : ""
      checkoutLink.style.opacity = disabled ? "0.6" : ""
      checkoutLink.setAttribute("aria-disabled", disabled ? "true" : "false")
      checkoutLink.href = "checkout.html"
    }
  }
  function initCartPage() {
    renderCart()
  }

  // Checkout page
  function initCheckoutPage() {
    // Redirect to cart if empty
    if (cartCount() === 0) {
      location.href = "cart.html"
      return
    }
    const subtotalEl = document.getElementById("checkout-subtotal")
    const feeEl = document.getElementById("checkout-delivery-fee")
    const totalEl = document.getElementById("checkout-total")
    if (subtotalEl) subtotalEl.textContent = price(cartTotal())
    if (feeEl) feeEl.textContent = price(deliveryFee(cartTotal()))
    if (totalEl) totalEl.textContent = price(cartGrandTotal())
    const govSel = document.querySelector("select[name=governorate]")
    if (govSel && !govSel.dataset.filled) {
      governorates().forEach((g) => {
        const o = document.createElement("option")
        o.value = g
        o.textContent = g
        govSel.appendChild(o)
      })
      govSel.dataset.filled = "1"
    }
    const form = document.getElementById("checkout-form")
    const err = document.getElementById("checkout-error")
    const ok = document.getElementById("checkout-success")
    if (!form) return
    err.textContent = ""
    ok.textContent = ""
    err.className = ""
    ok.className = ""
    form.onsubmit = (e) => {
      e.preventDefault()
      err.textContent = ""
      ok.textContent = ""
      err.className = ""
      ok.className = ""
      const items = cartItemsDetailed()
      if (!items.length) {
        err.textContent = "Your cart is empty."
        err.className = "message-error"
        return
      }
      const formData = Object.fromEntries(new FormData(form).entries())
      if (
        !formData.fullName ||
        !formData.phone ||
        !formData.address ||
        !formData.city ||
        !formData.postalCode ||
        !formData.governorate
      ) {
        err.textContent = "Please fill in all required fields."
        err.className = "message-error"
        return
      }
      const phoneDigits = (formData.phone.match(/\d/g) || []).join("")
      if (phoneDigits.length < 8) {
        err.textContent = "Please provide a valid phone number (at least 8 digits)."
        err.className = "message-error"
        return
      }
      if (!/^\d{4}$/.test(formData.postalCode)) {
        err.textContent = "Postal code should be 4 digits."
        err.className = "message-error"
        return
      }

      // Stock validation
      const products = loadProducts()
      for (const it of items) {
        const p = products.find((pp) => pp.id === it.id)
        if (!p || (p.stock | 0) < (it.cartQty | 0)) {
          err.textContent = `Not enough stock for ${it.name}.`
          err.className = "message-error"
          return
        }
      }

      const order = {
        id: uid(),
        date: new Date().toISOString(),
        items: items.map((x) => ({ id: x.id, name: x.name, price: x.price, qty: x.cartQty })),
        subtotal: cartTotal(),
        deliveryFee: deliveryFee(cartTotal()),
        total: cartGrandTotal(),
        paymentMethod: "Cash on Delivery",
        status: "New",
        customer: {
          fullName: formData.fullName,
          phone: formData.phone,
          email: formData.email || "",
          address: formData.address,
          city: formData.city,
          governorate: formData.governorate,
          postalCode: formData.postalCode,
          notes: formData.notes || "",
        },
      }

      const orders = loadOrders()
      orders.unshift(order)
      saveOrders(orders)
      decrementStockFromOrder(order)
      saveCart([])
      updateCartCount()
      ok.textContent = "Order placed successfully! You will pay cash on delivery."
      ok.className = "message-success"
      form.reset()
      setTimeout(() => {
        location.href = "index.html"
      }, 1200)
    }
  }

  function governorates() {
    return [
      "Tunis",
      "Ariana",
      "Ben Arous",
      "Manouba",
      "Bizerte",
      "Nabeul",
      "Zaghouan",
      "Beja",
      "Jendouba",
      "Kef",
      "Siliana",
      "Sousse",
      "Monastir",
      "Mahdia",
      "Sfax",
      "Kairouan",
      "Kasserine",
      "Sidi Bouzid",
      "Gabes",
      "Medenine",
      "Tataouine",
      "Gafsa",
      "Tozeur",
      "Kebili",
    ]
  }

  // Admin login page
  function initAdminLoginPage() {
    const err = document.getElementById("admin-login-error")
    if (err) {
      err.style.display = "none"
      err.textContent = ""
    }
    const form = document.getElementById("admin-login-form")
    const pass = document.getElementById("admin-password")
    const toggle = document.getElementById("toggle-admin-pass")
    const remember = document.getElementById("admin-remember")
    if (toggle && pass) {
      toggle.onclick = () => {
        const type = pass.getAttribute("type") === "password" ? "text" : "password"
        pass.setAttribute("type", type)
        toggle.textContent = type === "password" ? "Show" : "Hide"
      }
    }
    if (form) {
      form.onsubmit = (e) => {
        e.preventDefault()
        if ((pass.value || "") === ADMIN_PASSWORD) {
          setAdminAuthed(true, remember && remember.checked)
          location.href = "admin.html"
        } else {
          if (err) {
            err.style.display = ""
            err.textContent = "Incorrect password."
          }
        }
      }
    }
  }

  // Admin page
  function renderAdminProducts() {
    let products = loadProducts()
    const rows = document.getElementById("product-rows")
    if (!rows) return
    rows.innerHTML = ""
    const onlyVisibleCbx = document.getElementById("admin-products-only-visible")
    if (onlyVisibleCbx && onlyVisibleCbx.checked) {
      products = products.filter((p) => p.active !== false)
    }
    products.forEach((p) => {
      const tr = document.createElement("tr")
      tr.innerHTML = `
        <td>
          <div style="font-weight:600;">${escapeHtml(p.name)}</div>
          <div class="muted" style="font-size:13px; max-width:420px;">${escapeHtml(p.description || "")}</div>
        </td>
        <td class="price" style="font-size: 16px;">${price(p.price)}</td>
        <td style="font-weight:600;">${p.stock | 0}</td>
        <td>${p.active ? '<span class="pill" style="background: rgba(16, 185, 129, 0.1); border-color: rgba(16, 185, 129, 0.2); color: var(--accent-success);">Active</span>' : '<span class="pill">Hidden</span>'}</td>
        <td>
          <div style="display:flex; gap:8px; flex-wrap:wrap;">
            <button class="nav-btn" data-act="edit">Edit</button>
            <button class="nav-btn" data-act="stock+">+1</button>
            <button class="nav-btn" data-act="stock-">-1</button>
            <button class="nav-btn" data-act="toggle">${p.active ? "Hide" : "Show"}</button>
            <button class="btn-danger" data-act="delete">Delete</button>
          </div>
        </td>
      `
      tr.querySelector("[data-act=edit]").onclick = () => fillProductForm(p)
      tr.querySelector("[data-act=stock+]").onclick = () => {
        p.stock = (p.stock | 0) + 1
        saveProducts(products)
        renderAdminProducts()
      }
      tr.querySelector("[data-act=stock-]").onclick = () => {
        p.stock = Math.max(0, (p.stock | 0) - 1)
        saveProducts(products)
        renderAdminProducts()
      }
      tr.querySelector("[data-act=toggle]").onclick = () => {
        p.active = !p.active
        saveProducts(products)
        renderAdminProducts()
      }
      tr.querySelector("[data-act=delete]").onclick = () => {
        if (!confirm("Delete this product?")) return
        const pwd = prompt("Enter product action password to confirm deletion:")
        if ((pwd || "") !== PRODUCT_ACTION_PASSWORD) {
          alert("Incorrect password.")
          return
        }
        const idx = products.findIndex((x) => x.id === p.id)
        if (idx >= 0) products.splice(idx, 1)
        saveProducts(products)
        renderAdminProducts()
      }
      rows.appendChild(tr)
    })
  }
  function renderAdminOrders() {
    const orders = loadOrders()
    const rows = document.getElementById("order-rows")
    if (!rows) return
    rows.innerHTML = ""

    // Stats tiles
    const revenueEl = document.getElementById("stat-revenue")
    const ordersEl = document.getElementById("stat-orders")
    const itemsEl = document.getElementById("stat-items")
    if (revenueEl && ordersEl && itemsEl) {
      const completed = orders.filter((o) => o.status === "Completed")
      const revenue = completed.reduce((s, o) => s + Number(o.total || 0), 0)
      const itemsSold = completed.reduce((s, o) => s + o.items.reduce((n, i) => n + (i.qty | 0), 0), 0)
      revenueEl.textContent = price(revenue)
      ordersEl.textContent = String(orders.length)
      itemsEl.textContent = String(itemsSold)
    }

    // Filtering
    const statusSel = document.getElementById("order-filter-status")
    const qInput = document.getElementById("order-search")
    const q = (qInput && qInput.value.toLowerCase().trim()) || ""
    const status = (statusSel && statusSel.value) || ""
    let list = orders
    if (status) list = list.filter((o) => o.status === status)
    if (q) {
      list = list.filter((o) => {
        const hay = `${o.id} ${o.customer.fullName} ${o.customer.phone}`.toLowerCase()
        return hay.includes(q)
      })
    }

    if (!list.length) {
      const tr = document.createElement("tr")
      tr.innerHTML = '<td colspan="8" class="muted" style="text-align:center; padding:40px 16px;">No orders yet.</td>'
      rows.appendChild(tr)
      return
    }
    list.forEach((order) => {
      const tr = document.createElement("tr")
      const itemsSummary = order.items.map((i) => `${escapeHtml(i.name)} × ${i.qty}`).join("<br/>")
      const statusColors = {
        New: "background: rgba(59, 130, 246, 0.1); border-color: rgba(59, 130, 246, 0.2); color: var(--accent-info);",
        Processing:
          "background: rgba(245, 158, 11, 0.1); border-color: rgba(245, 158, 11, 0.2); color: var(--accent-primary);",
        Completed:
          "background: rgba(16, 185, 129, 0.1); border-color: rgba(16, 185, 129, 0.2); color: var(--accent-success);",
        Cancelled:
          "background: rgba(239, 68, 68, 0.1); border-color: rgba(239, 68, 68, 0.2); color: var(--accent-danger);",
      }
      tr.innerHTML = `
        <td style="font-family: monospace; font-size: 13px;">${order.id.slice(-8)}</td>
        <td style="font-size: 13px;">${new Date(order.date).toLocaleString()}</td>
        <td>
          <div style="font-weight:600;">${escapeHtml(order.customer.fullName)}</div>
          <div class="muted" style="font-size:13px;">${escapeHtml(order.customer.phone)}</div>
        </td>
        <td style="font-size: 13px;">
          ${escapeHtml(order.customer.address)}, ${escapeHtml(order.customer.city)}<br/>
          ${escapeHtml(order.customer.governorate)} ${escapeHtml(order.customer.postalCode)}
        </td>
        <td style="font-size: 13px;">${itemsSummary}</td>
        <td class="price" style="font-size: 16px;">${price(order.total)}</td>
        <td>
          <span class="pill" style="${statusColors[order.status] || ""}">${escapeHtml(order.status)}</span>
        </td>
        <td>
          <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
            <button class="nav-btn" data-act="status-New" style="font-size: 12px; padding: 6px 12px;">New</button>
            <button class="nav-btn" data-act="status-Processing" style="font-size: 12px; padding: 6px 12px;">Processing</button>
            <button class="nav-btn" data-act="status-Completed" style="font-size: 12px; padding: 6px 12px;">Completed</button>
            <button class="btn-danger" data-act="status-Cancelled" style="font-size: 12px; padding: 6px 12px;">Cancel</button>
            <label class="pill" style="cursor: pointer; user-select: none;"><input type="checkbox" data-act="restock" style="accent-color:var(--accent-success); margin-right: 4px;"> Restock</label>
          </div>
        </td>
      `
      const restockCbx = tr.querySelector("[data-act=restock]")
      tr.querySelector("[data-act=status-New]").onclick = () => updateOrderStatus(order, "New")
      tr.querySelector("[data-act=status-Processing]").onclick = () => updateOrderStatus(order, "Processing")
      tr.querySelector("[data-act=status-Completed]").onclick = () => updateOrderStatus(order, "Completed")
      tr.querySelector("[data-act=status-Cancelled]").onclick = () =>
        updateOrderStatus(order, "Cancelled", restockCbx.checked)
      rows.appendChild(tr)
    })

    // CSV export
    const exportBtn = document.getElementById("order-export")
    if (exportBtn) {
      exportBtn.onclick = () => {
        const cols = [
          "id",
          "date",
          "customer",
          "phone",
          "address",
          "governorate",
          "postalCode",
          "status",
          "subtotal",
          "deliveryFee",
          "total",
          "items",
        ]
        const toCsv = (v) => '"' + String(v).replace(/"/g, '""') + '"'
        const lines = [cols.join(",")]
        list.forEach((o) => {
          const addr = `${o.customer.address}, ${o.customer.city}`
          const items = o.items.map((i) => `${i.name} x${i.qty}`).join("; ")
          const row = [
            o.id,
            new Date(o.date).toLocaleString(),
            o.customer.fullName,
            o.customer.phone,
            addr,
            o.customer.governorate,
            o.customer.postalCode,
            o.status,
            price(o.subtotal || 0),
            price(o.deliveryFee || 0),
            price(o.total || 0),
            items,
          ].map(toCsv)
          lines.push(row.join(","))
        })
        const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `orders_${Date.now()}.csv`
        a.click()
        URL.revokeObjectURL(url)
      }
    }
  }
  function updateOrderStatus(order, status, restock = false) {
    const orders = loadOrders()
    const idx = orders.findIndex((o) => o.id === order.id)
    if (idx < 0) return
    if (status === "Cancelled" && order.status !== "Cancelled" && restock) {
      // Restock items
      const products = loadProducts()
      order.items.forEach((item) => {
        const p = products.find((pp) => pp.id === item.id)
        if (p) p.stock = (p.stock | 0) + (item.qty | 0)
      })
      saveProducts(products)
    }
    orders[idx] = { ...orders[idx], status }
    saveOrders(orders)
    renderAdminProducts()
    renderAdminOrders()
  }
  function fillProductForm(p) {
    const form = document.getElementById("product-form")
    if (!form) return
    form.querySelector("input[name=id]").value = p.id
    form.querySelector("input[name=name]").value = p.name
    form.querySelector("input[name=price]").value = p.price
    form.querySelector("input[name=stock]").value = p.stock
    form.querySelector("input[name=imageUrl]").value = p.imageUrl || ""
    form.querySelector("input[name=description]").value = p.description || ""
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  function initAdminPage() {
    if (!requireAdminOrRedirect()) return
    
    // Tab switching with proper styling and re-rendering
    const tabs = document.querySelectorAll("#view-admin [data-tab]")
    const switchTab = (tabName) => {
      tabs.forEach((btn) => {
        if (btn.getAttribute("data-tab") === tabName) {
          btn.style.background = "linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)"
          btn.style.color = "white"
          btn.style.boxShadow = "var(--shadow-glow-purple)"
        } else {
          btn.style.background = ""
          btn.style.color = ""
          btn.style.boxShadow = ""
        }
      })
      document.getElementById("admin-products").style.display = tabName === "products" ? "" : "none"
      document.getElementById("admin-orders").style.display = tabName === "orders" ? "" : "none"
      
      // Re-render the active tab to ensure fresh data
      if (tabName === "products") {
        renderAdminProducts()
      } else if (tabName === "orders") {
        renderAdminOrders()
      }
    }
    
    tabs.forEach((t) => {
      t.onclick = () => switchTab(t.getAttribute("data-tab"))
    })

    const statusSel = document.getElementById("order-filter-status")
    const qInput = document.getElementById("order-search")
    if (statusSel) statusSel.addEventListener("change", renderAdminOrders)
    if (qInput) qInput.addEventListener("input", renderAdminOrders)

    // Initialize with products tab
    switchTab("products")
    renderAdminOrders()

    const form = document.getElementById("product-form")
    if (form) {
      form.onsubmit = (e) => {
        e.preventDefault()
        const data = Object.fromEntries(new FormData(form).entries())
        const products = loadProducts()
        const isEdit = !!data.id
        const p = {
          id: data.id || uid(),
          name: data.name,
          category: data.category || "",
          price: Number(data.price || 0),
          stock: Number(data.stock || 0),
          imageUrl: data.imageUrl || "",
          description: data.description || "",
          active: true,
          createdAt: data.id ? (products.find((x) => x.id === data.id)?.createdAt || Date.now()) : Date.now(),
        }
        if (isEdit) {
          const idx = products.findIndex((x) => x.id === data.id)
          if (idx >= 0) products[idx] = { ...products[idx], ...p }
        } else {
          products.unshift(p)
        }
        saveProducts(products)
        form.reset()
        renderAdminProducts()
        renderShop()
        alert(isEdit ? "Product updated successfully!" : "Product added successfully!")
      }
      form.onreset = () => {
        form.querySelector("input[name=id]").value = ""
      }
    }

    const onlyVisibleCbx = document.getElementById("admin-products-only-visible")
    if (onlyVisibleCbx) onlyVisibleCbx.addEventListener("change", renderAdminProducts)
  }

  // Session cart reset: once per tab session only
  function clearCartOnFirstVisit() {
    if (!sessionStorage.getItem("tndshop_cart_reset")) {
      saveCart([])
      sessionStorage.setItem("tndshop_cart_reset", "1")
    }
  }

  // Bootstrap
  function boot() {
    seedProductsIfEmpty()
    clearCartOnFirstVisit()
    restoreAdminRemember()
    setupNav()

    const page = document.body.getAttribute("data-page")
    switch (page) {
      case "shop":
        initShopPage()
        break
      case "cart":
        initCartPage()
        break
      case "checkout":
        initCheckoutPage()
        break
      case "admin-login":
        initAdminLoginPage()
        break
      case "admin":
        initAdminPage()
        break
      default:
        // no-op
        break
    }
  }

  document.addEventListener("DOMContentLoaded", boot)
})()
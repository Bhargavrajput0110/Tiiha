# Tiiha — Architectural Fashion

Premium e-commerce fashion brand with React frontend, Supabase backend, and Shiprocket integration.

## Quick Start

### 1. Frontend (index.html)
Open `index.html` directly in a browser, or serve via any static hosting.

Configure these variables in the browser console before loading:
```js
window.BACKEND_URL = 'https://your-backend.com'; // For Shiprocket API
window.RAZORPAY_KEY_ID = 'rzp_live_xxx'; // Your Razorpay live key
```

### 2. Backend (server.js)
```bash
# Install dependencies
npm install express cors dotenv node-fetch

# Copy env file
cp .env.example .env

# Edit .env with your Shiprocket credentials
# Start server
node server.js
```

### 3. Database (database/schema.sql)
Run the SQL schema in Supabase SQL Editor.

### 4. Seed Products
Open `seed.html` to populate the database with 20 initial products.

## Environment Variables

| Variable | Description |
|----------|-------------|
| `SHIPROCKET_EMAIL` | Shiprocket API email |
| `SHIPROCKET_PASSWORD` | Shiprocket API password |
| `FRONTEND_URL` | Your frontend domain for CORS |
| `PORT` | Backend server port (default: 3000) |

## File Structure

```
├── index.html          # Main React frontend
├── admin.html          # CMS admin panel
├── server.js           # Shiprocket API proxy backend
├── seed.html           # Database seeder
├── database/
│   └── schema.sql      # Supabase database schema
└── .env.example        # Environment template
```

## Features

- Custom cursor interaction
- Product archive with filtering
- Razorpay payment integration
- Shiprocket automatic fulfillment
- Admin CMS for products/orders/settings
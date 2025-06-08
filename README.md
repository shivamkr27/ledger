# Vyapaal - Business Management System

A comprehensive business management system for construction material suppliers, built with Node.js, Express, MongoDB, and modern web technologies.

## Features

- User Authentication (Login/Signup)
- Order Management
- Rate Management
- Inventory Management
- Ledger (Coming Soon)
- Staff Management (Coming Soon)
- Wholesaler Management (Coming Soon)

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- MongoDB Compass (optional, for database visualization)

## Setup Instructions

1. Clone the repository:
```bash
git clone <repository-url>
cd vyapaal
```

2. Install frontend dependencies:
```bash
npm install
```

3. Install backend dependencies:
```bash
cd backend
npm install
```

4. Create a `.env` file in the backend directory:
```
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/vyapaal
JWT_SECRET=your_jwt_secret_here
```

5. Start MongoDB:
- Windows: MongoDB should be running as a service
- Linux/Mac: `sudo service mongod start` or `brew services start mongodb-community`

6. Seed initial data:
```bash
cd backend
npm run seed
```

7. Start the backend server:
```bash
npm run dev
```

8. Open the frontend:
- Open `index.html` in your browser
- Or use a local server (e.g., Live Server VS Code extension)

## Accessing the Application

- Frontend: Open `index.html` in your browser
- Backend API: `http://localhost:5000`

## API Endpoints

### Authentication
- POST `/api/auth/signup` - Register a new user
- POST `/api/auth/login` - Login user
- GET `/api/protected` - Verify JWT token

### Orders
- GET `/api/orders?date=YYYY-MM-DD` - Get orders for a specific date
- POST `/api/orders` - Create a new order
- PUT `/api/orders/:id` - Update an order
- DELETE `/api/orders/:id` - Delete an order

### Rates
- GET `/api/rates` - Get all rates
- POST `/api/rates` - Add a new rate
- PUT `/api/rates/:id` - Update a rate
- DELETE `/api/rates/:id` - Delete a rate

### Inventory
- GET `/api/inventory` - Get all inventory items
- POST `/api/inventory` - Add a new inventory item
- PUT `/api/inventory/:id` - Update an inventory item
- DELETE `/api/inventory/:id` - Delete an inventory item

## Database Structure

The application uses MongoDB with the following collections:

- `users` - User authentication data
- `orders` - Order management data
- `rates` - Rate management data
- `inventory` - Inventory management data
- `ledger` - Placeholder for ledger data
- `staff` - Placeholder for staff data
- `wholesalers` - Placeholder for wholesaler data

## Development

- Frontend files are in the root directory
- Backend files are in the `backend` directory
- Use `npm run dev` in the backend directory for development with auto-reload

## Security

- JWT-based authentication
- Password hashing with bcrypt
- Protected API routes
- CORS enabled for local development

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License. 
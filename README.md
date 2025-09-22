# TechniZlecenia

A full-stack application with a Rust backend API and React frontend for managing posts and user authentication.

## Features

### Backend (Rust + Axum + PostgreSQL)
- User authentication with JWT tokens
- User registration and login
- CRUD operations for posts
- Pagination support
- Password validation (must be from @technischools.com domain)
- Secure password hashing with Argon2

### Frontend (React + TypeScript + Tailwind CSS + shadcn/ui)
- User authentication (login/register)
- Protected routes
- Responsive design with Tailwind CSS
- Form validation with Zod
- React Hook Form integration
- Modern UI components with shadcn/ui
- Paginated posts list
- Individual post detail view

## Project Structure

```
TechniZlecenia/
├── api/                    # Rust backend
│   ├── src/
│   │   ├── api/           # API endpoints
│   │   ├── db/            # Database operations
│   │   ├── server/        # Business logic & types
│   │   └── main.rs
│   ├── migrations/        # Database migrations
│   └── Cargo.toml
└── src/                   # React frontend
    ├── src/
    │   ├── components/    # UI components
    │   ├── contexts/      # React contexts
    │   ├── lib/           # Utilities & validations
    │   ├── pages/         # Route components
    │   └── services/      # API services
    └── package.json
```

## Prerequisites

- Rust (latest stable version)
- Node.js (18+)
- PostgreSQL
- Docker (optional, for database)

## Setup Instructions

### Database Setup

1. Start PostgreSQL (using Docker):
```bash
docker run --name postgres-db -e POSTGRES_PASSWORD=password -e POSTGRES_DB=technizlecenia -p 5432:5432 -d postgres:15
```

2. Set environment variables for the API:
```bash
export DATABASE_URL="postgresql://postgres:password@localhost/technizlecenia"
export ACCESS_TOKEN_SECRET="your-access-token-secret"
export REFRESH_TOKEN_SECRET="your-refresh-token-secret"
```

### Backend Setup

1. Navigate to the API directory:
```bash
cd api
```

2. Install dependencies and run migrations:
```bash
cargo install sqlx-cli
sqlx migrate run
```

3. Start the backend server:
```bash
cargo run
```

The API will be available at `http://localhost:3000`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd src
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

The frontend will be available at `http://localhost:3001`

## API Endpoints

### Authentication
- `POST /auth/register` - Register a new user
- `POST /auth/login` - Login user
- `POST /auth/refresh` - Refresh access token

### User
- `GET /user/me` - Get current user information

### Posts
- `GET /posts/` - Get paginated posts (query params: `page`, `per_page`)
- `GET /posts/{id}` - Get specific post
- `POST /posts/create` - Create new post (requires authentication)
- `POST /posts/update` - Update existing post (requires authentication)
- `DELETE /posts/{id}` - Delete post (requires authentication)

## Validation Rules

### User Registration/Login
- Email must be from @technischools.com domain
- Password must be at least 8 characters
- Password must contain uppercase, lowercase, and number
- Username must be 3-30 characters (letters, numbers, underscores only)

### Posts
- Title: 1-100 characters
- Description: 1-2000 characters

## Routes (Frontend)

- `/` - Homepage with paginated posts (protected)
- `/login` - User login page
- `/register` - User registration page
- `/posts/{id}` - Individual post view (protected)

## Technologies Used

### Backend
- **Rust** - Programming language
- **Axum** - Web framework
- **SQLx** - Database toolkit
- **PostgreSQL** - Database
- **Argon2** - Password hashing
- **JWT** - Authentication tokens
- **Serde** - Serialization/deserialization

### Frontend
- **React 18** - UI framework
- **TypeScript** - Type safety
- **React Router** - Routing
- **React Hook Form** - Form handling
- **Zod** - Schema validation
- **Axios** - HTTP client
- **Tailwind CSS** - Styling
- **shadcn/ui** - UI components
- **Lucide React** - Icons

## Development Notes

- The backend validates that users can only modify their own posts
- JWT tokens are automatically refreshed when they expire
- The frontend includes protected routes that redirect to login
- Password validation happens on both frontend and backend
- All API responses follow consistent error handling patterns

## Building for Production

### Backend
```bash
cd api
cargo build --release
```

### Frontend
```bash
cd src
npm run build
```

The built files will be in the `build/` directory.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
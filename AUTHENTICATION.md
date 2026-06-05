# Authentication Setup - Melegy

This document covers the authentication system setup for the Melegy app using Amazon Aurora PostgreSQL.

## Database Setup

### 1. Create the Aurora PostgreSQL Instance

The authentication system requires Amazon Aurora PostgreSQL. You get 25GB of storage free for 12 months.

### 2. Run Database Schema

Execute the SQL script to create the necessary tables:

```bash
# From the project root, run the schema setup script
# The script is located at: scripts/001-setup-auth-schema.sql

# If using AWS RDS/Aurora console:
# Copy the SQL from the script and run it directly
```

**Tables created:**
- `users` — Stores user account information
- `sessions` — Stores session tokens for authentication

### 3. Environment Variables

Add these to your `.env` file or Vercel project settings:

```env
# Aurora PostgreSQL Connection
PGHOST=your-aurora-endpoint.rds.amazonaws.com
PGDATABASE=melegy
PGUSER=postgres
AWS_REGION=us-east-1
AWS_ROLE_ARN=arn:aws:iam::YOUR_ACCOUNT_ID:role/YOUR_ROLE

# Google OAuth (Optional - Add when ready)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
NEXTAUTH_URL=http://localhost:3000
```

## Features Implemented

### Email/Password Authentication
- ✅ User registration with email and password
- ✅ Login with email and password
- ✅ Session management with secure HTTP-only cookies
- ✅ Password hashing using bcryptjs
- ✅ Session expiration (30 days default)

### Google OAuth (Ready to Enable)
- 🔄 Structure in place for Google OAuth
- 🔄 Requires `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
- 🔄 Callback route ready at `/api/auth/google/callback`

## API Endpoints

### `POST /api/auth/register`
Register a new user.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123",
  "name": "Ahmed Mohamed" // optional
}
```

**Response:**
```json
{
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "Ahmed Mohamed"
  }
}
```

### `POST /api/auth/login`
Login with email and password.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Response:**
Sets `auth_token` HTTP-only cookie and returns:
```json
{
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "Ahmed Mohamed"
  }
}
```

### `POST /api/auth/logout`
Logout the current user.

**Response:**
```json
{ "success": true }
```

Clears the `auth_token` cookie.

### `GET /api/auth/session`
Get the current authenticated user's session.

**Response:**
```json
{
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "Ahmed Mohamed"
  }
}
```

Or if not authenticated:
```json
{ "user": null }
```

## Frontend Usage

### Using the AuthContext

```tsx
'use client'

import { useAuth } from '@/lib/contexts/AuthContext'

export function MyComponent() {
  const { user, loading, login, register, logout } = useAuth()

  if (loading) return <div>Loading...</div>

  if (user) {
    return (
      <div>
        Welcome, {user.name || user.email}!
        <button onClick={logout}>Logout</button>
      </div>
    )
  }

  return <div>Please login</div>
}
```

### Protected Routes

Use the `useProtectedRoute` hook to protect pages:

```tsx
'use client'

import { useProtectedRoute } from '@/lib/hooks/useProtectedRoute'

export default function DashboardPage() {
  const { isLoading, isAuthenticated } = useProtectedRoute()

  if (isLoading) return <div>Loading...</div>
  if (!isAuthenticated) return null // Automatically redirects to /login

  return <div>Dashboard content (only visible to authenticated users)</div>
}
```

## Pages

### Login Page
- **Route:** `/login`
- **Component:** `LoginForm`
- **Features:** Email/password login, signup link, Google OAuth placeholder

### Signup Page
- **Route:** `/signup`
- **Component:** `SignupForm`
- **Features:** Registration with name (optional), email, password confirmation, login link, Google OAuth placeholder

## Files Structure

```
app/
  api/auth/
    register/route.ts       # User registration endpoint
    login/route.ts          # Login endpoint
    logout/route.ts         # Logout endpoint
    session/route.ts        # Session check endpoint
    google/
      callback/route.ts     # Google OAuth callback (ready to use)
  login/page.tsx            # Login page
  signup/page.tsx           # Signup page

components/auth/
  login-form.tsx            # Login form component
  signup-form.tsx           # Signup form component

lib/
  auth.ts                   # Authentication utilities and database queries
  db.ts                     # Aurora PostgreSQL connection
  contexts/
    AuthContext.tsx         # React Context for auth state
  hooks/
    useProtectedRoute.ts    # Hook for protecting routes

scripts/
  001-setup-auth-schema.sql # Database schema
```

## Security Features

✅ **Password Hashing** — Using bcryptjs with salt rounds=10
✅ **HTTP-Only Cookies** — Session tokens stored securely
✅ **Session Expiration** — Default 30 days, configurable
✅ **SQL Injection Prevention** — Using parameterized queries
✅ **CSRF Protection** — Built-in with Next.js
✅ **Secure Session Tokens** — 32-byte cryptographic random tokens

## Google OAuth Setup (When Ready)

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing one
3. Enable Google+ API
4. Create OAuth 2.0 credentials (Web application)
5. Add authorized redirect URIs:
   - `http://localhost:3000/api/auth/google/callback` (development)
   - `https://yourdomain.com/api/auth/google/callback` (production)
6. Add `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` to environment variables

## Troubleshooting

### "Email already exists"
User with that email is already registered. Use login instead or use a different email.

### "Invalid email or password"
Either the email doesn't exist or the password is incorrect.

### Session cookie not being set
Ensure you're accessing the site over HTTPS in production. HTTP-only cookies require secure connections in production environments.

### Google OAuth not working
- Verify `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set correctly
- Check that callback URL in Google Console matches your redirect URI
- Ensure the app is deployed to the correct domain

## Next Steps

1. ✅ Email/password authentication is ready to use
2. 🔄 Enable Google OAuth by adding credentials to environment variables
3. 🔄 Create a user dashboard/profile page
4. 🔄 Add password reset functionality
5. 🔄 Add email verification (optional)
6. 🔄 Add two-factor authentication (optional)

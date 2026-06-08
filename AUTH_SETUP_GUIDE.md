# Authentication System Setup Guide

This guide covers the email/password and Google OAuth authentication system that has been implemented.

## What's Been Set Up

### 1. **Database Schema (AWS Aurora PostgreSQL)**
- Created auth tables for user management:
  - `auth_users` - Stores user accounts with email, password hashes, and Google OAuth IDs
  - `auth_sessions` - Manages user sessions with token-based authentication
  - `conversations` - Stores user conversations (linked to auth users)
  - `chat_messages` - Stores individual chat messages per conversation

### 2. **Backend API Routes**
- **POST `/api/auth/signup`** - User registration with email/password
- **POST `/api/auth/login`** - User login with email/password
- **POST `/api/auth/google/callback`** - Google OAuth callback handler
- **POST `/api/auth/logout`** - User logout
- **GET `/api/auth/user`** - Get current user info (requires Authorization header with token)

### 3. **Frontend Authentication**
- **AuthContext** (`lib/contexts/AuthContext.tsx`) - Manages auth state globally
- **Login Page** (`app/login/page.tsx`) - User login form
- **Signup Page** (`app/signup/page.tsx`) - User registration form
- **Auth Persistence** - Session token stored in localStorage

### 4. **Database Module**
- **`lib/auth-db.ts`** - PostgreSQL database functions for user/session management
- Uses AWS IAM authentication for secure database access
- Supports transaction operations for data consistency

## Initial Database Setup

Run the migration script to create all tables:

```bash
node scripts/run-migrations.mjs
```

This will execute the SQL schema file: `scripts/008-create-auth-schema.sql`

## Using the Authentication System

### Frontend Usage

```tsx
import { useAuth } from '@/lib/contexts/AuthContext'

export function MyComponent() {
  const { user, token, logIn, signUp, logOut, loading, error } = useAuth()

  const handleSignup = async () => {
    await signUp('user@example.com', 'password', 'First', 'Last')
  }

  const handleLogin = async () => {
    await logIn('user@example.com', 'password')
  }

  if (loading) return <div>Loading...</div>
  if (user) return <div>Logged in as {user.email}</div>
  
  return <button onClick={handleSignup}>Sign Up</button>
}
```

### Protected Route Example

```tsx
'use client'

import { useAuth } from '@/lib/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export function ProtectedComponent() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading])

  if (loading) return <div>Loading...</div>
  if (!user) return null

  return <div>Protected content for {user.email}</div>
}
```

## Environment Variables

The following environment variables are automatically set by the AWS Aurora PostgreSQL integration:

- `AWS_REGION` - AWS region
- `AWS_ROLE_ARN` - IAM role ARN for authentication
- `PGHOST` - Database host
- `PGUSER` - Database user
- `PGDATABASE` - Database name

## Google OAuth Setup (Future)

To add Google sign-in:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new OAuth 2.0 credential (Web application)
3. Add authorized redirect URI: `https://your-domain.com/api/auth/google/callback`
4. Get Client ID and Client Secret
5. Add to environment variables: `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
6. Implement Google Sign-In button in frontend

## Features

✅ Email/password authentication
✅ Password hashing with bcryptjs
✅ Session-based authentication with tokens
✅ Automatic session expiration (30 days)
✅ Google OAuth support (ready for implementation)
✅ User profile management
✅ Conversation auto-save per user
✅ Transaction support for complex operations

## Security Notes

- Passwords are hashed using bcryptjs (10 salt rounds)
- Sessions use secure 32-byte random tokens
- Database uses AWS IAM authentication (no passwords in code)
- All API endpoints validate input
- Session tokens expire after 30 days
- HTTPS required in production

## User Model

```typescript
interface AuthUser {
  id: number
  email: string
  password_hash?: string | null  // Not returned to frontend
  google_id?: string | null
  first_name?: string | null
  last_name?: string | null
  created_at: string
  updated_at: string
}
```

## Next Steps

1. Run the database migration: `node scripts/run-migrations.mjs`
2. Test login/signup on `/login` and `/signup` pages
3. Implement Google OAuth (optional)
4. Update main page to redirect unauthenticated users to login
5. Add user profile page
6. Add logout button to main navigation

---

For questions or issues, check the console logs (they use `[v0]` prefix for debugging).

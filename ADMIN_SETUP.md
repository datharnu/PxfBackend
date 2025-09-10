# Admin User Setup Guide

## Overview

Your application now supports role-based authentication with three user types:

- `user` (default) - Regular users
- `admin` - Administrative users with access to admin routes
- `superadmin` - Super administrative users with full access

## Setting Up Admin Users

### 1. Environment Variable Setup

Add the following environment variable to your `.env` file:

```env
ADMIN_SIGNUP_KEY=your-secure-admin-key-here
```

**Important**: Choose a strong, unique key for `ADMIN_SIGNUP_KEY`. This key is required to create admin accounts and should be kept secret.

### 2. Creating an Admin User

Use the admin signup endpoint to create an admin user:

**Endpoint**: `POST /api/v1/auth/admin-signup`

**Request Body**:

```json
{
  "fullname": "Admin User",
  "email": "admin@example.com",
  "password": "securepassword123",
  "confirmPassword": "securepassword123",
  "adminKey": "your-secure-admin-key-here"
}
```

**Example using curl**:

```bash
curl -X POST http://localhost:3000/api/v1/auth/admin-signup \
  -H "Content-Type: application/json" \
  -d '{
    "fullname": "Admin User",
    "email": "admin@example.com",
    "password": "securepassword123",
    "confirmPassword": "securepassword123",
    "adminKey": "your-secure-admin-key-here"
  }'
```

### 3. Admin Login

Admin users can log in using the regular login endpoint:

**Endpoint**: `POST /api/v1/auth/signin`

**Request Body**:

```json
{
  "email": "admin@example.com",
  "password": "securepassword123"
}
```

The JWT token returned will include the user's role, allowing access to admin routes.

### 4. Accessing Admin Routes

Admin routes are protected by the `isAdminAuthenticated` middleware and require:

- Valid JWT token
- User role of `admin` or `superadmin`
- Active user account

**Admin Routes Available**:

- `GET /api/v1/admin/stats` - Get admin statistics
- `GET /api/v1/admin/users` - Get all users (paginated)
- `PATCH /api/v1/admin/users/:userId/toggle` - Toggle user active status
- `GET /api/v1/admin/events` - Get all events (paginated)
- `PATCH /api/v1/admin/events/:eventId/toggle` - Toggle event active status

### 5. Database Migration

The role system has been added to your database. If you haven't run the migration yet:

```bash
npx sequelize-cli db:migrate
```

This adds a `role` column to the `users` table with the following values:

- `user` (default for existing users)
- `admin`
- `superadmin`

## Security Notes

1. **Admin Key**: Keep your `ADMIN_SIGNUP_KEY` secure and don't commit it to version control
2. **Password Requirements**: Admin passwords must be at least 8 characters long
3. **Role Validation**: The system validates roles in JWT tokens and database
4. **Access Control**: Admin routes are protected and require proper authentication

## User Roles

- **user**: Regular users with standard access
- **admin**: Can access admin dashboard and manage users/events
- **superadmin**: Full administrative access (currently same as admin, but can be extended)

## Example Admin User Creation

```bash
# Set your admin key in environment
export ADMIN_SIGNUP_KEY="my-super-secure-admin-key-2024"

# Create admin user
curl -X POST http://localhost:3000/api/v1/auth/admin-signup \
  -H "Content-Type: application/json" \
  -d '{
    "fullname": "System Administrator",
    "email": "admin@yourcompany.com",
    "password": "AdminPass123!",
    "confirmPassword": "AdminPass123!",
    "adminKey": "my-super-secure-admin-key-2024"
  }'
```

After successful creation, you can log in and access admin routes using the returned JWT token.

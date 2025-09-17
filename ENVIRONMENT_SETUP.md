# Environment Variables Setup

## Required Environment Variables

Add these environment variables to your `.env` file:

### Database Configuration

```env
DB_NAME=your_database_name
DB_USER=your_database_user
DB_PASSWORD=your_database_password
DB_HOST=localhost
DB_PORT=5432
DB_DIALECT=postgres
DB_SSL=false
DB_SSL_REJECT_UNAUTHORIZED=false

# Alternative: Use DATABASE_URL for production
# DATABASE_URL=postgresql://user:password@host:port/database
```

### Server Configuration

```env
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

### JWT Configuration

```env
JWT_SECRET=your-super-secret-jwt-key-here
JWT_REFRESH_SECRET=your-super-secret-refresh-key-here
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
```

### Google OAuth Configuration

```env
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### Cloudinary Configuration

```env
CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret
```

### Google Cloud Vision API Configuration

```env
GOOGLE_VISION_API_KEY=your-google-vision-api-key
GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account-key.json
```

### Email Configuration (Optional)

```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=noreply@yourapp.com
```

### Paystack Configuration (Optional)

```env
PAYSTACK_SECRET_KEY=your-paystack-secret-key
PAYSTACK_PUBLIC_KEY=your-paystack-public-key
```

## Getting Google Cloud Vision API Credentials

1. **Create Google Cloud Account**: Go to [Google Cloud Console](https://console.cloud.google.com)
2. **Create a Project**:
   - Create a new project or select existing one
   - Enable the Vision API
3. **Get API Key**:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "API Key"
   - Copy the API key
4. **Optional - Service Account** (for production):
   - Create a service account
   - Download the JSON key file
   - Set `GOOGLE_APPLICATION_CREDENTIALS` to the file path

## Google Cloud Vision API Pricing

- **Free Tier**: 1,000 requests per month
- **Paid**: $1.50 per 1,000 requests
- **No approval required** for face detection and matching

For most applications, the free tier should be sufficient for testing and small-scale usage.

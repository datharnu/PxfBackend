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

### Azure Face API Configuration (NEW)

```env
AZURE_FACE_ENDPOINT=https://your-region.cognitiveservices.azure.com/
AZURE_FACE_KEY=your-azure-face-api-key
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

## Getting Azure Face API Credentials

1. **Create Azure Account**: Go to [Azure Portal](https://portal.azure.com)
2. **Create Face Resource**:
   - Search for "Face" in Azure services
   - Click "Create" and select "Face"
   - Choose your subscription and resource group
   - Select pricing tier (F0 for free tier, S0 for standard)
   - Choose region (recommend same as your app)
3. **Get Credentials**:
   - Go to your Face resource
   - Copy the "Endpoint" URL
   - Go to "Keys and Endpoint" and copy "Key 1"

## Azure Face API Pricing

- **Free Tier (F0)**: 20 calls per minute, 30,000 calls per month
- **Standard Tier (S0)**: 10 calls per second, unlimited calls

For most applications, the free tier should be sufficient for testing and small-scale usage.

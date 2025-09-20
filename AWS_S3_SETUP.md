# AWS S3 Setup Guide

## Environment Variables

Add these environment variables to your `.env` file:

```bash
# AWS S3 Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key
AWS_S3_BUCKET_NAME=your-bucket-name
```

## AWS S3 Bucket Setup

### 1. Create S3 Bucket

1. Go to AWS S3 Console
2. Create a new bucket with a unique name
3. Choose your preferred region
4. Enable public read access for uploaded files

### 2. Bucket Policy

Add this bucket policy to allow public read access:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::your-bucket-name/*"
    }
  ]
}
```

### 3. CORS Configuration

Add this CORS configuration to your bucket:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedOrigins": ["*"],
    "ExposeHeaders": []
  }
]
```

### 4. IAM User Permissions

Create an IAM user with these permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:PutObjectAcl",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:HeadObject"
      ],
      "Resource": "arn:aws:s3:::your-bucket-name/*"
    }
  ]
}
```

## API Endpoints

### New S3 Upload Flow

1. **Get Presigned URL**: `POST /api/v1/media/event/:eventId/s3-presigned-url`
2. **Upload to S3**: Use presigned URL to upload file directly to S3
3. **Submit Media**: `POST /api/v1/media/event/:eventId/submit-s3-media`

### Request Examples

#### Get Presigned URL

```bash
curl -X POST http://localhost:3001/api/v1/media/event/{eventId}/s3-presigned-url \
  -H "Content-Type: application/json" \
  -d '{
    "fileName": "photo.jpg",
    "mimeType": "image/jpeg"
  }'
```

#### Upload File to S3

```bash
curl -X PUT {presigned_url} \
  -H "Content-Type: image/jpeg" \
  --data-binary @photo.jpg
```

#### Submit Media URLs

```bash
curl -X POST http://localhost:3001/api/v1/media/event/{eventId}/submit-s3-media \
  -H "Content-Type: application/json" \
  -d '{
    "mediaUrls": [{
      "url": "https://your-bucket.s3.region.amazonaws.com/path/to/file.jpg",
      "fileName": "photo.jpg",
      "fileSize": 13738808,
      "mimeType": "image/jpeg",
      "s3Key": "events/eventId/images/userId/timestamp-random.jpg"
    }]
  }'
```

## File Size Limits

- **Images**: Up to 50MB (configurable)
- **Videos**: Up to 200MB (configurable)
- **Total**: No S3 limit (up to 5TB per object)

## Benefits over Cloudinary

- ✅ **No 10MB file size limit**
- ✅ **No hourly request limits**
- ✅ **More cost-effective for large files**
- ✅ **Better performance for large uploads**
- ✅ **Full control over file storage**

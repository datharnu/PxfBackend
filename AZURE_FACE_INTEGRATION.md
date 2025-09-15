# Azure Face API Integration

This document describes the Azure Face API integration for automatic face detection and identification in event photos and videos.

## Overview

The system uses Microsoft Azure Face API to:

1. **Detect faces** in uploaded images automatically
2. **Identify faces** by matching them to enrolled user profiles
3. **Filter media** to show only photos/videos containing specific users
4. **Enable easy download** of personalized photo collections

## Features

### 🎯 Face Detection

- Automatic face detection in uploaded images
- Face attribute extraction (age, gender, emotions, etc.)
- Face rectangle coordinates for precise location

### 👤 Face Enrollment

- Users can enroll their face for an event
- One face profile per user per event
- High-quality enrollment validation

### 🔍 Face Identification

- Automatic identification of faces in new uploads
- Confidence-based matching
- Support for multiple faces per image

### 📱 Filtered Media Access

- Get all photos/videos containing a specific user
- Paginated results for performance
- Face detection metadata included

## Environment Variables

Add these environment variables to your `.env` file:

```env
# Azure Face API Configuration
AZURE_FACE_ENDPOINT=https://your-region.cognitiveservices.azure.com/
AZURE_FACE_KEY=your-azure-face-api-key
```

### Getting Azure Face API Credentials

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

## Database Schema

### Face Detection Table

```sql
CREATE TABLE face_detections (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  event_id UUID REFERENCES events(id),
  media_id UUID REFERENCES event_media(id),
  face_id VARCHAR NOT NULL,
  persisted_face_id VARCHAR,
  face_rectangle JSONB NOT NULL,
  face_attributes JSONB,
  confidence FLOAT NOT NULL,
  is_identified BOOLEAN DEFAULT FALSE,
  identified_user_id UUID REFERENCES users(id),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### User Face Profile Table

```sql
CREATE TABLE user_face_profiles (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  event_id UUID REFERENCES events(id),
  persisted_face_id VARCHAR UNIQUE NOT NULL,
  face_id VARCHAR NOT NULL,
  enrollment_media_id UUID REFERENCES event_media(id),
  face_rectangle JSONB NOT NULL,
  face_attributes JSONB,
  enrollment_confidence FLOAT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, event_id)
);
```

## API Endpoints

### Face Management

#### Enroll User Face

```http
POST /api/v1/faces/events/:eventId/enroll
Authorization: Bearer <token>
Content-Type: application/json

{
  "mediaId": "uuid-of-enrollment-image"
}
```

#### Get User Face Profile

```http
GET /api/v1/faces/events/:eventId/profile
Authorization: Bearer <token>
```

#### Delete User Face Profile

```http
DELETE /api/v1/faces/events/:eventId/profile
Authorization: Bearer <token>
```

#### Get Face Detection Statistics (Admin/Event Creator)

```http
GET /api/v1/faces/events/:eventId/stats
Authorization: Bearer <token>
```

#### Get Event Face Profiles (Admin/Event Creator)

```http
GET /api/v1/faces/events/:eventId/profiles?page=1&limit=20
Authorization: Bearer <token>
```

#### Get Media Face Detections

```http
GET /api/v1/faces/media/:mediaId/faces
Authorization: Bearer <token>
```

### Media Filtering

#### Get Media with User's Face

```http
GET /api/v1/media/event/:eventId/my-faces?page=1&limit=20
Authorization: Bearer <token>
```

#### Get All Face Detections (Admin/Event Creator)

```http
GET /api/v1/media/event/:eventId/face-detections?page=1&limit=20
Authorization: Bearer <token>
```

#### Get Face Statistics (Admin/Event Creator)

```http
GET /api/v1/media/event/:eventId/face-stats
Authorization: Bearer <token>
```

#### Retrain Face Identification (Admin/Event Creator)

```http
POST /api/v1/media/event/:eventId/retrain-faces
Authorization: Bearer <token>
```

## Usage Flow

### 1. User Enrollment

```javascript
// User uploads a clear photo of themselves
const enrollmentResponse = await fetch(
  "/api/v1/media/event/:eventId/submit-media",
  {
    method: "POST",
    headers: {
      Authorization: "Bearer " + token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      mediaUrls: [
        {
          url: "https://cloudinary.com/image.jpg",
          fileName: "my-photo.jpg",
          fileSize: 1024000,
          mimeType: "image/jpeg",
          publicId: "cloudinary-id",
        },
      ],
    }),
  }
);

// Then enroll face using the uploaded media
const faceEnrollment = await fetch("/api/v1/faces/events/:eventId/enroll", {
  method: "POST",
  headers: {
    Authorization: "Bearer " + token,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    mediaId: "media-id-from-upload",
  }),
});
```

### 2. Automatic Face Processing

When users upload photos, faces are automatically detected and identified:

```javascript
// Upload photos (faces are processed automatically)
const uploadResponse = await fetch('/api/v1/media/event/:eventId/submit-media', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    mediaUrls: [/* array of media objects */]
  })
});

// Response includes face processing status
{
  "success": true,
  "message": "Media uploaded successfully",
  "uploadedMedia": [...],
  "faceProcessing": {
    "imagesProcessed": 3,
    "status": "processing"
  }
}
```

### 3. Get Personalized Media

```javascript
// Get all photos/videos containing the user's face
const myPhotos = await fetch(
  "/api/v1/media/event/:eventId/my-faces?page=1&limit=20",
  {
    headers: {
      Authorization: "Bearer " + token,
    },
  }
);

const response = await myPhotos.json();
// response.media contains all photos with user's face
// Each media item includes face detection metadata
```

## Response Examples

### Face Enrollment Response

```json
{
  "success": true,
  "message": "Face enrolled successfully",
  "faceProfile": {
    "id": "uuid",
    "userId": "uuid",
    "eventId": "uuid",
    "enrollmentConfidence": 0.95,
    "faceAttributes": {
      "age": 25,
      "gender": "male",
      "smile": 0.8,
      "emotion": {
        "happiness": 0.8,
        "neutral": 0.2
      }
    },
    "createdAt": "2024-01-16T10:00:00Z"
  },
  "trainingStatus": "Training started. Face identification will be available shortly."
}
```

### Filtered Media Response

```json
{
  "success": true,
  "message": "Media with your face retrieved successfully",
  "media": [
    {
      "id": "media-uuid",
      "mediaUrl": "https://cloudinary.com/image.jpg",
      "fileName": "event-photo.jpg",
      "mediaType": "image",
      "createdAt": "2024-01-16T10:00:00Z",
      "faceDetections": [
        {
          "id": "face-detection-uuid",
          "faceId": "azure-face-id",
          "faceRectangle": {
            "top": 100,
            "left": 150,
            "width": 200,
            "height": 250
          },
          "confidence": 0.95,
          "faceAttributes": {
            "age": 25,
            "gender": "male"
          },
          "createdAt": "2024-01-16T10:00:00Z"
        }
      ]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  }
}
```

## Error Handling

### Common Errors

#### Face Not Detected

```json
{
  "success": false,
  "message": "No faces detected in the selected image"
}
```

#### Multiple Faces Detected

```json
{
  "success": false,
  "message": "Multiple faces detected. Please select an image with only your face"
}
```

#### Face Already Enrolled

```json
{
  "success": false,
  "message": "You already have a face profile for this event"
}
```

#### Invalid Media URL

```json
{
  "success": false,
  "message": "Invalid or inaccessible media URL"
}
```

## Performance Considerations

### Azure Face API Limits

- **Free Tier (F0)**: 20 calls per minute, 30,000 calls per month
- **Standard Tier (S0)**: 10 calls per second, unlimited calls

### Optimization Tips

1. **Batch Processing**: Process multiple images in parallel
2. **Caching**: Cache face detection results
3. **Async Processing**: Don't block uploads for face processing
4. **Image Quality**: Ensure good image quality for better detection

### Database Optimization

- Indexes on `eventId`, `userId`, `mediaId`
- Composite indexes for common queries
- Soft deletes to maintain data integrity

## Security Considerations

### Privacy

- Face data is stored securely in Azure
- Users can delete their face profiles
- Face detection data is event-specific

### Access Control

- Face enrollment requires authentication
- Face statistics only for event creators/admins
- Media access respects existing permissions

### Data Retention

- Face profiles are tied to events
- Consider implementing data retention policies
- Allow users to export/delete their data

## Troubleshooting

### Common Issues

#### Azure Face API Errors

```bash
# Check API key and endpoint
curl -H "Ocp-Apim-Subscription-Key: YOUR_KEY" \
     "https://your-region.cognitiveservices.azure.com/face/v1.0/detect"
```

#### Training Status Issues

- Check if person group exists
- Verify training completed successfully
- Retry training if needed

#### Face Detection Failures

- Ensure image quality is good
- Check image format (JPEG, PNG supported)
- Verify image size (minimum 36x36 pixels)

### Debug Mode

Enable debug logging by setting:

```env
NODE_ENV=development
```

## Migration Commands

Run these migrations to set up the face detection tables:

```bash
# Run migrations
npx sequelize-cli db:migrate

# Or if using npm scripts
npm run migrate
```

## Testing

### Test Face Detection

```javascript
// Test with a sample image
const testImage = "https://example.com/test-face.jpg";
const detections = await AzureFaceService.detectFacesFromUrl(testImage);
console.log("Faces detected:", detections.length);
```

### Test Face Enrollment

```javascript
// Test enrollment flow
const enrollment = await enrollUserFace({
  eventId: "test-event-id",
  mediaId: "test-media-id",
});
console.log("Enrollment result:", enrollment);
```

## Support

For issues related to:

- **Azure Face API**: Check [Azure Face API documentation](https://docs.microsoft.com/en-us/azure/cognitive-services/face/)
- **Integration Issues**: Check server logs and error messages
- **Performance**: Monitor API usage and database queries

## Future Enhancements

### Planned Features

1. **Video Face Detection**: Extract frames and detect faces in videos
2. **Face Recognition Accuracy**: Improve matching algorithms
3. **Bulk Operations**: Batch face enrollment and processing
4. **Analytics Dashboard**: Face detection statistics and insights
5. **Mobile Optimization**: Better mobile face enrollment experience

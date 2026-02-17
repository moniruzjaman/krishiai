# 🔌 Krishi AI API Documentation

## Base URL

**Production:**
```
https://krishiai-flixcn4v2-krishi-ai-team.vercel.app/api
```

**Development:**
```
http://localhost:3000/api
```

---

## 🔐 Authentication

All API requests (except GET /) require authentication:

```http
Authorization: Bearer <your_token>
```

---

## Endpoints

### 1. Chat API

#### POST /api/chat

Send a message to the AI chat system.

**Request:**
```http
POST /api/chat
Authorization: Bearer your_token_here
Content-Type: application/json

{
  "message": "What fertilizer should I use for rice?",
  "cropFamily": "ধান",
  "lang": "bn"
}
```

**Response (Success - 200):**
```json
{
  "success": true,
  "data": {
    "response": "Chat functionality coming soon",
    "userId": "user_abc12345"
  }
}
```

**Response (Unauthorized - 401):**
```json
{
  "error": "Unauthorized - Invalid or missing authentication token"
}
```

**Response (Bad Request - 400):**
```json
{
  "error": "Message is required"
}
```

---

#### GET /api/chat

Health check endpoint.

**Request:**
```http
GET /api/chat
```

**Response:**
```json
{
  "message": "Krishi AI Chat API",
  "version": "1.0.0"
}
```

---

## 🔒 Authentication Flow

### Getting a Token

**For Firebase Auth:**
```javascript
import { getAuth } from 'firebase/auth';

const auth = getAuth();
const user = auth.currentUser;

if (user) {
  const token = await user.getIdToken();
  // Use this token in API requests
}
```

### Using the Token

```javascript
const response = await fetch('/api/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    message: 'Hello',
    cropFamily: 'ধান',
    lang: 'bn'
  })
});

const data = await response.json();
```

---

## 🐛 Error Handling

### Common Errors

| Status Code | Error | Description |
|-------------|-------|-------------|
| 401 | Unauthorized | Missing or invalid token |
| 400 | Bad Request | Invalid request body |
| 500 | Internal Server Error | Server error |

### Handling 401 Errors

```javascript
try {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (response.status === 401) {
    // Token expired or invalid
    // Refresh token or redirect to login
    await refreshToken();
  }
  
  const data = await response.json();
} catch (error) {
  console.error('API Error:', error);
}
```

---

## 📝 Implementation Notes

### Current Implementation

The API route includes:
- ✅ Authentication check
- ✅ 401 Unauthorized handling
- ✅ Request validation
- ✅ Error handling
- ⏳ Chat logic (coming soon)

### TODO

- [ ] Integrate with Gemini AI
- [ ] Add chat history storage
- [ ] Implement rate limiting
- [ ] Add request logging
- [ ] Cache responses

---

## 🧪 Testing

### Test with cURL

**Health Check:**
```bash
curl https://krishiai-flixcn4v2-krishi-ai-team.vercel.app/api/chat
```

**Authenticated Request:**
```bash
curl -X POST https://krishiai-flixcn4v2-krishi-ai-team.vercel.app/api/chat \
  -H "Authorization: Bearer your_token_here" \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello","lang":"bn"}'
```

### Test with JavaScript

```javascript
// Test health check
fetch('/api/chat')
  .then(res => res.json())
  .then(data => console.log(data));

// Test authenticated request
const token = 'your_token_here';
fetch('/api/chat', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    message: 'Test message',
    lang: 'en'
  })
})
.then(res => res.json())
.then(data => console.log(data))
.catch(err => console.error(err));
```

---

## 🔐 Security Best Practices

### DO:
- ✅ Always use HTTPS
- ✅ Validate tokens on every request
- ✅ Implement rate limiting
- ✅ Log all requests
- ✅ Use environment variables for secrets

### DON'T:
- ❌ Hardcode tokens in client code
- ❌ Send tokens over HTTP
- ❌ Store tokens in localStorage (use httpOnly cookies)
- ❌ Log sensitive data

---

## 📊 Monitoring

### Vercel Dashboard

Monitor API usage at:
https://vercel.com/krishi-ai-team/krishiai-flixcn4v2/analytics

**Metrics to watch:**
- Function invocations
- Error rate
- Response times
- 401 errors

### Logging

```typescript
// Add to your API route
console.log('Chat request:', {
  userId: user.id,
  message: message,
  timestamp: new Date().toISOString()
});
```

View logs in Vercel Dashboard → Functions → Logs

---

## 🚀 Deployment

API routes are automatically deployed with your Vercel project.

**After pushing to GitHub:**
1. Vercel detects changes
2. Builds API routes
3. Deploys to edge
4. Ready in ~2 minutes

**Check status:**
https://vercel.com/krishi-ai-team/krishiai-flixcn4v2/deployments

---

## 📞 Support

**Issues:**
- Check Vercel logs
- Review error messages
- Test with cURL first

**Documentation:**
- Vercel Functions: https://vercel.com/docs/functions
- Next.js API Routes: https://nextjs.org/docs/api-routes

---

**Last Updated:** February 18, 2026  
**Version:** 1.0.0  
**Status:** ✅ Active

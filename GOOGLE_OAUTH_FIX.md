# Google OAuth Fix - "invalid_client" Error

## Problem
Getting "invalid_client: The OAuth client was not found" error when trying to login with Google.

## Solution

### Step 1: Verify Google Cloud Console Configuration

1. **Go to Google Cloud Console:**
   - Visit: https://console.cloud.google.com/
   - Navigate to: **APIs & Services** → **Credentials**

2. **Find Your OAuth 2.0 Client:**
   - Look for your Client ID in Google Cloud Console (it will look like `...apps.googleusercontent.com`)
   - Click on it to edit

3. **Add Authorized Redirect URIs:**
   Make sure these EXACT URIs are added (case-sensitive, no trailing slashes):
   ```
   http://localhost:5001/api/auth/google/callback
   http://127.0.0.1:5001/api/auth/google/callback
   ```
   
   For production (if needed):
   ```
   https://ticketlybackend-production.up.railway.app/api/auth/google/callback
   ```

4. **Add Authorized JavaScript Origins:**
   ```
   http://localhost:5001
   http://127.0.0.1:5001
   ```

5. **Save Changes** in Google Cloud Console

### Step 2: Verify Backend .env File

Make sure your `.env` file has:
```env
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

### Step 3: Restart Backend Server

**IMPORTANT:** You MUST restart the backend after adding environment variables:

```bash
# Stop the backend (Ctrl+C)
# Then restart:
cd backend
npm start
```

You should see:
- ✅ No warning about Google OAuth credentials
- ✅ Server running on port 5001

### Step 4: Test

1. Try Google login again
2. You should be redirected to Google's login page
3. After login, you'll be redirected back to your app

## Common Issues

### Issue: "redirect_uri_mismatch"
- **Fix:** Make sure the redirect URI in Google Console EXACTLY matches: `http://localhost:5001/api/auth/google/callback`
- Check for trailing slashes, http vs https, and exact casing

### Issue: "invalid_client"
- **Fix:** 
  - Verify the Client ID exists in Google Cloud Console
  - Make sure the redirect URI is added to "Authorized redirect URIs"
  - Restart backend server after adding credentials

### Issue: "access_denied"
- **Fix:** 
  - Configure OAuth consent screen in Google Cloud Console
  - Add your email as a test user (if using External app type)

## Quick Checklist

- [ ] Client ID exists in Google Cloud Console
- [ ] Redirect URI added: `http://localhost:5001/api/auth/google/callback`
- [ ] JavaScript origin added: `http://localhost:5001`
- [ ] OAuth consent screen configured
- [ ] Credentials added to backend `.env` file
- [ ] Backend server restarted
- [ ] Test Google login


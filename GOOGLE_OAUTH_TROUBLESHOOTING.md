# Google OAuth "invalid_client" Error - Complete Troubleshooting Guide

## Error Message
```
Error 401: invalid_client
The OAuth client was not found.
```

## Root Causes & Solutions

### ✅ Solution 1: Add Redirect URI in Google Cloud Console

**This is the MOST COMMON issue!**

1. Go to: https://console.cloud.google.com/apis/credentials
2. Find your OAuth 2.0 Client ID (it will look like `your_client_id_here.apps.googleusercontent.com`)
3. Click to edit it
4. In **"Authorized redirect URIs"** section:
   - Click **"+ Add URI"**
   - Add: `http://localhost:5001/api/auth/google/callback`
   - Click **"+ Add URI"** again
   - Add: `http://127.0.0.1:5001/api/auth/google/callback`
5. In **"Authorized JavaScript origins"** section:
   - Click **"+ Add URI"**
   - Add: `http://localhost:5001`
   - Click **"+ Add URI"** again
   - Add: `http://127.0.0.1:5001`
6. **Click "Save"** at the bottom (very important!)
7. Wait 1-2 minutes for changes to propagate

### ✅ Solution 2: Verify Client ID Matches

**Check if Client ID in .env matches Google Cloud Console:**

1. Check your `.env` file:
   ```bash
   cd backend
   cat .env | grep GOOGLE_CLIENT_ID
   ```
   
2. Should match the Client ID shown in Google Cloud Console exactly

3. Verify in Google Cloud Console:
   - Go to: https://console.cloud.google.com/apis/credentials
   - Find your OAuth client
   - Check the "Client ID" field matches exactly

4. If they don't match:
   - Either update `.env` with the correct Client ID
   - Or use the Client ID from `.env` in Google Cloud Console

### ✅ Solution 3: Verify OAuth Consent Screen

1. Go to: https://console.cloud.google.com/apis/credentials/consent
2. Make sure OAuth consent screen is configured:
   - User Type: External (for testing) or Internal
   - App name: Ticketly
   - User support email: Your email
   - Developer contact: Your email
3. Add scopes: `email`, `profile`
4. If using External type, add your email as a test user
5. Save and continue through all steps

### ✅ Solution 4: Restart Backend Server

**After making ANY changes to .env or Google Cloud Console:**

```bash
# Stop backend (Ctrl+C)
cd backend
npm start
```

### ✅ Solution 5: Clear Browser Cache

Sometimes browser caches the error:

1. Open browser in Incognito/Private mode
2. Or clear browser cache and cookies
3. Try again

### ✅ Solution 6: Check Redirect URI Format

**The redirect URI MUST match EXACTLY:**

✅ Correct:
- `http://localhost:5001/api/auth/google/callback`
- `http://127.0.0.1:5001/api/auth/google/callback`

❌ Wrong (will fail):
- `http://localhost:5001/api/auth/google/callback/` (trailing slash)
- `https://localhost:5001/api/auth/google/callback` (https instead of http)
- `http://localhost:5001/api/auth/Google/callback` (wrong casing)
- `http://localhost:5001/api/auth/google/callback?param=value` (extra params)

### ✅ Solution 7: Verify Backend is Running

Make sure backend is running on port 5001:

```bash
# Check if backend is running
curl http://localhost:5001/api/auth/google
# Should return a 302 redirect to Google
```

## Step-by-Step Verification Checklist

- [ ] Redirect URI added: `http://localhost:5001/api/auth/google/callback`
- [ ] JavaScript origin added: `http://localhost:5001`
- [ ] **Changes SAVED in Google Cloud Console** (clicked "Save" button)
- [ ] Waited 1-2 minutes after saving
- [ ] Client ID in `.env` matches Google Cloud Console
- [ ] OAuth consent screen is configured
- [ ] Backend server restarted after .env changes
- [ ] Backend is running on port 5001
- [ ] Tried in incognito/private browser window

## Still Not Working?

If you've completed all steps above and it's still not working:

1. **Double-check the redirect URI in the error URL:**
   - Look at the browser URL when the error appears
   - Check the `redirect_uri` parameter
   - Make sure it EXACTLY matches what you added in Google Cloud Console

2. **Check backend logs:**
   ```bash
   # Look for any errors in backend console
   ```

3. **Verify the callback URL in backend:**
   ```bash
   cd backend
   cat .env | grep GOOGLE_CALLBACK_URL
   # If not set, it defaults to: http://localhost:5001/api/auth/google/callback
   ```

4. **Test the redirect manually:**
   - Open: http://localhost:5001/api/auth/google
   - Should redirect to Google login (not show error)

## Common Mistakes

1. ❌ Adding redirect URI but forgetting to click "Save"
2. ❌ Using wrong Client ID (typo in .env)
3. ❌ Adding redirect URI with trailing slash
4. ❌ Not waiting for Google to propagate changes
5. ❌ Not restarting backend after .env changes
6. ❌ Using https instead of http for localhost


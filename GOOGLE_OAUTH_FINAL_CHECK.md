# Google OAuth "invalid_client" - Final Checklist

## Current Status
- ✅ Redirect URIs added: `http://localhost:5001/api/auth/google/callback`
- ✅ JavaScript origins added: `http://localhost:5001`
- ✅ Changes saved in Google Cloud Console
- ❌ Still getting "invalid_client" error

## Critical Checks

### 1. Verify Client ID Match (MOST IMPORTANT)

**In Google Cloud Console:**
1. Go to: https://console.cloud.google.com/apis/credentials
2. Find your OAuth client
3. **Check the EXACT Client ID shown** in the "Client ID" field
4. **Compare character-by-character** with your `.env` file:
   ```
   your_client_id_here.apps.googleusercontent.com
   ```
5. **They must match EXACTLY** - even one character difference will cause this error

**If they don't match:**
- Option A: Update `.env` with the Client ID from Google Cloud Console
- Option B: Delete the OAuth client in Google Cloud Console and create a new one with the Client ID from `.env`

### 2. Verify OAuth Consent Screen

1. Go to: https://console.cloud.google.com/apis/credentials/consent
2. Check the status:
   - If "Testing" mode: Make sure your email (`your_email@example.com`) is added as a test user
   - If "In production": Should work for all users
3. Verify scopes are added: `email`, `profile`
4. Make sure the app is published (if in Testing mode, you need test users)

### 3. Verify Project Selection

1. In Google Cloud Console, check the project selector (top bar)
2. Make sure you're in the **"ticketly"** project
3. The OAuth client must belong to this project

### 4. Check for Multiple OAuth Clients

1. In Google Cloud Console, go to: https://console.cloud.google.com/apis/credentials
2. Check if there are **multiple OAuth 2.0 Client IDs**
3. Make sure you're editing the **correct one** that matches your `.env` file
4. If you have multiple, you might be editing the wrong one

### 5. Verify Redirect URI Format

Double-check the redirect URI is **exactly**:
```
http://localhost:5001/api/auth/google/callback
```

**Common mistakes:**
- ❌ `http://localhost:5001/api/auth/google/callback/` (trailing slash)
- ❌ `https://localhost:5001/api/auth/google/callback` (https instead of http)
- ❌ `http://localhost:5001/api/auth/Google/callback` (wrong casing)
- ❌ `http://127.0.0.1:5001/api/auth/google/callback` (different host - this is OK but make sure it's also added)

### 6. Wait for Propagation

After making changes:
1. **Save** in Google Cloud Console
2. **Wait 2-5 minutes** for Google to propagate changes
3. Try again in an **incognito/private window** (to avoid cache)

### 7. Restart Backend

After any `.env` changes:
```bash
# Stop backend (Ctrl+C)
cd backend
npm start
```

### 8. Test the Redirect Manually

Test if the backend redirect is working:
1. Open: http://localhost:5001/api/auth/google
2. Should redirect to Google login (not show error)
3. If it shows error immediately, the issue is with backend configuration
4. If it redirects to Google but Google shows error, the issue is with Google Cloud Console

## Most Likely Issues (in order)

1. **Client ID mismatch** - The Client ID in `.env` doesn't match the one in Google Cloud Console
2. **Wrong OAuth client** - Editing a different OAuth client than the one in `.env`
3. **OAuth consent screen not configured** - Missing test users or not published
4. **Changes not propagated** - Need to wait longer or clear cache

## Quick Fix Steps

1. **Verify Client ID match** (most important!)
2. **Check OAuth consent screen** has test users
3. **Wait 5 minutes** after saving
4. **Restart backend** if you changed `.env`
5. **Try in incognito window**


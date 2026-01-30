# Google OAuth Setup Guide

## Step 1: Create Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable Google+ API:

   - Go to "APIs & Services" > "Library"
   - Search for "Google+ API" or "Google Identity"
   - Click "Enable"

4. Create OAuth 2.0 Credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - If prompted, configure the OAuth consent screen first:
     - User Type: External (for testing) or Internal
     - App name: Ticketly
     - User support email: Your email
     - Developer contact: Your email
     - Click "Save and Continue"
     - Add scopes: `email`, `profile`
     - Add test users (your email) if using External type
     - Click "Save and Continue"
5. Create OAuth Client:
   - Application type: "Web application"
   - Name: "Ticketly Backend"
   - Authorized JavaScript origins:
     - `http://localhost:5001`
     - `http://127.0.0.1:5001`
   - Authorized redirect URIs:
     - `http://localhost:5001/api/auth/google/callback`
     - `http://127.0.0.1:5001/api/auth/google/callback`
   - Click "Create"
   - Copy the **Client ID** and **Client Secret**

## Step 2: Add to .env File

Add these variables to your `.env` file:

```env
GOOGLE_CLIENT_ID=your_client_id_here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_CALLBACK_URL=http://localhost:5001/api/auth/google/callback
```

## Step 3: Restart Server

Restart your server for the changes to take effect:

```bash
# Stop the current server (Ctrl+C)
# Then restart
npm run dev
# or
node server.js
```

## Step 4: Test

1. Open in browser: `http://localhost:5001/api/auth/google`
2. You should be redirected to Google login
3. After login, you'll be redirected back with a token

## Troubleshooting

### Error: "redirect_uri_mismatch"

- Make sure the redirect URI in Google Console exactly matches:
  - `http://localhost:5001/api/auth/google/callback`
- Check for trailing slashes or http vs https

### Error: "access_denied"

- Make sure you added your email as a test user (if using External app type)
- Check OAuth consent screen is configured

### Error: "invalid_client"

- Verify GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are correct
- Make sure there are no extra spaces in .env file

## Production Setup

For production, update:

- Authorized JavaScript origins: Your production domain
- Authorized redirect URIs: `https://yourdomain.com/api/auth/google/callback`
- Update `.env` with production callback URL

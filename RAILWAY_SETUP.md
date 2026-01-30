# Railway Deployment Setup Guide

## Setting Up Environment Variables on Railway

### Step 1: Access Railway Dashboard

1. Go to [Railway Dashboard](https://railway.app)
2. Select your project: `ticketlybackend-production`
3. Click on your service
4. Go to the **Variables** tab

### Step 2: Add Email Configuration Variables

Add these environment variables in Railway:

```
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_16_character_app_password
```

**Important Notes:**

- For Gmail, you MUST use an **App Password**, not your regular password
- Remove all spaces from the App Password
- The App Password should be exactly 16 characters

### Step 3: Generate Gmail App Password (if not done)

1. Go to [Google App Passwords](https://myaccount.google.com/apppasswords)
2. Select "Mail" and "Other (Custom name)"
3. Enter name: "Ticketly Railway"
4. Click "Generate"
5. Copy the 16-character password (no spaces)
6. Paste it into Railway's `EMAIL_PASS` variable

### Step 4: Verify Other Required Variables

Make sure these are also set in Railway:

```
NODE_ENV=production
PORT=5001
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
FRONTEND_URL=https://your-frontend-url.com
```

**Note about CORS:**
- The Vercel dashboard URL (`https://ticketly-dashboard.vercel.app`) is automatically allowed
- Additional frontend URLs can be added via the `FRONTEND_URL` environment variable (comma-separated)
- Example: `FRONTEND_URL=https://app.example.com,https://www.example.com`

### Step 5: Redeploy

After adding/updating environment variables:

1. Railway will automatically redeploy
2. Or click **Redeploy** in the Railway dashboard
3. Check the deployment logs for email configuration status

### Step 6: Check Logs

After deployment, check Railway logs for:

- `✅ Email service configured and verified successfully` - Email is working
- `❌ Email transporter verification failed` - Check your credentials
- `⚠️ Email credentials not configured` - Variables are missing

## Troubleshooting

### OTP Not Sending from Railway

1. **Check Environment Variables:**

   - Go to Railway Dashboard → Your Service → Variables
   - Verify `EMAIL_USER` and `EMAIL_PASS` are set
   - Make sure there are no extra spaces or quotes

2. **Check Railway Logs:**

   - Go to Railway Dashboard → Your Service → Deployments → Latest → View Logs
   - Look for email-related error messages
   - Check if transporter verification succeeded

3. **Common Issues:**

   **Issue: "Email credentials not configured"**

   - Solution: Add `EMAIL_USER` and `EMAIL_PASS` in Railway Variables

   **Issue: "EAUTH - Authentication failed"**

   - Solution: Use Gmail App Password (not regular password)
   - Ensure 2FA is enabled on Gmail account
   - Remove spaces from App Password

   **Issue: "Connection timeout"**

   - Solution: This is normal on Railway - emails may take longer
   - Check Railway logs for the OTP (it's logged as fallback)
   - Consider using SendGrid or Mailgun for better reliability

4. **Test Email Configuration:**

   ```bash
   # Make a login request to trigger OTP
   curl -X POST https://ticketlybackend-production.up.railway.app/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email": "your_email@gmail.com", "password": "your_password"}'
   ```

5. **Check OTP in Logs:**
   - If email fails, Railway logs will show the OTP
   - Look for: `📧 OTP EMAIL (Fallback - Timeout)` or similar messages
   - The OTP is also saved in the database and can be verified

## Alternative: Use SendGrid (Recommended for Production)

Gmail SMTP can be unreliable on Railway. Consider using SendGrid:

1. **Sign up for SendGrid:** https://sendgrid.com
2. **Create API Key:** Settings → API Keys → Create API Key
3. **Update emailService.js** to use SendGrid (see EMAIL_SETUP.md)
4. **Add to Railway Variables:**
   ```
   SENDGRID_API_KEY=your_sendgrid_api_key
   EMAIL_USER=noreply@yourdomain.com
   ```

## Quick Checklist

- [ ] `EMAIL_USER` is set in Railway Variables
- [ ] `EMAIL_PASS` is set in Railway Variables (Gmail App Password)
- [ ] App Password has no spaces
- [ ] 2FA is enabled on Gmail account
- [ ] Railway service has been redeployed after adding variables
- [ ] Checked Railway logs for email configuration status
- [ ] Tested OTP sending with a login request

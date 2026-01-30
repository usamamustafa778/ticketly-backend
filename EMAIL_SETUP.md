# Email Setup Guide for OTP Sending

## Option 1: Gmail (Easiest for Development)

### Step 1: Enable 2-Factor Authentication
1. Go to your Google Account: https://myaccount.google.com/
2. Navigate to "Security"
3. Enable "2-Step Verification"

### Step 2: Generate App Password
1. Go to: https://myaccount.google.com/apppasswords
2. Select "Mail" and "Other (Custom name)"
3. Enter name: "Ticketly Backend"
4. Click "Generate"
5. Copy the 16-character password (no spaces)

### Step 3: Add to .env File
```env
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_16_character_app_password
```

### Step 4: Restart Server
```bash
# Stop server (Ctrl+C) and restart
npm run dev
```

---

## Option 2: SendGrid (Recommended for Production)

### Step 1: Create SendGrid Account
1. Sign up at: https://sendgrid.com/
2. Verify your email
3. Create an API Key:
   - Go to Settings > API Keys
   - Create API Key
   - Copy the key (you'll only see it once!)

### Step 2: Update emailService.js
Replace the transporter configuration with:
```javascript
const transporter = nodemailer.createTransport({
  host: 'smtp.sendgrid.net',
  port: 587,
  auth: {
    user: 'apikey',
    pass: process.env.SENDGRID_API_KEY
  }
});
```

### Step 3: Add to .env
```env
SENDGRID_API_KEY=your_sendgrid_api_key
EMAIL_USER=noreply@yourdomain.com  # Your verified sender email
```

---

## Option 3: Mailgun

### Step 1: Create Mailgun Account
1. Sign up at: https://www.mailgun.com/
2. Verify your domain or use sandbox domain
3. Get your API key from dashboard

### Step 2: Update emailService.js
```javascript
const transporter = nodemailer.createTransport({
  host: 'smtp.mailgun.org',
  port: 587,
  auth: {
    user: process.env.MAILGUN_SMTP_USER,
    pass: process.env.MAILGUN_SMTP_PASS
  }
});
```

### Step 3: Add to .env
```env
MAILGUN_SMTP_USER=postmaster@yourdomain.mailgun.org
MAILGUN_SMTP_PASS=your_mailgun_password
EMAIL_USER=noreply@yourdomain.com
```

---

## Quick Gmail Setup (Recommended for Testing)

1. **Enable 2FA on Gmail**
2. **Generate App Password**: https://myaccount.google.com/apppasswords
3. **Add to .env**:
   ```env
   EMAIL_USER=your_email@gmail.com
   EMAIL_PASS=abcd efgh ijkl mnop
   ```
   (Remove spaces from app password)

4. **Restart server**

---

## Testing

After setup, test with:
```bash
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "ali@gmail.com", "password": "12345678"}'
```

Check your email inbox for the OTP!

---

## Troubleshooting

### Gmail: "Invalid login"
- Make sure you're using App Password, not your regular password
- Remove spaces from the app password
- Ensure 2FA is enabled

### Gmail: "Less secure app access"
- Use App Password instead (recommended)
- Or enable "Less secure app access" (not recommended)

### SendGrid: "Authentication failed"
- Make sure API key is correct
- Verify sender email is verified in SendGrid

### General: "Connection timeout"
- Check firewall settings
- Verify SMTP port (587 for TLS, 465 for SSL)
- Check if your network blocks SMTP


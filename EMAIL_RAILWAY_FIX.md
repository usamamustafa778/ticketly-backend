# Email Service Fix for Railway

## Issues Fixed

### 1. **Hardcoded Credentials Removed** ✅

- **Problem**: Email credentials were hardcoded in the code instead of using environment variables
- **Fix**: Changed to use `process.env.EMAIL_USER` and `process.env.EMAIL_PASS`
- **Impact**: Now properly reads from Railway environment variables

### 2. **Improved SMTP Configuration** ✅

- **Problem**: Using generic "gmail" service which can have compatibility issues on Railway
- **Fix**: Changed to explicit SMTP configuration with `smtp.gmail.com:587`
- **Impact**: Better connection reliability on Railway's network

### 3. **Enhanced Error Logging** ✅

- **Problem**: Errors were silently failing without proper logging
- **Fix**: Added comprehensive error logging with Railway-specific debugging
- **Impact**: Easier to diagnose email issues in Railway logs

### 4. **Better Timeout Handling** ✅

- **Problem**: Short timeouts causing failures on Railway's network
- **Fix**: Increased timeouts to 30 seconds for production
- **Impact**: More reliable email delivery on slower networks

## What to Check in Railway

### 1. Verify Environment Variables

Make sure these are set in Railway Variables:

```
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_16_character_gmail_app_password
```

**Important**:

- Use Gmail App Password (not regular password)
- Remove all spaces from the App Password
- Generate from: https://myaccount.google.com/apppasswords

### 2. Check Railway Logs

After deploying, check Railway logs for:

- `✅ Email service configured and verified successfully` - Good!
- `❌ Email transporter verification failed` - Check credentials
- `📧 OTP EMAIL (Fallback - ...)` - Email failed, but OTP is logged

### 3. Test Email Sending

Make a login request:

```bash
curl -X POST https://ticketlybackend-production.up.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "your_password"}'
```

Then check:

1. Railway logs for email sending status
2. Your email inbox for the OTP
3. Railway logs will also show the OTP if email fails

## Common Railway Email Issues

### Issue: "Connection timeout"

**Solution**:

- Check Railway logs - OTP will be logged there
- Gmail SMTP might be blocked by Railway's network
- Consider using SendGrid or Mailgun for better reliability

### Issue: "EAUTH - Authentication failed"

**Solution**:

- Verify you're using Gmail App Password (not regular password)
- Ensure 2FA is enabled on Gmail account
- Check that EMAIL_PASS has no spaces

### Issue: "ECONNECTION - Connection failed"

**Solution**:

- Gmail SMTP might be blocked on Railway
- Try using port 465 with SSL instead of 587 with TLS
- Consider switching to SendGrid (recommended for production)

## Next Steps

1. **Redeploy to Railway** - The fixes are in the code
2. **Check Railway Logs** - Look for email configuration messages
3. **Test Login** - Try logging in and check if email arrives
4. **Check Logs for OTP** - If email fails, OTP will be in Railway logs

## Alternative: Use SendGrid (Recommended)

If Gmail continues to have issues on Railway, consider switching to SendGrid:

1. Sign up at https://sendgrid.com
2. Create API Key
3. Update `emailService.js` to use SendGrid SMTP
4. Add `SENDGRID_API_KEY` to Railway variables

See `EMAIL_SETUP.md` for SendGrid configuration details.

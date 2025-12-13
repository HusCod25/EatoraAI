# Resend SMTP Setup Guide for Supabase

Complete guide to properly configure Resend as your email provider for EatoraAI.

---

## 🚀 Step-by-Step Setup

### Step 1: Create Resend Account & Get API Key

1. **Go to Resend**: https://resend.com
2. **Sign in** or **Create account**
3. Go to **API Keys** in the left sidebar
4. Click **"Create API Key"**
5. Give it a name: `EatoraAI Production`
6. **Permissions**: Select **"Sending access"** (Full access)
7. Click **Create**
8. **COPY THE API KEY** (starts with `re_...`) - You'll only see it once!
9. Save it somewhere safe temporarily

---

### Step 2: Verify Your Domain (CRITICAL!)

Resend requires domain verification to send emails from your domain.

#### Option A: Use Your Custom Domain (Recommended for Production)

If you own `eatora.tech`:

1. In Resend, go to **Domains**
2. Click **"Add Domain"**
3. Enter your domain: `eatora.tech`
4. Resend will show you DNS records to add:
   ```
   Type: TXT
   Name: _resend
   Value: [some verification code]
   
   Type: MX
   Name: @
   Value: feedback-smtp.us-east-1.amazonses.com
   Priority: 10
   ```

5. **Add these DNS records** to your domain registrar:
   - Go to your domain provider (GoDaddy, Namecheap, Cloudflare, etc.)
   - Find DNS settings
   - Add the TXT and MX records Resend provided
   - **Wait 5-15 minutes** for DNS propagation

6. Back in Resend, click **"Verify Domain"**
7. Status should change to **"Verified" ✅**

#### Option B: Use Resend's Test Domain (Quick Setup for Testing)

If you just want to test or don't own a domain:

1. Resend gives you a test domain: `onboarding.resend.dev`
2. You can use this immediately without verification
3. Emails will come from: `noreply@onboarding.resend.dev`
4. ⚠️ Not recommended for production (looks unprofessional)

---

### Step 3: Configure SMTP in Supabase

Now that you have:
- ✅ Resend API Key
- ✅ Verified domain (or test domain)

Configure Supabase:

1. **Go to Supabase Dashboard**: https://app.supabase.com
2. Select your project: `axumwatbsahalscdrryv`
3. Go to **Project Settings** → **Authentication**
4. Scroll down to **SMTP Settings**
5. Click **"Enable Custom SMTP"**

6. **Enter these settings**:

```
Enable Custom SMTP: ✅ ON

SMTP Host: smtp.resend.com
SMTP Port: 465
SMTP Username: resend
SMTP Password: [Paste your Resend API key here - starts with re_...]

Sender Email: noreply@eatora.tech  (or noreply@onboarding.resend.dev if using test domain)
Sender Name: EatoraAI

Enable TLS: ✅ Checked
```

**Important Notes:**
- **Port**: Use `465` (SSL) or `587` (TLS) - both work, but 465 is more reliable
- **Username**: Always `resend` (not your email)
- **Password**: Your Resend API key (the long string starting with `re_`)
- **Sender Email**: Must be from your verified domain

7. Click **"Save"**

---

### Step 4: Test Email Sending

1. **Test from Supabase Dashboard**:
   - In SMTP Settings, there should be a **"Send Test Email"** button
   - Click it and enter your email
   - Check if you receive the test email

2. **Test Registration**:
   - Go to https://app.eatora.tech/register
   - Create a new account with a fresh email
   - Check if confirmation email arrives

3. **Check Email Content**:
   - Email should come from `noreply@eatora.tech` (or your configured email)
   - Should have proper EatoraAI branding
   - Confirmation link should work

---

## 🐛 Troubleshooting

### Issue: "SMTP Connection Failed"

**Possible causes:**
- Wrong API key
- Port blocked by firewall (try switching between 465 and 587)
- API key doesn't have sending permissions

**Solution:**
- Verify API key is correct (starts with `re_`)
- Try port 587 instead of 465
- Regenerate API key with full permissions

---

### Issue: "Domain Not Verified"

**Symptoms:** Emails not sending, or error about unverified domain

**Solution:**
1. Go to Resend → Domains
2. Check if status shows "Verified" ✅
3. If not, click "Verify" again
4. Make sure DNS records are properly added
5. Wait 10-15 minutes and try again

**Temporary workaround:**
Use Resend's test domain: `noreply@onboarding.resend.dev`

---

### Issue: Emails Going to Spam

**Solutions:**
- Verify your domain (adds SPF/DKIM records)
- Use a proper sender name (not "noreply")
- Consider: `hello@eatora.tech` or `team@eatora.tech`
- Make sure DNS records are correct

---

### Issue: Rate Limiting

**Free Tier Limits:**
- Resend Free: 100 emails/day
- 3,000 emails/month

**If you hit limits:**
- Upgrade Resend plan
- Or use Supabase default SMTP (but more limited)

---

## 📊 Comparison: Resend vs Supabase Default

| Feature | Supabase Default | Resend |
|---------|-----------------|--------|
| Setup | ✅ Instant | ⚠️ Requires domain verification |
| Email Limit | ~4 emails/hour | 100/day (free) |
| Deliverability | Good | Excellent |
| Custom Domain | ❌ No | ✅ Yes |
| Cost | Free | Free (100/day) → Paid |
| Professional | ⚠️ Basic | ✅ Very professional |

---

## 🎯 Recommendations

### For Development/Testing:
✅ **Use Supabase Default SMTP**
- Already working
- No setup needed
- Enough for testing

### For Production:
✅ **Use Resend with Verified Domain**
- Better deliverability
- Professional sender email
- Higher limits
- Better analytics

---

## ✅ Quick Setup Checklist

- [ ] Created Resend account
- [ ] Generated API key (starts with `re_`)
- [ ] Added domain to Resend (or using test domain)
- [ ] Verified domain (if using custom domain)
- [ ] Enabled Custom SMTP in Supabase
- [ ] Entered correct SMTP settings (host, port, credentials)
- [ ] Set sender email from verified domain
- [ ] Sent test email successfully
- [ ] Tested registration flow
- [ ] Emails arriving in inbox (not spam)

---

## 🔐 Security Notes

⚠️ **NEVER commit your Resend API key to GitHub!**
- API keys should only be in Supabase Dashboard
- Don't store in code or `.env` files (this is backend config)
- Rotate keys if accidentally exposed

---

## 📝 Support

If you still have issues:
1. Check Resend Dashboard → Logs for delivery status
2. Check Supabase Dashboard → Logs → Auth for errors
3. Resend docs: https://resend.com/docs
4. Supabase SMTP docs: https://supabase.com/docs/guides/auth/auth-smtp



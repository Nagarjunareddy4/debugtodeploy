# 🚀 DebugToDeploy Mobile Deployment Guide

This guide outlines the steps to build and publish the DebugToDeploy Android application.

## 🛠️ Prerequisites
1. **EAS CLI**: Install via `npm install -g eas-cli`.
2. **Expo Account**: Create an account at [expo.dev](https://expo.dev).
3. **Google Play Console**: Active account for publishing.

---

## 📦 Building for Production

### 1. Login to Expo
```bash
eas login
```

### 2. Configure Project
```bash
eas build:configure
```

### 3. Set up Environment Variables
Set your Supabase keys securely as EAS secrets for production builds:
```bash
eas secret:create --name EXPO_PUBLIC_SUPABASE_URL --value "YOUR_PROD_URL"
eas secret:create --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "YOUR_PROD_ANON_KEY"
```

### 4. Build APK (for testing)
```bash
npm run build:preview
```

### 5. Build AAB (for Play Store)
```bash
npm run build:android
---

## 🏪 Google Play Store Publishing

1. **Create App**: In Google Play Console, create a new app.
2. **Set up Store Listing**:
   - Use the screenshots generated from the `mobile/assets` directory.
   - Set description to: "The personal DevOps growth companion for modern engineers."
3. **Upload AAB**: Upload the `.aab` file generated in Step 4.
4. **Content Rating**: Complete the questionnaire.
5. **Privacy Policy**: Use the URL from the existing website (e.g., `https://debugtodeploy.com/privacy`).
6. **Publish**: Start the rollout to production.

---

## 🔧 Post-Deployment
- **Razorpay Webhooks**: Ensure the mobile application's subscription success events are captured by your Supabase backend.
- **FCM Server Key**: Add your Firebase Server Key to the Expo dashboard to enable push notifications.
- **Deep Linking**: Verify that `debugtodeploy://` links correctly open the mobile app.

---

## ✅ Final Production Checklist
- [ ] Supabase RLS policies are active.
- [ ] Razorpay API keys are set to `live` mode.
- [ ] App icon and Splash screen are correctly rendered.
- [ ] All "Coming Soon" placeholders are reviewed.
- [ ] Push notification permissions are requested on first launch.

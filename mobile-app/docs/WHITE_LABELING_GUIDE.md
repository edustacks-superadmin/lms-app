# White-Labeling Guide for Mobile App

This guide explains how to create a custom-branded mobile app for a new organization.

## Overview

Each organization gets their own app with:
- Custom branding (name, logo, colors)
- Their own database connection
- Their own API endpoints
- Separate Play Store/App Store listing

## Steps to White-Label

### 1. Update Organization Config

Edit `mobile-app/config/organization.js`:

```javascript
export const ORG_CONFIG = {
  // Organization Details
  name: "Your Organization Name",
  shortName: "YourOrg",
  
  // API Endpoints
  webUrl: "https://yourorg.edustacks.co.in",
  
  // Supabase Configuration
  supabase: {
    url: "https://your-supabase-project.supabase.co",
    anonKey: "your-anon-key-here"
  },
  
  // Branding Colors
  colors: {
    primary: "#2563EB",
    secondary: "#1e40af",
    accent: "#3b82f6",
  },
  
  // App Store Details
  bundleId: "com.yourorganization.mobile",
  appName: "Your Organization App",
  
  // Contact
  support: {
    email: "support@yourorg.com",
    phone: "+91-XXXXXXXXXX",
    website: "https://yourorg.edustacks.co.in"
  }
};
```

### 2. Update App Branding Assets

Replace these files with organization-specific branding:

- **App Icon**: `mobile-app/assets/icon.png` (1024x1024)
- **Splash Screen**: `mobile-app/assets/splash.png` (1284x2778)
- **Logo**: `mobile-app/assets/logo.png`
- **Adaptive Icon** (Android): `mobile-app/assets/adaptive-icon.png`

### 3. Update app.json

Edit `mobile-app/app.json`:

```json
{
  "expo": {
    "name": "Your Organization Name",
    "slug": "your-org-lms",
    "ios": {
      "bundleIdentifier": "com.yourorganization.mobile"
    },
    "android": {
      "package": "com.yourorganization.mobile"
    }
  }
}
```

### 4. Test the App

```bash
cd mobile-app
npx expo start
```

Verify:
- [ ] App connects to correct Supabase database
- [ ] Exams load from correct website URL
- [ ] Login works for organization's users
- [ ] Branding (colors, logo) appears correctly

### 5. Build & Deploy

**For Testing (Development Build):**
```bash
npx expo run:android  # Android
npx expo run:ios      # iOS
```

**For Production (EAS Build):**
```bash
# Setup EAS
npm install -g eas-cli
eas login
eas build:configure

# Build for Android
eas build --platform android --profile production

# Build for iOS
eas build --platform ios --profile production
```

### 6. Submit to App Stores

**Google Play Store:**
1. Create new app listing in Play Console
2. Upload APK/AAB from EAS build
3. Fill in store listing details
4. Submit for review

**Apple App Store:**
1. Create new app in App Store Connect
2. Upload IPA from EAS build
3. Fill in store listing details
4. Submit for review

## Checklist for New Organization

- [ ] Create organization subdomain (e.g., `neworg.edustacks.co.in`)
- [ ] Setup Supabase project for organization
- [ ] Update `config/organization.js`
- [ ] Replace app icons and branding assets
- [ ] Update `app.json` with new bundle ID
- [ ] Test app thoroughly
- [ ] Build production APK/IPA
- [ ] Create Play Store/App Store listings
- [ ] Submit for review
- [ ] Provide app download links to organization

## Maintenance

When you update features:
1. Update code in `mobile-app/`
2. Test with one organization's config
3. Build and deploy updates for ALL organization apps
4. Each organization gets the update via their respective app store

## Notes

- Each organization app is completely independent
- Updates must be deployed to all organization apps
- Consider using EAS Update for over-the-air JavaScript updates
- Keep track of which organizations have which app versions

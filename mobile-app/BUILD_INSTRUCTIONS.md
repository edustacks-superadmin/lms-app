# How to Build for Google Play Store

Since you are using Expo, the best way to build your app is using **EAS Build** (Expo Application Services).

## Prerequisites

1.  **Set Package Name**: I have already updated your `app.json` with a default package name: `com.lmsapp.mobile`.
    *   *Optional*: If you want a different one, open `app.json` and change `"package": "com.lmsapp.mobile"` to your desired ID (e.g., `com.yourcompany.lms`).

## Step-by-Step Build Guide

Open your terminal in `d:\dev\LMS APP\mobile-app` and run the following commands:

### 1. Install EAS CLI
If you haven't installed it yet:
```powershell
npm install -g eas-cli
```

### 2. Login to Expo
You need an Expo account.
```powershell
eas login
```

### 3. Configure the Project
This creates an `eas.json` file which defines your build profiles.
```powershell
eas build:configure
```
*   Select **Android** when asked.

### 4. Build the AAB (Android App Bundle)
This file is what you upload to the Google Play Store.
```powershell
$env:EAS_NO_VCS="1"; eas build -p android
```
*   This will upload your code to Expo's servers and build it there.
*   Once finished, it will provide a link to download the `.aab` file.
*   **Important**: When asked **"Generate a new Android Keystore?"**, type **Y** and press Enter.

### 5. (Simpler Option) Build an APK for testing
If you just want an APK to install on your phone directly for testing (not for Play Store):
```powershell
$env:EAS_NO_VCS="1"; eas build -p android --profile preview
```


## Troubleshooting
*   **Keystore**: EAS manages your Android Keystore automatically. If this is your first time, let EAS generate one for you.
*   **Credentials**: If prompted, choose "Set up a new keystore".

## FAQ
### Is Android Studio useful?
Yes! Since you have Android Studio, you can build the app **locally** on your laptop. This is often faster than waiting for the cloud queue.

#### How to build locally (using your Android Studio setup):
> **Note for Windows Users**: This command requires **WSL (Windows Subsystem for Linux)** to be installed and set up. If you see an "Unsupported platform" error, it means you don't have WSL. in that case, **please use the Cloud Build (Step 4)** and wait for the queue.

1.  **Prerequisites**: Ensure you have Java and Android SDK installed (which you likely do with Android Studio).
2.  **Run the local build command**:
    ```powershell
    $env:EAS_NO_VCS="1"; eas build -p android --local
    ```
3.  **What happens**:
    - EAS will use the Gradle tools from your Android Studio installation.
    - It will compile the `.aab` file directly on your computer.
    - The file will be saved in your project folder (no download link needed).

#### How to test on Emulator:
1.  Open **Android Studio**.
2.  Click usually on the "Device Manager" or "AVD Manager" icon (phone with android logo).
3.  Start a virtual device (Emulator).
4.  Drag and drop the built `.apk` file (note: for testing, building an APK is better than AAB) onto the emulator screen to install it.

## Release to Google Play Store

Once you have the `.aab` file (either downloaded from the cloud link or built locally):

1.  **Go to Google Play Console**: [https://play.google.com/console](https://play.google.com/console)
2.  **Create App**: Click "Create app" and fill in the details (App Name, Language, Free/Paid).
3.  **Upload Bundle**:
    - Go to **Testing** -> **Internal testing** (recommended for first test) OR **Production**.
    - Click "Create new release".
    - Upload the `.aab` file you downloaded.
4.  **Complete Listing**: You will need to fill out the "Store listing" (Description, Screenshots, Icon) and "App Content" (Privacy Policy, etc.) before you can fully release.


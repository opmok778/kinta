# KINTA Android Wrapper

This Android project wraps the existing mobile KINTA web experience at `/android/index.html` in a native `WebView`.

## What It Does

- Opens the KINTA mobile UI inside an Android app
- Lets you change the server URL from inside the app
- Defaults to `http://10.0.2.2:3000/android/index.html` for Android Emulator local development
- Supports local HTTP during development and HTTPS for a deployed server

## Build Requirements

- Android Studio Jellyfish or newer
- Android SDK Platform 34
- JDK 17

## Build Steps

1. Open `android-app/` in Android Studio.
2. Let Android Studio install the missing SDK components if it prompts you.
3. Build the debug APK from `Build > Build Bundle(s) / APK(s) > Build APK(s)`.
4. Install the generated APK on your device or emulator.

## Server URL Examples

- Emulator: `http://10.0.2.2:3000/android/index.html`
- Physical phone on the same Wi-Fi: `http://YOUR-COMPUTER-LAN-IP:3000/android/index.html`
- Hosted deployment: `https://your-domain.example/android/index.html`

## Notes

- The Python backend still runs outside Android. The APK is a native shell around the current web app.
- This repo does not include the Gradle wrapper binary, so Android Studio is the easiest way to open and build the project.

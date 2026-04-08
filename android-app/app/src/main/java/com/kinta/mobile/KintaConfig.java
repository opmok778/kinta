package com.kinta.mobile;

import android.content.Context;
import android.content.SharedPreferences;
import android.net.Uri;

final class KintaConfig {
    private static final String PREFS_NAME = "kinta_settings";
    private static final String KEY_HOME_URL = "home_url";
    static final String DEFAULT_HOME_URL = "http://10.0.2.2:3000/android/index.html";

    private KintaConfig() {
    }

    static SharedPreferences preferences(Context context) {
        return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
    }

    static String getHomeUrl(Context context) {
        String stored = preferences(context).getString(KEY_HOME_URL, DEFAULT_HOME_URL);
        return normalizeHomeUrl(stored);
    }

    static void saveHomeUrl(Context context, String rawUrl) {
        preferences(context)
            .edit()
            .putString(KEY_HOME_URL, normalizeHomeUrl(rawUrl))
            .apply();
    }

    static String normalizeHomeUrl(String rawUrl) {
        String candidate = rawUrl == null ? "" : rawUrl.trim();
        if (candidate.isEmpty()) {
            return DEFAULT_HOME_URL;
        }

        if (!candidate.matches("^[a-zA-Z][a-zA-Z0-9+.-]*://.*$")) {
            candidate = "http://" + candidate;
        }

        Uri uri = Uri.parse(candidate);
        String scheme = uri.getScheme();
        if (scheme == null
            || (!"http".equalsIgnoreCase(scheme) && !"https".equalsIgnoreCase(scheme))) {
            throw new IllegalArgumentException("Use an http:// or https:// URL.");
        }

        String host = uri.getHost();
        if (host == null || host.trim().isEmpty()) {
            throw new IllegalArgumentException("Enter a valid server address.");
        }

        String path = uri.getEncodedPath();
        Uri.Builder builder = uri.buildUpon();
        if (path == null || path.isEmpty() || "/".equals(path)) {
            builder.path("/android/index.html");
        } else if ("/android".equals(path) || "/android/".equals(path)) {
            builder.path("/android/index.html");
        }
        return builder.build().toString();
    }

    static boolean isDefaultHomeUrl(String rawUrl) {
        return DEFAULT_HOME_URL.equals(normalizeHomeUrl(rawUrl));
    }
}

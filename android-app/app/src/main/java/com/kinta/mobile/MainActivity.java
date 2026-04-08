package com.kinta.mobile;

import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.os.Build;
import android.net.Uri;
import android.os.Bundle;
import android.view.Menu;
import android.view.MenuItem;
import android.view.View;
import android.webkit.CookieManager;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceError;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.appcompat.app.ActionBar;
import androidx.appcompat.app.AppCompatActivity;
import androidx.appcompat.widget.Toolbar;
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;

public class MainActivity extends AppCompatActivity {
    private WebView webView;
    private SwipeRefreshLayout swipeRefreshLayout;
    private View connectionHelp;
    private TextView connectionHelpTitle;
    private TextView connectionHelpMessage;
    private String currentHomeUrl;
    private boolean mainFrameLoadFailed;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        Toolbar toolbar = findViewById(R.id.toolbar);
        setSupportActionBar(toolbar);
        setTitle(R.string.app_name);

        swipeRefreshLayout = findViewById(R.id.swipeRefresh);
        webView = findViewById(R.id.kintaWebView);
        connectionHelp = findViewById(R.id.connectionHelp);
        connectionHelpTitle = findViewById(R.id.connectionHelpTitle);
        connectionHelpMessage = findViewById(R.id.connectionHelpMessage);

        Button openSettingsButton = findViewById(R.id.openSettingsButton);
        Button retryLoadButton = findViewById(R.id.retryLoadButton);
        openSettingsButton.setOnClickListener(view -> startActivity(new Intent(this, SettingsActivity.class)));
        retryLoadButton.setOnClickListener(view -> loadConfiguredUrl());

        configureWebView();
        swipeRefreshLayout.setOnRefreshListener(() -> webView.reload());

        if (savedInstanceState != null) {
            webView.restoreState(savedInstanceState);
            currentHomeUrl = KintaConfig.getHomeUrl(this);
            updateSubtitle(currentHomeUrl);
        } else {
            loadConfiguredUrl();
        }
    }

    @Override
    protected void onResume() {
        super.onResume();

        String configuredUrl = KintaConfig.getHomeUrl(this);
        if (currentHomeUrl == null || !configuredUrl.equals(currentHomeUrl)) {
            loadConfiguredUrl();
        }
    }

    @Override
    protected void onSaveInstanceState(@NonNull Bundle outState) {
        super.onSaveInstanceState(outState);
        webView.saveState(outState);
    }

    @Override
    public void onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack();
            return;
        }
        super.onBackPressed();
    }

    @Override
    public boolean onCreateOptionsMenu(Menu menu) {
        getMenuInflater().inflate(R.menu.main_menu, menu);
        return true;
    }

    @Override
    public boolean onOptionsItemSelected(@NonNull MenuItem item) {
        int itemId = item.getItemId();
        if (itemId == R.id.action_reload) {
            webView.reload();
            return true;
        }
        if (itemId == R.id.action_server_settings) {
            startActivity(new Intent(this, SettingsActivity.class));
            return true;
        }
        return super.onOptionsItemSelected(item);
    }

    private void configureWebView() {
        CookieManager cookieManager = CookieManager.getInstance();
        cookieManager.setAcceptCookie(true);
        cookieManager.setAcceptThirdPartyCookies(webView, true);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE);

        webView.setWebChromeClient(new WebChromeClient());
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri url = request.getUrl();
                String scheme = url.getScheme();
                if ("http".equalsIgnoreCase(scheme) || "https".equalsIgnoreCase(scheme)) {
                    return false;
                }
                openExternal(url);
                return true;
            }

            @Override
            public void onPageStarted(WebView view, String url, android.graphics.Bitmap favicon) {
                mainFrameLoadFailed = false;
                hideConnectionHelp();
                swipeRefreshLayout.setRefreshing(true);
                updateSubtitle(url);
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                swipeRefreshLayout.setRefreshing(false);
                if (!mainFrameLoadFailed) {
                    hideConnectionHelp();
                }
                updateSubtitle(url);
            }

            @Override
            public void onReceivedError(
                WebView view,
                WebResourceRequest request,
                WebResourceError error
            ) {
                if (request.isForMainFrame()) {
                    mainFrameLoadFailed = true;
                    swipeRefreshLayout.setRefreshing(false);
                    showConnectionHelp(
                        getString(R.string.connection_help_title),
                        buildConnectionHelpMessage(
                            getString(R.string.connection_help_network_error),
                            currentHomeUrl,
                            getString(R.string.connection_help_network_error_tip)
                        )
                    );
                    Toast.makeText(
                        MainActivity.this,
                        R.string.page_load_failed,
                        Toast.LENGTH_LONG
                    ).show();
                }
            }
        });
    }

    private void loadConfiguredUrl() {
        currentHomeUrl = KintaConfig.getHomeUrl(this);
        updateSubtitle(currentHomeUrl);
        mainFrameLoadFailed = false;

        if (KintaConfig.isDefaultHomeUrl(currentHomeUrl) && !isProbablyEmulator()) {
            swipeRefreshLayout.setRefreshing(false);
            webView.stopLoading();
            showConnectionHelp(
                getString(R.string.connection_help_title),
                buildConnectionHelpMessage(
                    getString(R.string.connection_help_physical_device),
                    currentHomeUrl,
                    getString(R.string.connection_help_physical_device_tip)
                )
            );
            return;
        }

        hideConnectionHelp();
        webView.loadUrl(currentHomeUrl);
    }

    private void updateSubtitle(String url) {
        ActionBar actionBar = getSupportActionBar();
        if (actionBar == null || url == null || url.trim().isEmpty()) {
            return;
        }

        Uri uri = Uri.parse(url);
        String host = uri.getHost();
        if (host == null || host.trim().isEmpty()) {
            actionBar.setSubtitle(url);
            return;
        }

        String subtitle = host;
        if (uri.getPort() != -1) {
            subtitle += ":" + uri.getPort();
        }
        actionBar.setSubtitle(subtitle);
    }

    private void openExternal(Uri uri) {
        Intent intent = new Intent(Intent.ACTION_VIEW, uri);
        try {
            startActivity(intent);
        } catch (ActivityNotFoundException ignored) {
            Toast.makeText(this, R.string.no_app_available, Toast.LENGTH_SHORT).show();
        }
    }

    private void showConnectionHelp(String title, String message) {
        connectionHelpTitle.setText(title);
        connectionHelpMessage.setText(message);
        connectionHelp.setVisibility(View.VISIBLE);
    }

    private void hideConnectionHelp() {
        connectionHelp.setVisibility(View.GONE);
    }

    private boolean isProbablyEmulator() {
        return Build.FINGERPRINT.startsWith("generic")
            || Build.FINGERPRINT.contains("emulator")
            || Build.MODEL.contains("Emulator")
            || Build.MODEL.contains("Android SDK built for")
            || Build.MANUFACTURER.contains("Genymotion")
            || Build.PRODUCT.contains("sdk")
            || Build.HARDWARE.contains("goldfish")
            || Build.HARDWARE.contains("ranchu");
    }

    private String buildConnectionHelpMessage(String intro, String url, String tip) {
        return intro
            + "\n\n"
            + getString(R.string.connection_help_use_url, url)
            + "\n\n"
            + tip;
    }
}

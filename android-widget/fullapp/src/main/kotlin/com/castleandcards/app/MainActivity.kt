package com.castleandcards.app

import android.annotation.SuppressLint
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.view.View
import android.webkit.CookieManager
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback

/**
 * Single-activity WebView wrapper around https://castleandcards.com.
 *
 * Initial iteration: this is just a chromeful WebView, not a TWA. To
 * upgrade to a TWA later, host /.well-known/assetlinks.json on the site
 * with the APK's signing-cert SHA-256 and swap MainActivity for
 * androidx.browser.trusted.LauncherActivity.
 */
class MainActivity : ComponentActivity() {

    private lateinit var webView: WebView

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        webView = WebView(this).apply {
            // Fill the activity edge-to-edge. The PWA already handles its
            // own safe-area insets via env(safe-area-inset-*).
            fitsSystemWindows = false
            settings.apply {
                javaScriptEnabled = true
                domStorageEnabled = true
                databaseEnabled = true
                @Suppress("DEPRECATION")
                allowFileAccess = false
                allowContentAccess = false
                mediaPlaybackRequiresUserGesture = false
                cacheMode = WebSettings.LOAD_DEFAULT
                userAgentString = userAgentString + " CastleAndCardsApp/1.0"
                useWideViewPort = true
                loadWithOverviewMode = true
                // Allow viewport meta-tag scaling — same as Chrome.
                builtInZoomControls = false
                displayZoomControls = false
            }

            // Accept cookies, including third-party (for any future OAuth).
            CookieManager.getInstance().setAcceptCookie(true)
            CookieManager.getInstance().setAcceptThirdPartyCookies(this, true)

            webViewClient = object : WebViewClient() {
                override fun shouldOverrideUrlLoading(
                    view: WebView,
                    request: WebResourceRequest,
                ): Boolean {
                    val url = request.url
                    // Keep in-app navigations on castleandcards.com; bounce
                    // anything off-domain (oauth callbacks, etc.) to the system.
                    return if (url.host?.endsWith("castleandcards.com") == true) {
                        false
                    } else {
                        startActivity(Intent(Intent.ACTION_VIEW, url))
                        true
                    }
                }
            }
        }
        setContentView(webView)

        // Hide soft system bars edge-to-edge but allow swipe to reveal.
        window.decorView.systemUiVisibility = (
            View.SYSTEM_UI_FLAG_LAYOUT_STABLE or
                View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION or
                View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
        )

        webView.loadUrl(START_URL)

        // System back → webview back → finish.
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (webView.canGoBack()) webView.goBack() else finish()
            }
        })
    }

    override fun onPause() {
        super.onPause()
        webView.onPause()
    }

    override fun onResume() {
        super.onResume()
        webView.onResume()
    }

    override fun onDestroy() {
        // Tear the WebView down cleanly so Chromium doesn't leak the
        // activity context.
        webView.stopLoading()
        webView.loadUrl("about:blank")
        webView.destroy()
        super.onDestroy()
    }

    companion object {
        private const val START_URL = "https://castleandcards.com/"
    }
}

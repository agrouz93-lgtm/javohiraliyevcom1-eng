package uz.ustapro;

import android.Manifest;
import android.app.Activity;
import android.app.AlertDialog;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.util.Base64;
import android.app.DownloadManager;
import android.os.Environment;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.Toast;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.Collections;

public class MainActivity extends Activity {
    private static final String LOCAL = "https://appassets.androidplatform.net/";
    private static final int CAMERA = 1;
    private static final int PICK_IMAGE = 2;
    private static final int SAVE_FILE = 3;
    private static final int TAKE_PHOTO = 4;
    private static final int NATIVE_CAMERA_PERMISSION = 5;
    private WebView web;
    private String startUrl;
    private PermissionRequest cameraRequest;
    private ValueCallback<Uri[]> imageRequest;
    private byte[] pendingFile;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().setStatusBarColor(Color.rgb(16, 21, 37));
        getWindow().setNavigationBarColor(Color.rgb(16, 21, 37));
        startUrl = getPreferences(MODE_PRIVATE).getString("server", LOCAL);

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(Color.rgb(16, 21, 37));
        Button server = new Button(this);
        server.setText("USTA PRO  ·  Server sozlamalari");
        server.setAllCaps(false);
        server.setOnClickListener(view -> chooseServer());
        root.addView(server, new LinearLayout.LayoutParams(-1, -2));

        web = new WebView(this);
        web.getSettings().setJavaScriptEnabled(true);
        web.getSettings().setDomStorageEnabled(true);
        web.getSettings().setAllowFileAccess(false);
        web.getSettings().setAllowContentAccess(true);
        web.getSettings().setMediaPlaybackRequiresUserGesture(false);
        configureExportBridge();
        web.setWebViewClient(new WebViewClient() {
            @Override public boolean onRenderProcessGone(WebView view, android.webkit.RenderProcessGoneDetail detail) {
                view.destroy();
                recovery();
                return true;
            }
            @Override public void onReceivedError(WebView view, WebResourceRequest request, android.webkit.WebResourceError error) {
                if (request.isForMainFrame()) recovery();
            }

            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                if (request.isForMainFrame() && sameOrigin(request.getUrl(), Uri.parse(startUrl)) &&
                    "/api/auth/google".equals(request.getUrl().getPath()) && !LOCAL.equals(startUrl)) {
                    launchGoogle(request.getUrl());
                    return true;
                }
                return request.isForMainFrame() && !sameOrigin(request.getUrl(), Uri.parse(startUrl));
            }

            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if (!sameOrigin(uri, Uri.parse(LOCAL))) return null;
                String path = uri.getPath();
                if (path == null || path.contains("..") || path.indexOf('\\') >= 0) {
                    return message(404, "Not Found", "{}");
                }
                if (path.startsWith("/api/")) {
                    return message(503, "Service Unavailable",
                        "{\"detail\":\"Bu funksiya serverga ulanadi. Server sozlamalarida HTTPS manzilini kiriting.\"}");
                }
                if (path.equals("/")) path = "/index.html";
                try {
                    return new WebResourceResponse(mime(path), "UTF-8", getAssets().open("web" + path));
                } catch (IOException exception) {
                    return message(404, "Not Found", "{}");
                }
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override public void onPermissionRequest(PermissionRequest request) {
                runOnUiThread(() -> {
                    if (!sameOrigin(request.getOrigin(), Uri.parse(startUrl)) ||
                        !java.util.Arrays.asList(request.getResources()).contains(PermissionRequest.RESOURCE_VIDEO_CAPTURE) ||
                        cameraRequest != null) {
                        request.deny();
                    } else if (checkSelfPermission(Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) {
                        request.grant(new String[]{PermissionRequest.RESOURCE_VIDEO_CAPTURE});
                    } else {
                        cameraRequest = request;
                        requestPermissions(new String[]{Manifest.permission.CAMERA}, CAMERA);
                    }
                });
            }

            @Override public void onPermissionRequestCanceled(PermissionRequest request) {
                if (cameraRequest == request) cameraRequest = null;
            }

            @Override public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (imageRequest != null) imageRequest.onReceiveValue(null);
                imageRequest = callback;
                if (params.isCaptureEnabled()) {
                    if (checkSelfPermission(Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) takePhoto();
                    else requestPermissions(new String[]{Manifest.permission.CAMERA}, NATIVE_CAMERA_PERMISSION);
                    return true;
                }
                Intent picker = new Intent(Intent.ACTION_OPEN_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE);
                boolean plan = java.util.Arrays.stream(params.getAcceptTypes())
                    .anyMatch(type -> type.contains("json") || type.contains("glb") || type.contains("gltf"));
                picker.setType(plan ? "*/*" : "image/*");
                if (!plan) picker.putExtra(Intent.EXTRA_MIME_TYPES, new String[]{"image/jpeg", "image/png", "image/webp"});
                try {
                    startActivityForResult(picker, PICK_IMAGE);
                } catch (android.content.ActivityNotFoundException exception) {
                    imageRequest = null;
                    callback.onReceiveValue(null);
                }
                return true;
            }
        });
        web.setDownloadListener((url, agent, disposition, mime, length) -> {
            Uri source = Uri.parse(url);
            if (!sameOrigin(source, Uri.parse(startUrl)) || startUrl.equals(LOCAL)) return;
            if (!"/api/report.pdf".equals(source.getPath())) return;
            DownloadManager.Request download = new DownloadManager.Request(source);
            String cookies = CookieManager.getInstance().getCookie(url);
            if (cookies != null) download.addRequestHeader("Cookie", cookies);
            download.addRequestHeader("User-Agent", agent);
            download.setMimeType("application/pdf");
            download.setTitle("USTA PRO hisoboti");
            download.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
            download.setDestinationInExternalFilesDir(this, Environment.DIRECTORY_DOWNLOADS,
                "usta-hisobot-" + System.currentTimeMillis() + ".pdf");
            getSystemService(DownloadManager.class).enqueue(download);
        });
        root.addView(web, new LinearLayout.LayoutParams(-1, 0, 1));
        setContentView(root);
        web.loadUrl(startUrl);
        receiveSignIn(getIntent());
    }

    private void launchGoogle(Uri url) {
        byte[] random = new byte[48];
        new java.security.SecureRandom().nextBytes(random);
        String verifier = Base64.encodeToString(random, Base64.URL_SAFE | Base64.NO_PADDING | Base64.NO_WRAP);
        try {
            byte[] hashed = java.security.MessageDigest.getInstance("SHA-256").digest(verifier.getBytes(StandardCharsets.UTF_8));
            String challenge = Base64.encodeToString(hashed, Base64.URL_SAFE | Base64.NO_PADDING | Base64.NO_WRAP);
            getPreferences(MODE_PRIVATE).edit().putString("oauthVerifier", verifier).apply();
            Uri target = url.buildUpon().appendQueryParameter("client","android").appendQueryParameter("app_challenge",challenge).build();
            startActivity(new Intent(Intent.ACTION_VIEW,target));
        } catch (java.security.NoSuchAlgorithmException | android.content.ActivityNotFoundException exception) {
            Toast.makeText(this,"Google kirishini ochib bo‘lmadi.",Toast.LENGTH_LONG).show();
        }
    }

    @Override protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        receiveSignIn(intent);
    }

    private void receiveSignIn(Intent intent) {
        Uri link = intent == null ? null : intent.getData();
        if (link == null || !"ustapro".equals(link.getScheme()) || !"signin".equals(link.getHost()) || LOCAL.equals(startUrl)) return;
        String code = link.getQueryParameter("code");
        String verifier = getPreferences(MODE_PRIVATE).getString("oauthVerifier",null);
        if (code == null || !code.matches("[A-Za-z0-9_-]{30,100}") || verifier == null) return;
        getPreferences(MODE_PRIVATE).edit().remove("oauthVerifier").apply();
        Uri destination = Uri.parse(startUrl).buildUpon().path("/api/auth/mobile/exchange").clearQuery().fragment(null).build();
        String body = "code=" + code + "&verifier=" + verifier;
        web.postUrl(destination.toString(),body.getBytes(StandardCharsets.UTF_8));
    }

    private void recovery() {
        runOnUiThread(() -> {
            LinearLayout layout = new LinearLayout(this);
            layout.setOrientation(LinearLayout.VERTICAL);
            layout.setGravity(android.view.Gravity.CENTER);
            layout.setPadding(32,32,32,32);
            layout.setBackgroundColor(Color.rgb(16,21,37));
            android.widget.TextView title = new android.widget.TextView(this);
            title.setText("Sahifa to‘xtadi. Qayta oching yoki oflayn rejimni tanlang.");
            title.setTextColor(Color.WHITE);
            title.setTextSize(18);
            layout.addView(title);
            Button reload = new Button(this);
            reload.setText("Qayta ochish");
            reload.setOnClickListener(v -> recreate());
            layout.addView(reload);
            Button offline = new Button(this);
            offline.setText("Oflayn rejim");
            offline.setOnClickListener(v -> {
                getPreferences(MODE_PRIVATE).edit().putString("server",LOCAL).apply();
                recreate();
            });
            layout.addView(offline);
            setContentView(layout);
        });
    }

    private void takePhoto() {
        Uri output = Uri.parse("content://uz.ustapro.camera/capture.jpg");
        Intent camera = new Intent(android.provider.MediaStore.ACTION_IMAGE_CAPTURE);
        camera.putExtra(android.provider.MediaStore.EXTRA_OUTPUT, output);
        camera.setClipData(android.content.ClipData.newRawUri("USTA PRO rasm",output));
        camera.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
        try { startActivityForResult(camera, TAKE_PHOTO); }
        catch (android.content.ActivityNotFoundException | SecurityException exception) {
            if (imageRequest != null) imageRequest.onReceiveValue(null);
            imageRequest = null;
            Toast.makeText(this,"Telefon kamerasi ochilmadi. Rasm yuklashdan foydalaning.",Toast.LENGTH_LONG).show();
        }
    }

    private static boolean sameOrigin(Uri candidate, Uri trusted) {
        return "https".equals(candidate.getScheme()) && candidate.getHost() != null &&
            candidate.getHost().equalsIgnoreCase(trusted.getHost()) &&
            (candidate.getPort() == -1 ? 443 : candidate.getPort()) == (trusted.getPort() == -1 ? 443 : trusted.getPort());
    }

    private static WebResourceResponse message(int status, String reason, String json) {
        return new WebResourceResponse("application/json", "UTF-8", status, reason, Collections.emptyMap(),
            new ByteArrayInputStream(json.getBytes(StandardCharsets.UTF_8)));
    }

    private static String mime(String path) {
        if (path.endsWith(".html")) return "text/html";
        if (path.endsWith(".js")) return "application/javascript";
        if (path.endsWith(".css")) return "text/css";
        if (path.endsWith(".json")) return "application/json";
        if (path.endsWith(".png")) return "image/png";
        if (path.endsWith(".jpg") || path.endsWith(".jpeg")) return "image/jpeg";
        if (path.endsWith(".webp")) return "image/webp";
        if (path.endsWith(".glb")) return "model/gltf-binary";
        if (path.endsWith(".gltf")) return "model/gltf+json";
        if (path.endsWith(".svg")) return "image/svg+xml";
        if (path.endsWith(".woff2")) return "font/woff2";
        return "text/plain";
    }

    private void chooseServer() {
        EditText input = new EditText(this);
        input.setSingleLine(true);
        input.setInputType(android.text.InputType.TYPE_CLASS_TEXT | android.text.InputType.TYPE_TEXT_VARIATION_URI);
        input.setHint("https://usta.example.uz");
        if (!startUrl.equals(LOCAL)) input.setText(startUrl);
        AlertDialog dialog = new AlertDialog.Builder(this)
            .setTitle("USTA PRO serveri")
            .setMessage("Hisob, saqlash va AI uchun HTTPS orqali ishlayotgan USTA PRO sayti manzilini kiriting.")
            .setView(input)
            .setNegativeButton("Bekor qilish", null)
            .setNeutralButton("Oflayn rejim", (box, which) -> open(LOCAL))
            .setPositiveButton("Ulanish", null).create();
        dialog.setOnShowListener(ignored -> dialog.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener(view -> {
            String value = input.getText().toString().trim();
            Uri uri = Uri.parse(value);
            if (!"https".equals(uri.getScheme()) || uri.getHost() == null || uri.getUserInfo() != null ||
                uri.getFragment() != null || uri.getQuery() != null) {
                input.setError("Yaroqli HTTPS manzilini kiriting.");
                return;
            }
            open(value);
            dialog.dismiss();
        }));
        dialog.show();
    }

    private void open(String url) {
        startUrl = url;
        getPreferences(MODE_PRIVATE).edit().putString("server", url).apply();
        web.stopLoading();
        configureExportBridge();
        web.loadUrl(url);
    }

    @Override public void onRequestPermissionsResult(int code, String[] permissions, int[] results) {
        super.onRequestPermissionsResult(code, permissions, results);
        if (code == NATIVE_CAMERA_PERMISSION) {
            if (results.length > 0 && results[0] == PackageManager.PERMISSION_GRANTED) takePhoto();
            else { if (imageRequest != null) imageRequest.onReceiveValue(null); imageRequest = null; }
            return;
        }
        if (code != CAMERA || cameraRequest == null) return;
        PermissionRequest request = cameraRequest;
        cameraRequest = null;
        if (results.length > 0 && results[0] == PackageManager.PERMISSION_GRANTED &&
            sameOrigin(request.getOrigin(), Uri.parse(startUrl))) {
            request.grant(new String[]{PermissionRequest.RESOURCE_VIDEO_CAPTURE});
        } else request.deny();
    }

    private void configureExportBridge() {
        web.removeJavascriptInterface("UstaAndroid");
        if (startUrl.equals(LOCAL)) web.addJavascriptInterface(new ExportBridge(), "UstaAndroid");
    }

    public class ExportBridge {
        @JavascriptInterface public void save(String name, String data) {
            if (name == null || data == null || data.length() > 16_000_000) return;
            String mime = name.equals("usta-reja.json") ? "application/json"
                : name.equals("usta-3d.png") ? "image/png" : name.equals("usta-model.glb") ? "model/gltf-binary" : null;
            if (mime == null) return;
            runOnUiThread(() -> {
                if (pendingFile != null || !startUrl.equals(LOCAL)) return;
                try {
                    pendingFile = Base64.decode(data, Base64.DEFAULT);
                    Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE);
                    intent.setType(mime).putExtra(Intent.EXTRA_TITLE, name);
                    startActivityForResult(intent, SAVE_FILE);
                } catch (IllegalArgumentException | android.content.ActivityNotFoundException exception) {
                    pendingFile = null;
                    Toast.makeText(MainActivity.this, "Faylni saqlab bo‘lmadi.", Toast.LENGTH_SHORT).show();
                }
            });
        }
    }

    @Override protected void onActivityResult(int code, int result, Intent data) {
        super.onActivityResult(code, result, data);
        if (code == TAKE_PHOTO && imageRequest != null) {
            imageRequest.onReceiveValue(result == RESULT_OK ?
                new Uri[]{Uri.parse("content://uz.ustapro.camera/capture.jpg")} : null);
            imageRequest = null;
        }
        if (code == PICK_IMAGE && imageRequest != null) {
            Uri uri = result == RESULT_OK && data != null ? data.getData() : null;
            imageRequest.onReceiveValue(uri == null ? null : new Uri[]{uri});
            imageRequest = null;
        }
        if (code == SAVE_FILE && pendingFile != null) {
            byte[] contents = pendingFile;
            pendingFile = null;
            Uri uri = result == RESULT_OK && data != null ? data.getData() : null;
            if (uri == null) return;
            try (OutputStream stream = getContentResolver().openOutputStream(uri)) {
                if (stream == null) throw new IOException("Missing output stream");
                stream.write(contents);
            } catch (IOException exception) {
                Toast.makeText(this, "Faylni saqlab bo‘lmadi.", Toast.LENGTH_SHORT).show();
            }
        }
    }
}




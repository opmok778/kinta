package com.kinta.mobile;

import android.content.Intent;
import android.os.Bundle;
import android.view.MenuItem;
import android.widget.Button;
import android.widget.EditText;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.appcompat.widget.Toolbar;

public class SettingsActivity extends AppCompatActivity {
    private EditText homeUrlInput;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_settings);

        Toolbar toolbar = findViewById(R.id.toolbar);
        setSupportActionBar(toolbar);
        setTitle(R.string.server_settings_title);
        if (getSupportActionBar() != null) {
            getSupportActionBar().setDisplayHomeAsUpEnabled(true);
        }

        homeUrlInput = findViewById(R.id.homeUrlInput);
        homeUrlInput.setText(KintaConfig.getHomeUrl(this));

        Button saveButton = findViewById(R.id.saveServerUrlButton);
        Button openAppButton = findViewById(R.id.openAppButton);

        saveButton.setOnClickListener(view -> saveSettings(false));
        openAppButton.setOnClickListener(view -> saveSettings(true));
    }

    @Override
    public boolean onOptionsItemSelected(@NonNull MenuItem item) {
        if (item.getItemId() == android.R.id.home) {
            finish();
            return true;
        }
        return super.onOptionsItemSelected(item);
    }

    private void saveSettings(boolean reopenApp) {
        String rawUrl = homeUrlInput.getText().toString();
        try {
            String normalizedUrl = KintaConfig.normalizeHomeUrl(rawUrl);
            KintaConfig.saveHomeUrl(this, normalizedUrl);
            homeUrlInput.setText(normalizedUrl);
            homeUrlInput.setError(null);
            Toast.makeText(this, R.string.server_url_saved, Toast.LENGTH_SHORT).show();

            if (reopenApp) {
                Intent intent = new Intent(this, MainActivity.class);
                intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
                startActivity(intent);
                finish();
            }
        } catch (IllegalArgumentException error) {
            homeUrlInput.setError(error.getMessage());
        }
    }
}

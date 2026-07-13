#include <Arduino.h>
#include <WiFi.h>

extern "C" {
#include "esp_wifi.h"
}

static const char* NODE_ID = "NODE_A";

static volatile float g_motionIndex = 0.0f;
static volatile float g_energy = 0.0f;
static volatile int g_rssi = -127;
static volatile int g_len = 0;

static constexpr int kMaxBins = 128;
static float g_baselineBins[kMaxBins] = {0.0f};
static bool g_baselineReady = false;
static float g_noiseFloor = 0.0f;
static float g_rssiBaseline = -127.0f;

static void wifiCsiCallback(void* ctx, wifi_csi_info_t* info) {
    (void)ctx;
    if (info == nullptr || info->buf == nullptr || info->len <= 0) {
        return;
    }

    const int pairCount = (info->len / 2);
    if (pairCount <= 0) {
        return;
    }

    float energy = 0.0f;
    float deltaSum = 0.0f;
    const int bins = pairCount < kMaxBins ? pairCount : kMaxBins;

    for (int i = 0; i < bins; ++i) {
        const float iPart = static_cast<float>(info->buf[2 * i]);
        const float qPart = static_cast<float>(info->buf[(2 * i) + 1]);
        const float mag = sqrtf((iPart * iPart) + (qPart * qPart));
        energy += mag;

        if (!g_baselineReady) {
            g_baselineBins[i] = mag;
        }

        const float delta = fabsf(mag - g_baselineBins[i]);
        deltaSum += delta;

        // Slow per-bin baseline tracking keeps long-term drift out of motion index.
        g_baselineBins[i] = (0.995f * g_baselineBins[i]) + (0.005f * mag);
    }

    g_baselineReady = true;
    energy /= static_cast<float>(bins);

    const float motionRaw = (deltaSum / static_cast<float>(bins));

    const float rssiNow = static_cast<float>(info->rx_ctrl.rssi);
    if (g_rssiBaseline < -120.0f) {
        g_rssiBaseline = rssiNow;
    }
    g_rssiBaseline = (0.998f * g_rssiBaseline) + (0.002f * rssiNow);
    const float rssiDelta = fabsf(rssiNow - g_rssiBaseline);

    // Blend CSI-bin delta and RSSI delta to avoid zero-floor lock.
    const float motionBlend = (motionRaw * 0.65f) + (rssiDelta * 0.35f);
    g_noiseFloor = (0.998f * g_noiseFloor) + (0.002f * motionBlend);

    // Remove noise floor and amplify useful movement signal.
    float motionNet = motionBlend - (0.85f * g_noiseFloor);
    if (motionNet < 0.0f) {
        motionNet = 0.0f;
    }
    const float motionScaled = motionNet * 9.0f;

    g_motionIndex = (0.88f * g_motionIndex) + (0.12f * motionScaled);
    g_energy = energy;
    g_rssi = info->rx_ctrl.rssi;
    g_len = info->len;
}

static bool setupCsi() {
    WiFi.mode(WIFI_MODE_STA);
    WiFi.disconnect(true, true);
    delay(120);

    wifi_init_config_t cfg = WIFI_INIT_CONFIG_DEFAULT();
    if (esp_wifi_init(&cfg) != ESP_OK) {
        return false;
    }
    if (esp_wifi_set_storage(WIFI_STORAGE_RAM) != ESP_OK) {
        return false;
    }
    if (esp_wifi_set_mode(WIFI_MODE_STA) != ESP_OK) {
        return false;
    }
    if (esp_wifi_start() != ESP_OK) {
        return false;
    }
    if (esp_wifi_set_promiscuous(true) != ESP_OK) {
        return false;
    }

    wifi_csi_config_t csiConfig = {};
    csiConfig.lltf_en = true;
    csiConfig.htltf_en = true;
    csiConfig.stbc_htltf2_en = true;
    csiConfig.ltf_merge_en = true;
    csiConfig.channel_filter_en = true;
    csiConfig.manu_scale = false;
    csiConfig.shift = 0;

    if (esp_wifi_set_csi_config(&csiConfig) != ESP_OK) {
        return false;
    }
    if (esp_wifi_set_csi_rx_cb(&wifiCsiCallback, nullptr) != ESP_OK) {
        return false;
    }
    if (esp_wifi_set_csi(true) != ESP_OK) {
        return false;
    }

    return true;
}

void setup() {
    Serial.begin(115200);

    // Wait briefly for the USB serial connection
    unsigned long start = millis();
    while (!Serial && (millis() - start < 3000)) {
        delay(10);
    }

    Serial.println("ESP32-S3 Ready");
    Serial.printf("NODE,%s\n", NODE_ID);

    const bool csiOk = setupCsi();
    Serial.printf("CSI,%s,init,%d\n", NODE_ID, csiOk ? 1 : 0);
}

void loop() {
    const float motion = g_motionIndex;
    const float energy = g_energy;
    const int rssi = g_rssi;
    const int len = g_len;

    const float n = constrain(motion / 3.0f, 0.0f, 1.0f);
    const float x = -0.85f;
    const float y = -0.55f + (1.10f * n);
    const float z = 0.85f + (1.25f * n);

    Serial.printf("POSE,%.3f,%.3f,%.3f,%.3f\n", x, y, z, n);
    Serial.printf("CSI,%s,motion=%.6f,energy=%.3f,rssi=%d,len=%d\n", NODE_ID, motion, energy, rssi, len);
    Serial.println("SIGNAL");
    delay(25);
}

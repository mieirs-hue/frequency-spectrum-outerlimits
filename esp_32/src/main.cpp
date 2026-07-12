#include <Arduino.h>

void setup() {
    Serial.begin(115200);

    // Wait briefly for the USB serial connection
    unsigned long start = millis();
    while (!Serial && (millis() - start < 3000)) {
        delay(10);
    }

    Serial.println("ESP32-S3 Ready");
}

void loop() {
    Serial.println("SIGNAL");
    delay(1000);
}

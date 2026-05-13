#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

const char* ssid = "xxxxx";
const char* password = "xxxxx";

String url = "https://api.open-meteo.com/v1/forecast?latitude=-34.9214&longitude=-57.9544&current=temperature_2m";

void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("Conectando WiFi...");
  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("\nWiFi conectado");
  Serial.print("IP: ");
  Serial.println(WiFi.localIP());
}

void loop() {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;

    http.begin(url);

    int httpCode = http.GET();

    if (httpCode > 0) {
      String payload = http.getString();

      Serial.println("Respuesta JSON:");
      Serial.println(payload);

      DynamicJsonDocument doc(2048);
      deserializeJson(doc, payload);

      float temperatura = doc["current"]["temperature_2m"];

      Serial.print("Temperatura exterior La Plata: ");
      Serial.print(temperatura);
      Serial.println(" °C");

    } else {
      Serial.print("Error HTTP: ");
      Serial.println(httpCode);
    }

    http.end();
  }

  delay(10000);
}
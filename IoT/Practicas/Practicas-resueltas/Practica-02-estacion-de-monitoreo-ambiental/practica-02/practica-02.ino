#include <DHT.h>
#include <WiFi.h>
#include <PubSubClient.h>

#include "config.hpp"
#include "dht.hpp"
#include "mq135.hpp"
#include "conectar_wifi.hpp"

extern const int ldrPin;
extern char const *const mqttServer;
extern const int mqttPort;
extern const int readInterval;
extern DHT dht;

unsigned long lastReadTime = 0;

WiFiClient wifiClient;
PubSubClient mqttClient(wifiClient);

void setup()
{
  Serial.begin(115200);

  conectarWiFi();

  iniciarDHT();
  iniciarMQ135();
  pinMode(ldrPin, INPUT);

  mqttClient.setServer(mqttServer, mqttPort);
  if (mqttClient.connect("ESP32-Estacion-Monitoreo-Ambiental"))
  {
    Serial.println("Conectado exitosamente a MQTT");
  }
  else
  {
    Serial.print("Fallo la conexión a MQTT, estado: ");
    Serial.println(mqttClient.state());
  }
}

void loop()
{

  mqttClient.loop();
  if (millis() - lastReadTime > readInterval)
  {
    float temperature = dht.readTemperature();
    float humidity = dht.readHumidity();
    float calidadAire = leerCalidadDeAire();
    int ldrValue = analogRead(ldrPin);

    char payload[100];
    sprintf(payload, "{\"temp\": %.2f, \"hum\": %.2f, \"air\": %.2f, \"light\": %d}", temperature, humidity, calidadAire, ldrValue);
    if (mqttClient.connected())
    {
      mqttClient.publish("iot/ambiente", payload);
    } else {
      Serial.println("No se pudo enviar a MQTT, el cliente no está conectado.");
    }

    lastReadTime = millis();
  }
}

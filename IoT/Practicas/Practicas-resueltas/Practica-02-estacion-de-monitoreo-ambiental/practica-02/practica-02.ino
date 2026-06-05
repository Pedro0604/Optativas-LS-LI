#include <DHT.h>
#include <WiFi.h>
#include <PubSubClient.h>

#include "config.hpp"
#include "dht.hpp"
#include "mq135.hpp"
#include "conectar_wifi.hpp"

extern const int ldrPin;

extern const int readInterval;

extern char const *const mqttClientName;
extern char const *const mqttServer;
extern const int mqttPort;

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
  if (mqttClient.connect(mqttClientName))
  {
    Serial.println("Conectado exitosamente a MQTT");
  }
  else
  {
    Serial.print("Falló la conexión a MQTT, estado: ");
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
    }
    else
    {
      Serial.println("No se pudo enviar a MQTT, el cliente no está conectado.");
      Serial.println("Se intentará la reconexión con backoff exponencial.");

      int backoffTime = 1000;
      while (!mqttClient.connected())
      {
        Serial.println("Intentando reconectar a MQTT...");
        if (mqttClient.connect(mqttClientName))
        {
          Serial.println("Reconectado exitosamente a MQTT");
          break;
        }
        else
        {
          Serial.print("Falló la reconexión a MQTT, estado: ");
          Serial.println(mqttClient.state());
          Serial.printf("Esperando %ds antes del próximo intento...\n", backoffTime / 1000);
          delay(backoffTime);
          backoffTime = min(backoffTime * 2, 32000);
        }
      }
    }

    lastReadTime = millis();
  }
}

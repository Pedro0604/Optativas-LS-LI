#include <LittleFS.h>
#include <DHT.h>
#include <ESPAsyncWebServer.h>

#include "config.hpp"
#include "servidor.hpp"

extern const int ledPin;
extern DHT dht;

static bool ledIsOn = false;
static AsyncWebServer server(80);

/**
 * Maneja la ruta para obtener el estado del led.
 */
void getLED(AsyncWebServerRequest *request) {
  request->send(200, "text/plain", ledIsOn ? "1" : "0");
}

/**
 * Maneja la ruta para setear el led según el valor del parámetro 'on'.
 */
void setLED(AsyncWebServerRequest *request) {
  if (!request->hasParam("on")) {
    request->send(400, "text/plain", "Falta el parámetro 'on'");
    return;
  }

  bool paramIsOn = request->getParam("on")->value() == "1" ? true : false;
  digitalWrite(ledPin, paramIsOn ? HIGH : LOW);
  ledIsOn = paramIsOn;

  String mensaje = "El LED fue " + String(paramIsOn ? "encendido " : "apagado ") + "exitosamente.";
  request->send(200, "text/plain", mensaje);
}

/**
 * Maneja la ruta de temperatura, leyendo el valor del sensor DHT y enviándolo como respuesta.
 * Si ocurre un error al leer el sensor, se responde con un error 500.
 */
void getTemperature(AsyncWebServerRequest *request) {
  float temperature = dht.readTemperature();
  if (isnan(temperature)) {
    request->send(500, "text/plain", "Error al leer el sensor DHT");
    return;
  }
  request->send(200, "text/plain", String(temperature));
}

/**
 * Maneja la ruta de humedad, leyendo el valor del sensor DHT y enviándolo como respuesta.
 * Si ocurre un error al leer el sensor, se responde con un error 500.
 */
void getHumidity(AsyncWebServerRequest *request) {
  float humidity = dht.readHumidity();
  if (isnan(humidity)) {
    request->send(500, "text/plain", "Error al leer el sensor DHT");
    return;
  }
  request->send(200, "text/plain", String(humidity));
}

/**
 * Maneja el error 404, mostrando una archivo del LittleFS
   */
void handleNotFound(AsyncWebServerRequest *request) {
  request->send(LittleFS, "/404.html", "text/html");
}

/**
 * Inicia las rutas del servidor web
 */
void iniciarRutas() {
  Serial.println("Definiendo rutas del servidor web...");

  server.serveStatic("/", LittleFS, "/").setDefaultFile("index.html");

  server.on("/led", HTTP_GET, getLED);
  server.on("/led", HTTP_POST, setLED);
  server.on("/temperature", HTTP_GET, getTemperature);
  server.on("/humidity", HTTP_GET, getHumidity);
  server.onNotFound(handleNotFound);
}

/**
 * Inicia el servidor web
 */
void iniciarServer() {
  Serial.println("Iniciando servidor web...");

  iniciarRutas();

  server.begin();
  Serial.println("Servidor web iniciado correctamente.");
}
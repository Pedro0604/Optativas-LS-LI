#include <WiFiManager.h>

#include "config.hpp"
#include "conectar_wifi.hpp"

extern char const *const wifiManagerAPSSID;

static bool precisaReinicio = false;

/**
* Callback que se llama cuando se guarda una configuración de WiFiManager
*/
void alGuardarConfig() {
  Serial.println("Nuevas credenciales guardadas. Se programó un reinicio.");
  precisaReinicio = true;
}

/**
 * Conecta el ESP-32 a la red WiFi usando la librería WiFiManager.
 * Si hay una red guardada, se conecta automáticamente.
 * Si no, crea un punto de acceso con el SSID definido en wifiManagerAPSSID para que el usuario pueda conectarse y configurar la red WiFi a la que se debe conectar el ESP32.
 */
void conectarWiFi() {
  WiFiManager wifiManager;

  wifiManager.setSaveConfigCallback(alGuardarConfig);  // Se hace el reseteo si se guardó una nueva config porque sino no me estaba funcionando la primera vez q se seteaban las nuevas credenciales, pero al reiniciar la ESP32 sí me funcionaba

  Serial.println("Iniciando conexión WiFi...");
  Serial.printf("Si no hay una red guardada, hay que conectarse al WiFi '%s' y navegar a http://192.168.4.1 desde un dispositivo para configurar la red a la que debe conectarse el ESP32.\n", wifiManagerAPSSID);
  if (!wifiManager.autoConnect(wifiManagerAPSSID)) {
    Serial.println("Fallo la conexión de WiFiManager reiniciando la placa...");
    ESP.restart();
  }
  // Si se llega acá, ya se conectó al WiFi seteado usando el portal de WiFiManager

  if (precisaReinicio) {
    Serial.println("Reiniciando el ESP32 para poder levantar correctamente el AsyncWebServer...");
    ESP.restart();
  }
  WiFi.mode(WIFI_STA);

  Serial.printf("Conectado exitosamente a: %s\n", WiFi.SSID().c_str());
  Serial.printf("Dirección IP asignada: %s\n", WiFi.localIP().toString().c_str());
}
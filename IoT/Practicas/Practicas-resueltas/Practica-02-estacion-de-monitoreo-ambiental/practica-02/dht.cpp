#include <DHT.h>

#include "config.hpp"
#include "dht.hpp"

extern const int dhtPin;

DHT dht(dhtPin, DHT11);

/**
 * Inicializa el sensor DHT11
 */
void iniciarDHT() {
  Serial.println("Iniciado DHT...");
  dht.begin();
  Serial.println("DHT iniciado correctamente.");
}
#include "config.hpp"
#include "dht.hpp"
#include "fs.hpp"
#include "conectar_wifi.hpp"
#include "servidor.hpp"

extern const int ledPin;

void setup() {
  Serial.begin(115200);

  conectarWiFi();

  pinMode(ledPin, OUTPUT);

  iniciarDHT();
  iniciarFS();

  iniciarServer();
}

void loop() {
}

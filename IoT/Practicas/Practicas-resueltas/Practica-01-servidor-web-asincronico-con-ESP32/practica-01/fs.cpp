#include <LittleFS.h>

#include "fs.hpp";

/**
 * Inicia LittleFS
 */
void iniciarFS() {
  if (!LittleFS.begin()) {
    Serial.println("Ocurrió un error al cargar LittleFS.");
    return;
  }
  Serial.println("LittleFS iniciado correctamente.");
}
#include <Arduino.h>

#include "mq135.hpp"

const float approaching_rate = 0.05;
const float lowest_value = 400.0;
const float highest_value = 2000.0;

float current_ppm = lowest_value + (highest_value - lowest_value) / 2.0;
float target_ppm = lowest_value + (highest_value - lowest_value) / 2.0;
unsigned long last_shift = 0;

/**
 * Inicializa el sensor MQ135
 */
void iniciarMQ135() {
  Serial.println("Iniciado MQ135...");
  // Lógica de inicialización del sensor MQ135 que no existe jeje, pero se pone el mensaje de iniciado correctamente para simular que se hizo la inicialización
  Serial.println("MQ135 iniciado correctamente.");
}

/**
 * Simula la lectura de calidad de aire
 */
float leerCalidadDeAire()
{
  unsigned long now = millis();

  if (now - last_shift > 15000 || last_shift == 0)
  {
    // Si pasaron 15 segundos del último cambio o es la primera lectura, se elige un nuevo valor objetivo en un rango cercano al valor actual
    float jump = random(-250, 250);
    target_ppm = current_ppm + jump;
    target_ppm = constrain(target_ppm, lowest_value, highest_value);
    last_shift = now;
  }

  current_ppm = current_ppm + approaching_rate * (target_ppm - current_ppm); // Se acerca lentamente al valor objetivo

  float noise = (random(0, 100) - 50) / 10.0;
  float reading = current_ppm + noise;

  return reading;
}
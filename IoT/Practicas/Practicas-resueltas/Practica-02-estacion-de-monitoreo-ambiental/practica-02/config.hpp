#pragma once

const int dhtPin = 26;
const int ldrPin = 33;

const int readInterval = 1000;

char const *const wifiManagerAPSSID = "ESP32-AP-TP-PedroS";

char const *const mqttClientName = "ESP32-Estacion-Monitoreo-Ambiental";
char const *const mqttServer = "192.168.0.217";
const int mqttPort = 1883;
/*
Ejemplo catedra IoT basado en Sparkfun
*/

#include <WiFi.h>
#include <DHT.h> // <-- Agregamos la librería DHT

#define DHTPIN 25       // Pin donde está conectado el DHT11
#define DHTTYPE DHT22   // Tipo de sensor

DHT dht(DHTPIN, DHTTYPE); // Creamos el objeto del sensor

const char* ssid = "xxxxxx";
const char* password = "xxxxx";
const int LED_PIN = 2;
const int PIN_OUTPUT = 26;
WiFiServer server(80);

void setup()
{
    Serial.begin(115200);
    pinMode(LED_PIN, OUTPUT);
    pinMode(PIN_OUTPUT, OUTPUT); 
    delay(10);

    dht.begin(); // <-- Inicializamos el sensor

    Serial.println();
    Serial.print("Connecting to ");
    Serial.println(ssid);

    WiFi.begin(ssid, password);

    while (WiFi.status() != WL_CONNECTED) {
        delay(500);
        Serial.print(".");
    }

    Serial.println("");
    Serial.println("WiFi connected.");
    Serial.println("IP address: ");
    Serial.println(WiFi.localIP());
    
    server.begin();
}

int value = 0;

void loop(){
 WiFiClient client = server.available();

  if (client) {
    Serial.println("Nuevo cliente.");
    String currentLine = "";
    while (client.connected()) {
        if (client.available()) {
            char c = client.read();
            Serial.write(c);
            if (c == '\n') {
            if (currentLine.length() == 0) {
                    // Leemos el sensor DHT11
                    float h = dht.readHumidity();
                    float t = dht.readTemperature();

                    client.println("HTTP/1.1 200 OK");
                    client.println("Content-type:text/html");
                    client.println();

                    client.print("Haz clic <a href=\"/H\">aqui</a> para ENCENDER el LED <br>");
                    client.print("Haz clic <a href=\"/L\">aqui</a> para APAGAR el LED <br><br>");

                    // Mostramos valores del sensor
                    if (isnan(h) || isnan(t)) {
                        client.println("Error al leer el sensor DHT11<br>");
                        Serial.println("Error al leer el sensor DHT11<br>");

                    } else {
                        client.print("Temperatura: ");
                        client.print(t);
                        client.println(" &deg;C<br>");
                        client.print("Humedad: ");
                        client.print(h);
                        client.println(" %<br>");
                    }

                    client.println();
                    break;
                } else {
                    currentLine = "";
                }
               } else if (c != '\r') {
                currentLine += c;
            }

            if (currentLine.endsWith("GET /H")) {
                digitalWrite(LED_PIN, HIGH);  
                digitalWrite(PIN_OUTPUT, HIGH);
            }
            if (currentLine.endsWith("GET /L")) {
                digitalWrite(LED_PIN, LOW);  
                digitalWrite(PIN_OUTPUT, LOW);
            }
          }
        }
    client.stop();
    Serial.println("Client Disconnected.");
  }
}

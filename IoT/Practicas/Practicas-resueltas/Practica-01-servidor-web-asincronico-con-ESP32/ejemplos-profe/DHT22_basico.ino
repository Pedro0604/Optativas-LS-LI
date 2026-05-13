#include "DHT.h"
#define DHTPIN 4
#define DHTTYPE DHT22

DHT dht(DHTPIN, DHTTYPE);

unsigned long currentTime = 0;
unsigned long lastTime = 0;
unsigned long intervalo = 5000; // milisegundos
float h,t=0;

void setup() {
Serial.begin(9600);
Serial.println(F("DHTxx test!"));
dht.begin();
 //millis() devuelve el número de milisegundos que han transcurrido desde que se inició el programa
} 

void loop() {


currentTime = millis(); 
if (currentTime - lastTime >= intervalo) {  //usamos millis() en lugar de delay(intervalo), para no hacerlo bloqueante
    lastTime = currentTime; 
    h = dht.readHumidity();
    t = dht.readTemperature();
    
    if (isnan(h) || isnan(t)) {
    Serial.println(F("Failed to read from DHT sensor!"));
    }

    Serial.print(F("Humedad: "));
    Serial.print(h);
    Serial.print(F("% Temperatura: "));
    Serial.print(t);
    Serial.println(F("°C "));

    //SI QUEREMOS GENERAR VALORES RANDOM PARA ALGUN TIPO DE SENSOR //
    /*
    float temperatura2 = random(20, 30);
    float humedad2 = random(70, 99);
    // Imprimir los valores en el monitor serial
    Serial.print("Temperatura simulada: ");
    Serial.print(temperatura2);
    Serial.print(" °C | Humedad simulada: ");
    Serial.print(humedad2);
    Serial.println(" %");
    */

    }

}

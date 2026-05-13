#define LDR_PIN 34
#define LED_PIN 2

#define UMBRAL_OSCURO 2300
#define UMBRAL_CLARO  2000

bool esOscuro = false;

void setup() {
  Serial.begin(115200);
  pinMode(LED_PIN, OUTPUT);
}

void loop() {
  int adc = analogRead(LDR_PIN);

  // Histéresis
  if (!esOscuro && adc > UMBRAL_OSCURO) {
    esOscuro = true;
  } 
  else if (esOscuro && adc < UMBRAL_CLARO) {
    esOscuro = false;
  }

  digitalWrite(LED_PIN, esOscuro ? HIGH : LOW);

  Serial.print("ADC: ");
  Serial.print(adc);
  Serial.print(" | Estado: ");
  Serial.println(esOscuro ? "OSCURO" : "CLARO");

  delay(200);
}
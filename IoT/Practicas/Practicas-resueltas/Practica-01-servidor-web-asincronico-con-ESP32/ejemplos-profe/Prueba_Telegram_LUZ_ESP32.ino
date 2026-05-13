#ifdef ESP32
#include <WiFi.h>
#else
#include <ESP8266WiFi.h>
#endif
#include <WiFiClientSecure.h>
#include <UniversalTelegramBot.h>   // https://github.com/witnessmenow/Universal-Arduino-Telegram-Bot
#include <ArduinoJson.h>

#define PIN_INPUT 32
#define PIN_OUTPUT 26
#define PIN_LED 2


unsigned long lastNotificationTime = 0; // ultima notificacion
const unsigned long notificationInterval = 5000; // Tiempo de intervalo entre notificaciones
int inputState,lastState = 0; 

const char* ssid = ""; //cargar con credenciales del wifi propio
const char* password = ""; //cargar con credenciales del wifi propio

// Claves Bot telegram
#define BOTtoken "xxxxxxxx:yyyyyyy"  // Token obtenido de botfather
#define CHAT_ID "xxxxxxx" //grupo (se toma de la URL), si fuera individuo se le pide al IDBot con /getid 


WiFiClientSecure client;
UniversalTelegramBot bot(BOTtoken, client);

// Checks for new messages every 1 second.
int botRequestDelay = 1000;
unsigned long lastTimeBotRan;

//Variables de estado




// Funcion para manejar los msg entrantes

void handleNewMessages(int numNewMessages) {
  
  Serial.println("handleNewMessages");
  Serial.println(String(numNewMessages));

  for (int i=0; i<numNewMessages; i++) {
    // Chat id of the requester
    String chat_id = String(bot.messages[i].chat_id);

    if (chat_id != CHAT_ID){
      bot.sendMessage(chat_id, "Unauthorized user", "");
      continue;
    }
    // Print the received message
    String text = bot.messages[i].text;
    Serial.println(text);
    String from_name = bot.messages[i].from_name;
    
    if (text == "/start") {
      String welcome = "Hola, " + from_name + ".\n";
      welcome += "Usar los siguientes comandos para controlar.\n\n";
      welcome += "/on para encender GPIO \n";
      welcome += "/off para apagar GPIO \n";
      welcome += "/estado para ver estado actualdel GPIO \n";
      bot.sendMessage(chat_id, welcome, "");
    }
    if (text == "/on") {
      inputState=1;
      digitalWrite(PIN_OUTPUT, HIGH);
      digitalWrite(PIN_LED, HIGH);
    }
    if (text == "/off") {
      inputState=0;
      digitalWrite(PIN_OUTPUT, LOW);
      digitalWrite(PIN_LED, LOW);
    }
    if (text == "/estado") {
      if (inputState){
        bot.sendMessage(chat_id, "Luz encendida", "");
      }
      else{
        bot.sendMessage(chat_id, "Luz apagada", "");
      }
    }
  }

}





void setup() {
  Serial.begin(115200);
  
  
  // Connect to Wi-Fi
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);
  client.setCACert(TELEGRAM_CERTIFICATE_ROOT); // Add root certificate for api.telegram.org
  WiFi.setSleep(false);
  while (WiFi.status() != WL_CONNECTED) {
    delay(1000);
    Serial.println("Connecting to WiFi..");
  }
  // Print ESP32 Local IP Address
  Serial.println(WiFi.localIP());

  // Set pin modes
 // pinMode(PIN_INPUT, INPUT_PULLDOWN);
  pinMode(PIN_OUTPUT, OUTPUT);
  pinMode(PIN_LED, OUTPUT);
  
 
  
}


void loop() {
  
 // inputState = digitalRead(PIN_INPUT);
  Serial.println(inputState);
  
  if (millis() > lastTimeBotRan + botRequestDelay)  {
    int numNewMessages = bot.getUpdates(bot.last_message_received + 1);
    while(numNewMessages) {
      Serial.println("got response");
      handleNewMessages(numNewMessages);
      numNewMessages = bot.getUpdates(bot.last_message_received + 1);
    }
    lastTimeBotRan = millis();
  }

  if (inputState != lastState && (millis() - lastNotificationTime) > notificationInterval) {

    if (inputState){
      bot.sendMessage(CHAT_ID, "Luz encendida", "");
     }
     else bot.sendMessage(CHAT_ID, "Luz apagada", "");
    
    Serial.println("Msg enviado!!!!");
    lastState = inputState;
    lastNotificationTime = millis(); // Update last notification time
  }
  delay(100);
} //fin loop

# Trabajo práctico: Estación de Monitoreo Ambiental IoT

Pedro Spadari \- 21586/8

## Capturas de pantalla del dashboard de Grafana

![Captura de pantalla de Grafana](grafana.png "Captura de pantalla de Grafana")

## Diagrama de flujo en Node-RED

![Captura de pantalla de Node-RED](nodered.png "Captura de pantalla de Node-RED")

## Comandos de inicialización

Únicamente con el siguiente comando se levantan todos los contenedores, los cuales ya están configurados:

```bash
    docker compose up -d
```

Luego se puede ir al dashboard de Grafana accediendo a [http://localhost:3000](http://localhost:3000) donde se puede iniciar sesión con el usuario y contraseña definidos en el archivo .env provisto, cuyo valor por defecto es ‘admin’ para el usuario y ‘admin1234’ como contraseña.

## Sensores

Los sensores utilizados son:

* DHT11 para temperatura y humedad.  
* LDR para luz: los valores del LDR se muestran en las unidades leídas directamente del sensor por el ADC, es decir, en el rango de 0..4095 (12 bits).  
* Simulación de valores del MQ135 para calidad de aire.

## WiFiManager

El SSID del AP levantado por la librería WiFiManager está definido en practica-02/config.hpp, en la constante wifiManagerAPSSID que por default es ESP32-AP-TP-PedroS.

La IP del AP levantado por la librería WiFiManager por default es la 192.168.4.1, por lo que esa es la dirección que se debe ingresar en el navegador, luego de conectarse al AP, para configurar el WiFi.

## Conclusiones y mejoras

El desarrollo de este trabajo permitió integrar un proyecto completo de IoT desde la recolección de los datos, pasando por el transporte, almacenamiento y visualización de los mismos.

En el mismo, cada componente realiza una tarea:

* ESP32: lee los sensores y envía los datos al broker MQTT.  
* Mosquitto: recibe publicaciones de datos del ESP32 y suscripciones de Node-RED.  
* Node-RED: se suscribe al broker MQTT y envía los datos a InfluxDB.  
* InfluxDB: guarda los datos en una TSDB.  
* Grafana: lee los datos de InfluxDB y los muestra en 1 dashboard unificado.

Por su parte, la orquestación con docker compose permite la portabilidad y reproducibilidad del entorno.

Posibles puntos de mejora:

* Sensor MQ135: reemplazar las simulaciones del sensor MQ135 por la lectura de un sensor.  
* Sistema de alertas: incorporar al flujo de Node-RED alertas si los valores de calidad del aire superan un límite determinado.
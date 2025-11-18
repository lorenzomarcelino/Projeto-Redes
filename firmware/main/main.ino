#include <ESP8266WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

// --- NETWORK CONFIGURATION ---
const char* ssid = "NOME_DA_SUA_REDE"; 
const char* password = "SENHA_DA_REDE";

// --- MQTT CONFIGURATION ---
const char* mqtt_server = "192.168.0.11"; // TARGET IP (RASPBERRY PI)
const int mqtt_port = 1883;
const char* topic_sensor = "projeto_assobio/sensor/dados";

WiFiClient espClient;
PubSubClient client(espClient);

void setup_wifi() {
  delay(10);
  Serial.println();
  Serial.print("[.] Connecting to ");
  Serial.println(ssid);

  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("");
  Serial.print("[.] WiFi connected. IP Address: ");
  Serial.println(WiFi.localIP());
}

void reconnect() {
  while (!client.connected()) {
    Serial.print("[.] Attempting MQTT connection...");
    
    // Client ID must be unique
    String clientId = "D1MiniClient-";
    clientId += String(random(0xffff), HEX);

    if (client.connect(clientId.c_str())) {
      Serial.println("Connected.");
    } else {
      Serial.print("[X] Failed, rc=");
      Serial.print(client.state());
      Serial.println(" try again in 5 seconds");
      delay(5000);
    }
  }
}

void setup() {
  Serial.begin(115200);
  setup_wifi();
  client.setServer(mqtt_server, mqtt_port);
}

void loop() {
  if (!client.connected()) {
    reconnect();
  }
  client.loop();

  // --- SENSOR DATA SIMULATION ---
  // Replace these lines with actual DHT/Sensor readings
  float temp = random(200, 350) / 10.0; 
  float hum = random(400, 800) / 10.0;
  
  // --- JSON SERIALIZATION ---
  StaticJsonDocument<200> doc;
  doc["temperatura"] = temp;
  doc["umidade"] = hum;
  
  char buffer[256];
  serializeJson(doc, buffer);

  // --- PUBLISH ---
  if (client.publish(topic_sensor, buffer)) {
    Serial.print("[.] Payload sent: ");
    Serial.println(buffer);
  } else {
    Serial.println("[X] Error publishing message.");
  }

  delay(2000); 
}
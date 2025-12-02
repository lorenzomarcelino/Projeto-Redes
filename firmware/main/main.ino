#include <ESP8266WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <NTPClient.h>    // Para o timestamp (sent_at)
#include <WiFiUdp.h>      // Necessário para o NTP
#include <DHT.h>          // Para a leitura do sensor
#include <Adafruit_Sensor.h> // Necessário para a DHT.h

// --- CONFIGURAÇÕES DE REDE E BROKER ---
const char* ssid = "projeto_redes";
const char* password = "redesgrupo2";
const char* mqtt_server = "10.70.202.34"; // IP ATUAL DO RASPBERRY PI
const int mqtt_port = 1883;

// --- CONFIGURAÇÕES MQTT TÓPICOS ---
const char* topic_sensor = "projeto_redes/sensor/dados";
const char* topic_status = "projeto_redes/sensor/status"; // Tópico para LWT

// --- CONFIGURAÇÕES SENSOR ---
#define DHTPIN 4      // Pino de Dados (D2/GPIO4, ou o que estiver usando)
#define DHTTYPE DHT11 // Tipo de sensor (DHT11)
DHT dht(DHTPIN, DHTTYPE);

// --- INSTANCIANDO OBJETOS ---
WiFiClient espClient;
PubSubClient client(espClient);

WiFiUDP ntpUDP;
// Time Offset: -3 (Brasil - Brasília)
NTPClient timeClient(ntpUDP, "pool.ntp.org", -3 * 3600, 60000); 

// --- FUNÇÕES DE CONEXÃO E RECONEXÃO (Mantidas as suas) ---

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
    
    String clientId = "D1MiniClient-";
    clientId += String(random(0xffff), HEX);

    // Conexão com LWT: Envia "offline" se a conexão cair (QoS 1, Retain True)
    if (client.connect(clientId.c_str(), NULL, NULL, topic_status, 1, true, "offline")) {
      Serial.println("Connected.");
      client.publish(topic_status, "online", true); // Avisa que está online
    } else {
      Serial.print("[X] Failed, rc=");
      Serial.print(client.state());
      Serial.println(" try again in 5 seconds");
      delay(5000);
    }
  }
}

// --- FUNÇÃO PRINCIPAL DE LEITURA, SERIALIZAÇÃO E ENVIO ---

void publish_sensor_data() {
  // 1. LEITURA REAL DO SENSOR
  float hum = dht.readHumidity();
  float temp = dht.readTemperature(); 

  // LOGICA PARA PULAR LEITURAS INVÁLIDAS (nan)
  if (isnan(hum) || isnan(temp)) {
    Serial.println("[WARN] Falha na leitura do sensor DHT, pulando publicação.");
    return; 
  }
  
  // 2. OBTENÇÃO DO TIMESTAMP (para Latência RTT no Frontend)
  timeClient.update();
  long long sent_at = timeClient.getEpochTime() * 1000LL; 
  
  // 3. JSON SERIALIZATION
  StaticJsonDocument<256> doc; // Aumentado para 256 para incluir o timestamp
  doc["temperatura"] = temp;
  doc["umidade"] = hum;
  doc["timestamp"] = timeClient.getFormattedTime(); 
  doc["sent_at"] = sent_at; // Campo crucial para Latência no Frontend
  
  char buffer[256];
  serializeJson(doc, buffer);

  // 4. PUBLISH
  if (client.publish(topic_sensor, buffer)) {
    Serial.print("[.] Payload sent: ");
    Serial.println(buffer);
  } else {
    Serial.println("[X] Error publishing message.");
  }
}


void setup() {
  Serial.begin(115200);
  setup_wifi();
  
  // Inicialização dos serviços
  client.setServer(mqtt_server, mqtt_port);
  timeClient.begin(); 
  dht.begin();
}

void loop() {
  if (!client.connected()) {
    reconnect();
  }
  client.loop();

  publish_sensor_data();
  
  // O DHT11 requer um atraso de pelo menos 2 segundos entre as leituras.
  delay(2000); 
}
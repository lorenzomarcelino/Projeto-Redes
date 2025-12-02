import paho.mqtt.client as mqtt
import json
import requests
import os
import time
from datetime import datetime

# --- SYSTEM CONFIGURATION ---
BROKER_ADDRESS = "localhost"
PORT = 1883

TOPIC_SENSOR = "projeto_redes/sensor/dados"
TOPIC_CONFIG = "projeto_redes/config/alertas"
TOPIC_STATUS = "projeto_redes/sensor/status"

HISTORY_FILE = "sensor_history.json"
CONFIG_FILE = "gateway_config.json"

# TELEGRAM CONFIGURATION
TELEGRAM_TOKEN = "8516758927:AAHw39fsuAqCjcSR6lW21u1aF3Zurt4_eGw"

# RUNTIME STATE
alert_config = {
    "chatId": "", 
    "tempMax": 30, 
    "humMin": 40, 
    "isActive": True
}
last_alert_time = 0
ALERT_COOLDOWN = 10 

def load_config():
    global alert_config
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, 'r') as f:
                file_config = json.load(f)
                alert_config.update(file_config)
            print(f"[INFO] Configuração carregada do disco: {alert_config}")
        except Exception as e:
            print(f"[ERROR] Erro ao carregar configuração: {e}")
    else:
        print("[INFO] Nenhuma configuração encontrada. Usando padrões.")

def save_config():
    try:
        with open(CONFIG_FILE, 'w') as f:
            json.dump(alert_config, f, indent=4)
        print("[INFO] Configuração salva no disco.")
    except Exception as e:
        print(f"[ERROR] Erro ao salvar configuração: {e}")

def append_history_log(data):
    history = []
    if os.path.exists(HISTORY_FILE):
        try:
            with open(HISTORY_FILE, 'r') as f:
                history = json.load(f)
        except: pass
    
    history.append(data)
    
    # Rotação de log (mantém últimos 2000 registros)
    if len(history) > 2000: 
        history = history[-2000:]
        
    try:
        with open(HISTORY_FILE, 'w') as f:
            json.dump(history, f)
    except Exception as e:
        print(f"[ERROR] Erro ao escrever log histórico: {e}")

def send_telegram_notification(message):
    if not alert_config['chatId']: 
        print("[WARN] Alerta acionado mas Chat ID ausente.")
        return
    
    url = f"https://api.telegram.org/bot{TELEGRAM_TOKEN}/sendMessage"
    data = {
        "chat_id": alert_config['chatId'], 
        "text": f"[ALERTA DO SISTEMA]\n\n{message}"
    }
    try: 
        response = requests.post(url, data=data)
        if response.status_code != 200:
            print(f"[ERROR] Erro API Telegram: {response.text}")
    except Exception as e: 
        print(f"[ERROR] Erro de Conexão (Telegram): {e}")

def process_sensor_payload(payload):
    global last_alert_time
    
    try:
        temp = float(payload.get("temperatura", 0))
        hum = float(payload.get("umidade", 0))
    except ValueError: 
        print("[ERROR] Recebido pacote de dados malformado.")
        return 

    append_history_log(payload)
    print(f"[INFO] Dados recebidos: Temp={temp}C | Hum={hum}%")

    current_time = time.time()
    if alert_config['isActive'] and (current_time - last_alert_time > ALERT_COOLDOWN):
        alert_msg = ""
        if temp > float(alert_config['tempMax']):
            alert_msg += f"Alta Temperatura detectada: {temp}C (Limite: {alert_config['tempMax']}C)\n"
        if hum < float(alert_config['humMin']):
            alert_msg += f"Baixa Umidade detectada: {hum}% (Limite: {alert_config['humMin']}%)\n"
        
        if alert_msg:
            print(f"[WARN] Limite de alerta atingido. Enviando notificação...")
            send_telegram_notification(alert_msg)
            last_alert_time = current_time

def on_connect(client, userdata, flags, rc):
    if rc == 0:
        print(f"[INFO] Conectado ao Broker MQTT Local (Porta {PORT}).")
        # Assina tópicos de sensor, config e status (LWT)
        client.subscribe([(TOPIC_SENSOR, 0), (TOPIC_CONFIG, 1), (TOPIC_STATUS, 1)])
    else:
        print(f"[ERROR] Falha na conexão. Código de retorno: {rc}")

def on_message(client, userdata, msg):
    try:
        payload_str = msg.payload.decode()

        # Lógica para status do sensor (LWT)
        if msg.topic == TOPIC_STATUS:
            if payload_str == "offline":
                print("[CRÍTICO] SENSOR DESCONECTADO!")
                send_telegram_notification("⚠️ ATENÇÃO: Conexão com o sensor perdida (Falha de Energia/Rede).")
            elif payload_str == "online":
                print("[INFO] Sensor online.")
                send_telegram_notification("✅ Sensor reconectado.")
            return

        payload = json.loads(payload_str)

        if msg.topic == TOPIC_SENSOR:
            process_sensor_payload(payload)
            
        elif msg.topic == TOPIC_CONFIG:
            global alert_config
            print(f"[INFO] Atualização de configuração remota recebida.")
            alert_config.update(payload)
            save_config()
            if alert_config['chatId']:
                send_telegram_notification("Configuração do sistema atualizada com sucesso.")

    except json.JSONDecodeError:
        print("[ERROR] Falha ao decodificar payload JSON.")
    except Exception as e:
        print(f"[ERROR] Erro crítico no processamento da mensagem: {e}")

if __name__ == "__main__":
    print("[INFO] Iniciando Serviço Gateway IoT...")
    load_config()

    # Configura cliente MQTT
    # Nota: CallbackAPIVersion.VERSION1 é usado para compatibilidade com paho-mqtt 2.0+
    client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION1, "RaspberryPi_Gateway")
    client.on_connect = on_connect
    client.on_message = on_message

    try:
        client.connect(BROKER_ADDRESS, PORT, 60)
        client.loop_forever()
    except ConnectionRefusedError:
        print("[ERROR] Não foi possível conectar ao Mosquitto. O serviço está rodando?")
    except KeyboardInterrupt:
        print("\n[INFO] Serviço parando...")
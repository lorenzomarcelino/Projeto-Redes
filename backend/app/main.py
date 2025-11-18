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
            print(f"[.] Configuration loaded from disk: {alert_config}")
        except Exception as e:
            print(f"[X] Error loading configuration: {e}")
    else:
        print("[.] No configuration file found. Using defaults.")

def save_config():
    try:
        with open(CONFIG_FILE, 'w') as f:
            json.dump(alert_config, f, indent=4)
        print("[.] Configuration saved to disk.")
    except Exception as e:
        print(f"[X] Error saving configuration: {e}")

def append_history_log(data):
    history = []
    if os.path.exists(HISTORY_FILE):
        try:
            with open(HISTORY_FILE, 'r') as f:
                history = json.load(f)
        except: pass
    
    history.append(data)
    
    # Log rotation (keep last 2000 records)
    if len(history) > 2000: 
        history = history[-2000:]
        
    try:
        with open(HISTORY_FILE, 'w') as f:
            json.dump(history, f)
    except Exception as e:
        print(f"[X] Error writing history log: {e}")

def send_telegram_notification(message):
    if not alert_config['chatId']: 
        print("[!] Alert triggered but Chat ID is missing.")
        return
    
    url = f"https://api.telegram.org/bot{TELEGRAM_TOKEN}/sendMessage"
    data = {
        "chat_id": alert_config['chatId'], 
        "text": f"[SYSTEM ALERT]\n\n{message}"
    }
    try: 
        response = requests.post(url, data=data)
        if response.status_code != 200:
            print(f"[X] Telegram API Error: {response.text}")
    except Exception as e: 
        print(f"[X] Connection Error (Telegram): {e}")

def process_sensor_payload(payload):
    global last_alert_time
    
    try:
        temp = float(payload.get("temperatura", 0))
        hum = float(payload.get("umidade", 0))
    except ValueError: 
        print("[X] Received malformed data packet.")
        return 

    append_history_log(payload)
    print(f"[.] Data received: Temp={temp}C | Hum={hum}%")

    current_time = time.time()
    if alert_config['isActive'] and (current_time - last_alert_time > ALERT_COOLDOWN):
        alert_msg = ""
        if temp > float(alert_config['tempMax']):
            alert_msg += f"High Temperature detected: {temp}C (Limit: {alert_config['tempMax']}C)\n"
        if hum < float(alert_config['humMin']):
            alert_msg += f"Low Humidity detected: {hum}% (Limit: {alert_config['humMin']}%)\n"
        
        if alert_msg:
            print(f"[!] Alert threshold reached. Sending notification...")
            send_telegram_notification(alert_msg)
            last_alert_time = current_time

def on_connect(client, userdata, flags, rc):
    if rc == 0:
        print(f"[.] Connected to Local MQTT Broker (Port {PORT}).")
        client.subscribe([(TOPIC_SENSOR, 0), (TOPIC_CONFIG, 1)])
    else:
        print(f"[X] Connection failed. Return code: {rc}")

def on_message(client, userdata, msg):
    try:
        payload_str = msg.payload.decode()
        payload = json.loads(payload_str)

        if msg.topic == TOPIC_SENSOR:
            process_sensor_payload(payload)
            
        elif msg.topic == TOPIC_CONFIG:
            global alert_config
            print(f"[.] Remote configuration update received.")
            alert_config.update(payload)
            save_config()
            if alert_config['chatId']:
                send_telegram_notification("System configuration updated successfully.")

    except json.JSONDecodeError:
        print("[X] Failed to decode JSON payload.")
    except Exception as e:
        print(f"[X] Critical error in message processing: {e}")

if __name__ == "__main__":
    print("[.] Starting IoT Gateway Service...")
    load_config()

    client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION1, "RaspberryPi_Gateway")
    client.on_connect = on_connect
    client.on_message = on_message

    try:
        client.connect(BROKER_ADDRESS, PORT, 60)
        client.loop_forever()
    except ConnectionRefusedError:
        print("[X] Could not connect to Mosquitto. Is the service running?")
    except KeyboardInterrupt:
        print("\n[.] Service stopping...")
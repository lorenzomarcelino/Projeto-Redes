import paho.mqtt.client as mqtt
import time
import random
import json
import requests
import os
from datetime import datetime

# --- CONFIGURAÇÕES ---
BROKER = "broker.emqx.io"
PORT = 1883
TOPIC_DADOS = "projeto_redes/sensor/dados"
TOPIC_CONFIG = "projeto_redes/config/alertas"

# Arquivos para salvar dados no disco (Persistência)
CONFIG_FILE = "gateway_config.json" 
HISTORY_FILE = "sensor_history.json" # <--- NOVO: Arquivo de histórico

# TOKEN DO TELEGRAM (Seu token real)
TELEGRAM_TOKEN = "8516758927:AAHw39fsuAqCjcSR6lW21u1aF3Zurt4_eGw"

# Configuração inicial padrão
default_config = {
    "chatId": "", 
    "tempMax": 30,
    "humMin": 40,
    "isActive": True
}

alert_config = default_config.copy()
last_alert_time = 0
ALERT_COOLDOWN = 60 

# --- FUNÇÕES AUXILIARES DE ARQUIVO ---

def load_config():
    """Lê a configuração de alertas salva no disco"""
    global alert_config
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, 'r') as f:
                saved = json.load(f)
                alert_config.update(saved)
            print(f"💾 Configuração carregada: {alert_config}")
        except Exception as e:
            print(f"Erro config load: {e}")

def save_config():
    """Salva a configuração de alertas no disco"""
    try:
        with open(CONFIG_FILE, 'w') as f:
            json.dump(alert_config, f, indent=4)
        print("💾 Configuração atualizada no disco.")
    except Exception as e:
        print(f"Erro config save: {e}")

def append_history_log(data):
    """
    NOVA FUNÇÃO: Salva a leitura do sensor em um arquivo JSON.
    Isso cria um log permanente no Raspberry Pi.
    """
    history = []
    # 1. Tenta ler o arquivo existente
    if os.path.exists(HISTORY_FILE):
        try:
            with open(HISTORY_FILE, 'r') as f:
                history = json.load(f)
        except:
            history = [] # Se der erro, começa lista nova

    # 2. Adiciona o novo dado
    history.append(data)

    # 3. Limpeza automática (Mantém apenas os últimos 1000 registros)
    if len(history) > 1000:
        history = history[-1000:]

    # 4. Salva de volta no arquivo
    try:
        with open(HISTORY_FILE, 'w') as f:
            json.dump(history, f, indent=None) # Sem indent para economizar espaço
    except Exception as e:
        print(f"Erro ao salvar histórico log: {e}")

# --- LÓGICA DE COMUNICAÇÃO ---

def send_telegram_msg(message):
    if not alert_config['chatId']: return
    url = f"https://api.telegram.org/bot{TELEGRAM_TOKEN}/sendMessage"
    data = {"chat_id": alert_config['chatId'], "text": f"🚨 ALERTA PROJETO REDES 🚨\n\n{message}"}
    try: requests.post(url, data=data)
    except: pass

def on_message(client, userdata, msg):
    global alert_config
    if msg.topic == TOPIC_CONFIG:
        try:
            payload = json.loads(msg.payload.decode())
            print(f"\n📥 Config recebida do Site.")
            alert_config.update(payload)
            save_config() # Salva Configuração
            if alert_config['chatId']:
                send_telegram_msg("✅ Configurações salvas no Gateway!")
        except Exception as e:
            print(e)

def on_connect(client, userdata, flags, rc):
    print(f"Gateway Conectado! (Code: {rc})")
    client.subscribe(TOPIC_CONFIG)

# --- INICIALIZAÇÃO ---
load_config() # Restaura configs antigas

client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION1, "Gateway_Full_Python")
client.on_connect = on_connect
client.on_message = on_message
client.connect(BROKER, PORT, 60)
client.loop_start()

print("📡 Sistema rodando: Monitoramento + Telegram + Logs Locais")

# --- LOOP PRINCIPAL ---
try:
    while True:
        # 1. Gera Dados
        temperatura = round(random.uniform(25.0, 35.0), 2)
        umidade = round(random.uniform(30.0, 60.0), 1)
        ts_unix = time.time() * 1000
        timestamp_str = datetime.now().strftime("%H:%M:%S")

        # 2. Lógica de Alertas
        curr_time = time.time()
        if alert_config['isActive'] and (curr_time - last_alert_time > ALERT_COOLDOWN):
            msg = ""
            if temperatura > float(alert_config['tempMax']):
                msg += f"🔥 Temp Alta: {temperatura}°C (> {alert_config['tempMax']})\n"
            if umidade < float(alert_config['humMin']):
                msg += f"💧 Umidade Baixa: {umidade}% (< {alert_config['humMin']})\n"
            
            if msg:
                print("⚡ ALERTA ENVIADO")
                send_telegram_msg(msg)
                last_alert_time = curr_time

        # 3. Prepara Pacote
        payload_dict = {
            "temperatura": temperatura,
            "umidade": umidade,
            "timestamp": timestamp_str,
            "sent_at": ts_unix
        }

        # 4. PERSISTÊNCIA DE DADOS (Aqui acontece a mágica)
        # Salva no arquivo local ANTES de enviar para a nuvem
        append_history_log(payload_dict)

        # 5. Envia MQTT
        client.publish(TOPIC_DADOS, json.dumps(payload_dict))
        
        time.sleep(2)

except KeyboardInterrupt:
    client.loop_stop()
    client.disconnect()
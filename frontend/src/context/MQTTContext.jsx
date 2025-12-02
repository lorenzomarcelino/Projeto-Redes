import { createContext, useContext, useEffect, useState } from 'react';
import mqtt from 'mqtt';

// Endereço local do Broker (Seu Raspberry Pi)
const BROKER_IP = '10.70.202.34'; 
const BROKER_URL = `ws://${BROKER_IP}:9001`; 
const TOPIC = 'projeto_redes/sensor/dados';
// Tópico de Status LWT
const TOPIC_STATUS = 'projeto_redes/sensor/status'; 

const MQTTContext = createContext(); 

export const MQTTProvider = ({ children }) => {
    const [client, setClient] = useState(null);
    const [status, setStatus] = useState('Desconectado 🔴');
    const [isSensorOnline, setIsSensorOnline] = useState(false); // NOVO ESTADO
    const [currentData, setCurrentData] = useState({ temperatura: 0, umidade: 0, timestamp: '--:--' });
    
    // Métricas de Rede
    const [networkStats, setNetworkStats] = useState({
        packetsReceived: 0,
        totalBytes: 0,
        latency: 0, 
        lastPacketSize: 0,
        connectionTime: null
    });

    const [history, setHistory] = useState(() => {
        const saved = localStorage.getItem('iot_global_history');
        return saved ? JSON.parse(saved) : [];
    });

    useEffect(() => {
        const mqttClient = mqtt.connect(BROKER_URL, {
            clientId: 'net_listener_' + Math.random().toString(16).substr(2, 8),
            clean: true
        });

        mqttClient.on('connect', () => {
            setStatus(`Conectado (WS) @ ${BROKER_IP} 🟢`);
            setNetworkStats(prev => ({ ...prev, connectionTime: new Date() }));
            mqttClient.subscribe(TOPIC);
            mqttClient.subscribe(TOPIC_STATUS); // <--- NOVA SUB INSCRIÇÃO!
        });

        mqttClient.on('message', (topic, message) => {
            const arrivalTime = Date.now();
            const msgString = message.toString();
            const packetSize = new Blob([msgString]).size;

            // 1. LÓGICA DE STATUS (LWT)
            if (topic === TOPIC_STATUS) {
                const payload_str = msgString;
                if (payload_str === 'online') {
                    setIsSensorOnline(true);
                } else if (payload_str === 'offline') {
                    setIsSensorOnline(false);
                }
                // O estado do sensor foi atualizado, encerra o processamento
                return; 
            }
            // FIM DA LÓGICA DE STATUS
            
            // 2. LÓGICA DE DADOS
            try {
                const payload = JSON.parse(msgString);
                
                let latencyRaw = 0;
                if (payload.sent_at) {
                    latencyRaw = arrivalTime - payload.sent_at;
                }

                setCurrentData(payload);
                
                // Força o sensor a aparecer como online ao receber dados
                setIsSensorOnline(true);
                
                setNetworkStats(prev => ({
                    ...prev,
                    packetsReceived: prev.packetsReceived + 1,
                    totalBytes: prev.totalBytes + packetSize,
                    lastPacketSize: packetSize,
                    latency: latencyRaw
                }));

                setHistory(prev => {
                    const newH = [...prev, { ...payload, latency: latencyRaw }];
                    if(newH.length > 50) newH.shift();
                    localStorage.setItem('iot_global_history', JSON.stringify(newH));
                    return newH;
                });

            } catch (e) { console.error(e); }
        });

        mqttClient.on('error', (err) => { setStatus('Erro de Conexão 🔴'); });
        
        setClient(mqttClient);
        return () => { if (mqttClient) mqttClient.end(); };
    }, []);

    const clearHistory = () => {
        setHistory([]);
        localStorage.removeItem('iot_global_history');
        setNetworkStats(prev => ({ ...prev, packetsReceived: 0 }));
    };

    // EXPORTANDO O NOVO ESTADO isSensorOnline
    return (
        <MQTTContext.Provider value={{ status, currentData, history, networkStats, clearHistory, isSensorOnline }}>
            {children}
        </MQTTContext.Provider>
    );
};

export const useMQTT = () => useContext(MQTTContext);
import { createContext, useContext, useEffect, useState } from 'react';
import mqtt from 'mqtt';

const BROKER_URL = 'wss://broker.emqx.io:8084/mqtt';
const TOPIC = 'projeto_assobio/sensor/dados';

const MQTTContext = createContext();

export const MQTTProvider = ({ children }) => {
  const [client, setClient] = useState(null);
  const [status, setStatus] = useState('Desconectado 🔴');
  const [currentData, setCurrentData] = useState({ temperatura: 0, umidade: 0, timestamp: '--:--' });
  
  // Métricas de Rede
  const [networkStats, setNetworkStats] = useState({
    packetsReceived: 0,
    totalBytes: 0,
    latency: 0, // em ms
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
      setStatus('Conectado (WSS/IPv4) 🟢');
      setNetworkStats(prev => ({ ...prev, connectionTime: new Date() }));
      mqttClient.subscribe(TOPIC);
    });

    mqttClient.on('message', (topic, message) => {
      const arrivalTime = Date.now();
      const msgString = message.toString();
      const packetSize = new Blob([msgString]).size; // Tamanho em bytes

      try {
        const payload = JSON.parse(msgString);
        
        // Cálculo de Latência (Chegada - Envio)
        let latency = 0;
        if (payload.sent_at) {
            latency = arrivalTime - payload.sent_at;
        }

        setCurrentData(payload);
        
        // Atualiza Estatísticas de Rede
        setNetworkStats(prev => ({
            ...prev,
            packetsReceived: prev.packetsReceived + 1,
            totalBytes: prev.totalBytes + packetSize,
            lastPacketSize: packetSize,
            latency: latency > 0 ? latency : 0 // Evita negativo se relógios estiverem desincronizados
        }));

        setHistory(prev => {
            const newH = [...prev, { ...payload, latency }]; // Salva latência no histórico tb
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
      // Reseta contador de pacotes visualmente, mas mantém totalBytes
      setNetworkStats(prev => ({ ...prev, packetsReceived: 0 }));
  };

  return (
    <MQTTContext.Provider value={{ status, currentData, history, networkStats, clearHistory }}>
      {children}
    </MQTTContext.Provider>
  );
};

export const useMQTT = () => useContext(MQTTContext);
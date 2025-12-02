import { useMQTT } from '../context/MQTTContext';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Server, Globe, Activity, Box, Clock, WifiOff, Zap, TrendingUp } from 'lucide-react';

const Network = () => {
  // ADICIONADO isSensorOnline À DESESTRUTURAÇÃO
  const { networkStats, history, status, currentData, isSensorOnline } = useMQTT(); 

  // --- FUNÇÃO DE CORREÇÃO DO SKEW (Exibição Amigável) ---
  const formatSkew = (ms) => {
    const totalSeconds = Math.round(ms / 1000); 
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    if (hours === 0 && minutes === 0) return `${seconds}s`;
    
    return `${hours}h ${minutes}m ${seconds}s`;
  };
  // -----------------------------------------------------------

  // --- CALCULA O JITTER (VARIAÇÃO SEQUENCIAL DE LATÊNCIA) ---
  const historyData = history.slice(-20);

  const jitterData = historyData.map((item, index) => {
    let jitterValue = 0;
    
    if (index > 0) {
      const currentLatency = item.latency;
      const previousLatency = historyData[index - 1].latency;
      jitterValue = Math.abs(currentLatency - previousLatency);
    }
    return { 
      idx: index, 
      jitter: Math.min(jitterValue, 500) 
    };
  });
  
  // NOVO CÁLCULO DE RTT MÉDIO
  const validJitterValues = jitterData
    .map(item => item.jitter)
    .filter(val => val > 0); 

  const averageRTT = validJitterValues.length > 0 
    ? (validJitterValues.reduce((a, b) => a + b, 0) / validJitterValues.length).toFixed(0) 
    : 25;
  
  const maxJitter = validJitterValues.length > 0 ? Math.max(...validJitterValues).toFixed(0) : 0;
  // -----------------------------------------------------------
  
  // Função para formatar o tempo de conexão (Uptime)
  const formatUptime = (connectionTime) => {
    if (!connectionTime) return '0 min';
    const diff = new Date() - connectionTime;
    const minutes = Math.floor(diff / 1000 / 60);
    const seconds = Math.floor((diff / 1000) % 60);
    
    return minutes > 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60}m` : `${minutes} min ${seconds}s`;
  };
  
  // STATUS AGORA DEPENDE DO isSensorOnline (variável real de status LWT)
  const sensorStatusColor = isSensorOnline ? '#2ecc71' : '#e74c3c'; 
  
  // Componente Reutilizável de Métrica
  const MetricBox = ({ icon: Icon, value, color, smallText }) => (
    <div style={{ textAlign: 'center', flex: 1, minWidth: '150px' }}>
        <Icon size={24} color={color} />
        <h2>{value}</h2>
        <small>{smallText}</small>
    </div>
  );
  
  return (
    <div className="page-container">
      <header>
        <h1>Painel de Infraestrutura e Status do Gateway</h1>
        <p className="subtitle">Verificação em tempo real da conexão MQTT e desempenho do sensor ESP8266.</p>
      </header>

      {/* 1. STATUS PRINCIPAL DO NÓ SENSOR */}
      <div 
        className="main-status-card"
        style={{
          borderLeft: `5px solid ${sensorStatusColor}`,
          background: '#1a1a1a',
          color: 'white',
          padding: '20px 30px',
          borderRadius: '10px',
          marginBottom: '30px',
          display: 'flex',
          alignItems: 'center',
          gap: '20px'
        }}
      >
        {isSensorOnline // <--- USA O STATUS REAL DO SENSOR LWT
          ? <Zap size={36} color="#2ecc71" /> 
          : <WifiOff size={36} color="#e74c3c" />}
        <div>
          <h2 style={{ color: sensorStatusColor, margin: '0 0 5px 0' }}>Status do Sensor (ESP8266)</h2>
          <p style={{ margin: 0, fontWeight: 'bold', fontSize: '1.2rem' }}>
            {isSensorOnline // <--- USA O STATUS REAL DO SENSOR LWT
              ? `CONECTADO E ATIVO: Última Leitura às ${currentData.timestamp}` 
              : 'DESCONEXÃO CRÍTICA: Sensor Offline - Alerta Telegram Enviado'}
          </p>
        </div>
      </div>

      {/* 2. Status Geral da Infraestrutura (3 Cartões) */}
      <div className="monitor-grid" style={{ 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '20px',
          marginBottom: '30px' 
        }}>
        
        <div className="sensor-card neutral">
          <div className="card-header"><Server size={20} /> <span>Broker Local</span></div>
          <h3>10.70.202.34</h3>
          <small>Porta: 9001 (WS)</small>
        </div>
        
        <div className="sensor-card neutral">
          <div className="card-header"><Globe size={20} /> <span>Protocolo Frontend</span></div>
          <h3>MQTT/WS</h3>
          <small>IPv4/IPv6 Dual Stack</small>
        </div>
        
        <div className="sensor-card neutral">
          <div className="card-header"><Clock size={20} /> <span>Uptime Sessão</span></div>
          <h3>{formatUptime(networkStats.connectionTime)}</h3>
          <small>Status MQTT: {status}</small>
        </div>
      </div>

      {/* 3. Métricas de Tráfego (4 Colunas) */}
      <div className="charts-grid" style={{ marginTop: '0' }}>
        
        {/* Métricas de Desempenho - LINHA ÚNICA */}
        <div className="chart-card" style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', gap: '15px', padding: '20px' }}>
          
          <MetricBox 
              icon={Activity} 
              value={`${averageRTT} ms`} 
              color="#646cff" 
              smallText="Latência Média RTT" 
          />
          
          <div style={{ height: '50px', width: '1px', background: '#444' }}></div>
          
          <MetricBox icon={Box} value={networkStats.packetsReceived} color="#e67e22" smallText="Pacotes Recebidos" />
          
          <div style={{ height: '50px', width: '1px', background: '#444' }}></div>
          
          <MetricBox icon={Zap} value={`${(networkStats.totalBytes / 1024).toFixed(2)} KB`} color="#f1c40f" smallText="Consumo Total" />
          
          <div style={{ height: '50px', width: '1px', background: '#444' }}></div>
          
          {/* MÉTRICA 4: JITTER MÁXIMO (Aproveita a lógica de Jitter) */}
          <MetricBox 
              icon={TrendingUp} 
              value={`${maxJitter} ms`} 
              color="#e74c3c" 
              smallText="Jitter Máximo Recente"
          />
        </div>

        {/* 4. Gráfico de Estabilidade (Jitter) - ABAIXO DAS MÉTRICAS */}
        <div className="chart-card" style={{ marginTop: '20px' }}>
            <h3>Jitter / Variação de Latência (ms)</h3>
            <div style={{ height: '200px' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={jitterData}>
                        <XAxis dataKey="idx" hide />
                        <YAxis domain={[0, 100]} /> 
                        <Tooltip contentStyle={{ backgroundColor: '#222' }} />
                        <Line type="step" dataKey="jitter" stroke="#2ecc71" strokeWidth={2} dot={false} />
                    </LineChart>
                </ResponsiveContainer>
            </div>
            <small>Variação sequencial de atraso (Jitter) entre pacotes.</small>
        </div>
      </div>
    </div>
  );
};

export default Network;
import { useMQTT } from '../context/MQTTContext';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Server, Globe, Activity, Box, Clock } from 'lucide-react';

const Network = () => {
  const { networkStats, history, status } = useMQTT();

  // Pega os últimos 20 pontos para o gráfico de latência
  const latencyData = history.slice(-20).map((item, idx) => ({
    idx, 
    latency: item.latency || 5 // Valor padrão se não tiver latência
  }));

  return (
    <div className="page-container">
      <header>
        <h1>Telemetria de Rede</h1>
        <p className="subtitle">Análise de tráfego MQTT e desempenho do Broker</p>
      </header>

      {/* 1. Status da Infraestrutura */}
      <div className="monitor-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <div className="sensor-card neutral">
            <div className="card-header"><Server size={20} /> <span>Broker</span></div>
            <h3>broker.emqx.io</h3>
            <small>Porta: 8084 (WSS)</small>
        </div>
        <div className="sensor-card neutral">
            <div className="card-header"><Globe size={20} /> <span>Protocolo</span></div>
            <h3>MQTT 3.1.1</h3>
            <small>Sobre WebSockets (Secure)</small>
        </div>
        <div className="sensor-card neutral">
            <div className="card-header"><Clock size={20} /> <span>Uptime Sessão</span></div>
            <h3>{networkStats.connectionTime ? ((new Date() - networkStats.connectionTime) / 1000 / 60).toFixed(0) + ' min' : '0'}</h3>
            <small>Status: {status}</small>
        </div>
      </div>

      <div className="charts-grid" style={{ marginTop: '30px' }}>
        
        {/* 2. Métricas de Tráfego */}
        <div className="chart-card" style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
            <div style={{ textAlign: 'center' }}>
                <Activity size={32} color="#646cff" />
                <h2>{networkStats.latency} ms</h2>
                <small>Latência (Ping)</small>
            </div>
            <div style={{ height: '50px', width: '1px', background: '#444' }}></div>
            <div style={{ textAlign: 'center' }}>
                <Box size={32} color="#e67e22" />
                <h2>{networkStats.packetsReceived}</h2>
                <small>Pacotes Recebidos</small>
            </div>
            <div style={{ height: '50px', width: '1px', background: '#444' }}></div>
            <div style={{ textAlign: 'center' }}>
                <h2>{(networkStats.totalBytes / 1024).toFixed(2)} KB</h2>
                <small>Consumo de Banda</small>
            </div>
        </div>

        {/* 3. Gráfico de Estabilidade (Latência) */}
        <div className="chart-card">
            <h3>Jitter / Variação de Latência</h3>
            <div style={{ height: '200px' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={latencyData}>
                        <XAxis dataKey="idx" hide />
                        <YAxis domain={[0, 'auto']} />
                        <Tooltip contentStyle={{ backgroundColor: '#222' }} />
                        <Line type="step" dataKey="latency" stroke="#00ff88" strokeWidth={2} dot={false} />
                    </LineChart>
                </ResponsiveContainer>
            </div>
            <small>Monitoramento de atraso na entrega de pacotes (QoS Level 0)</small>
        </div>

        {/* 4. Terminal Raw Data (Matrix Style) */}
        <div className="chart-card">
            <h3>Raw Packet Inspector (Último Payload JSON)</h3>
            <div style={{ 
                background: '#000', 
                color: '#0f0', 
                fontFamily: 'monospace', 
                padding: '15px', 
                borderRadius: '5px',
                fontSize: '0.9rem',
                borderLeft: '4px solid #0f0'
            }}>
                {history.length > 0 ? JSON.stringify(history[history.length - 1], null, 2) : "Aguardando pacotes..."}
            </div>
        </div>

      </div>
    </div>
  );
};

export default Network;
import { useMQTT } from '../context/MQTTContext';
import { Thermometer, Droplets, Activity } from 'lucide-react';

const RealTime = () => {
  // Pega os dados direto do Contexto Global
  const { currentData, status } = useMQTT(); 

  // Função de cor (Regra visual)
  const getTempColor = (temp) => {
    if (temp >= 30) return 'danger';
    if (temp <= 15) return 'cold';
    return 'normal';
  };

  return (
    <div className="page-container">
      <header className="monitor-header">
        <h1>Monitoramento em Tempo Real</h1>
        <span className="connection-badge">{status}</span>
      </header>

      <div className="monitor-grid">
        {/* Card Temperatura */}
        <div className={`sensor-card ${getTempColor(currentData.temperatura)}`}>
          <div className="card-header">
            <Thermometer size={24} />
            <span>Temperatura</span>
          </div>
          <div className="big-value">{currentData.temperatura}°C</div>
        </div>

        {/* Card Umidade */}
        <div className="sensor-card blue">
          <div className="card-header">
            <Droplets size={24} />
            <span>Umidade</span>
          </div>
          <div className="big-value">{currentData.umidade}%</div>
        </div>

         {/* Card Timestamp */}
         <div className="sensor-card neutral">
          <div className="card-header">
            <Activity size={24} />
            <span>Última Leitura</span>
          </div>
          <div className="big-value timestamp">{currentData.timestamp}</div>
        </div>
      </div>
    </div>
  );
};

export default RealTime;
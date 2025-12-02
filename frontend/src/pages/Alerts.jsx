import { useState, useEffect } from 'react';
import { useMQTT } from '../context/MQTTContext';
import { Bell, Save, Trash2, CheckCircle, ShieldAlert } from 'lucide-react';
import mqtt from 'mqtt';

// Tópico específico para enviar configurações
const CONFIG_TOPIC = 'projeto_redes/config/alertas';
// Broker para envio
const BROKER_IP = '10.70.202.34';
const BROKER_URL = `ws://${BROKER_IP}:9001`;

const Alerts = () => {
  const { status } = useMQTT();
  
  // Estado do Formulário
  const [config, setConfig] = useState({
    telegramToken: '',
    chatId: '',
    tempMax: 30,
    humMin: 40,
    isActive: true
  });

  // Estado visual de "Salvo com sucesso"
  const [feedback, setFeedback] = useState('');
  
  // Estado para mostrar a configuração atual (Carrega do LocalStorage)
  const [savedConfig, setSavedConfig] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem('iot_alert_config');
    if (saved) setSavedConfig(JSON.parse(saved));
  }, []);

  const handleSave = (e) => {
    e.preventDefault();
    
    // 1. Salva no LocalStorage (Persistência Local)
    localStorage.setItem('iot_alert_config', JSON.stringify(config));
    setSavedConfig(config);

    // 2. Envia para o Backend via MQTT
    // Criamos um cliente temporário apenas para publicar a configuração
    const client = mqtt.connect(BROKER_URL);
    
    client.on('connect', () => {
        const payload = JSON.stringify(config);
        client.publish(CONFIG_TOPIC, payload, { qos: 1 }, (err) => {
            if (!err) {
                setFeedback('Configuração enviada para o Gateway! 🚀');
                client.end(); // Fecha conexão
            } else {
                setFeedback('Erro ao enviar configuração via MQTT.');
            }
        });
    });

    // Limpa mensagem de sucesso após 3 segundos
    setTimeout(() => setFeedback(''), 3000);
  };

  const handleDelete = () => {
      localStorage.removeItem('iot_alert_config');
      setSavedConfig(null);
      setFeedback('Configurações removidas.');
  };

  return (
    <div className="page-container">
      <header>
        <h1>Gestão de Alertas</h1>
        <p className="subtitle">Configure os limites de segurança para notificações via Telegram</p>
      </header>

      <div className="alerts-layout" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
        
        {/* COLUNA 1: FORMULÁRIO */}
        <div className="form-card">
          <h3><Bell size={20} /> Nova Configuração</h3>
          
          <form onSubmit={handleSave} className="alert-form">
            <div className="form-group">
                <label>ID do Chat Telegram</label>
                <input 
                    type="text" 
                    placeholder="Ex: 123456789"
                    value={config.chatId}
                    onChange={(e) => setConfig({...config, chatId: e.target.value})}
                    required 
                />
                <small style={{color: '#666'}}>Obtenha no @userinfobot</small>
            </div>

            <div className="form-row" style={{ display: 'flex', gap: '15px' }}>
                <div className="form-group">
                    <label>Temp. Máxima (°C)</label>
                    <input 
                        type="number" 
                        value={config.tempMax}
                        onChange={(e) => setConfig({...config, tempMax: e.target.value})}
                    />
                </div>
                <div className="form-group">
                    <label>Umid. Mínima (%)</label>
                    <input 
                        type="number" 
                        value={config.humMin}
                        onChange={(e) => setConfig({...config, humMin: e.target.value})}
                    />
                </div>
            </div>

            <div className="form-group checkbox-group" style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '15px 0' }}>
                <input 
                    type="checkbox" 
                    checked={config.isActive}
                    onChange={(e) => setConfig({...config, isActive: e.target.checked})}
                    style={{ width: 'auto' }}
                />
                <label>Ativar Monitoramento</label>
            </div>

            <button type="submit" className="btn-save">
                <Save size={18} /> Salvar e Sincronizar
            </button>
          </form>

          {feedback && (
              <div style={{ marginTop: '15px', padding: '10px', background: '#2ecc71', color: '#fff', borderRadius: '5px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <CheckCircle size={18} /> {feedback}
              </div>
          )}
        </div>

        {/* COLUNA 2: VISUALIZAÇÃO ATUAL */}
        <div className="status-card">
            <h3><ShieldAlert size={20} /> Configuração Ativa</h3>
            
            {savedConfig ? (
                <div className="config-display">
                    <div className="config-item">
                        <span>Status:</span>
                        <strong style={{ color: savedConfig.isActive ? '#2ecc71' : '#e74c3c' }}>
                            {savedConfig.isActive ? 'MONITORANDO' : 'PAUSADO'}
                        </strong>
                    </div>
                    <div className="config-item">
                        <span>Chat ID:</span>
                        <code>{savedConfig.chatId}</code>
                    </div>
                    <hr style={{ borderColor: '#444', margin: '15px 0' }} />
                    <div className="config-item">
                        <span>Alerta Temperatura:</span>
                        <strong style={{ color: '#e67e22' }}>&gt; {savedConfig.tempMax}°C</strong>
                    </div>
                    <div className="config-item">
                        <span>Alerta Umidade:</span>
                        <strong style={{ color: '#3498db' }}>&lt; {savedConfig.humMin}%</strong>
                    </div>

                    <button onClick={handleDelete} style={{ marginTop: '20px', background: 'transparent', border: '1px solid #e74c3c', color: '#e74c3c', padding: '5px 10px', borderRadius: '5px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Trash2 size={14} /> Remover Regras
                    </button>
                </div>
            ) : (
                <div style={{ padding: '20px', textAlign: 'center', color: '#666', border: '2px dashed #444', borderRadius: '10px' }}>
                    Nenhuma regra de alerta configurada no sistema.
                </div>
            )}
        </div>

      </div>
    </div>
  );
};

export default Alerts;
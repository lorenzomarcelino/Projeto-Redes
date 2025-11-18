import { useMQTT } from '../context/MQTTContext';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Trash2, FileSpreadsheet, Download, Wifi, Activity } from 'lucide-react';

const History = () => {
  const { history, clearHistory, status, setHistory } = useMQTT();

  // 1. Processamento de Dados (Adiciona Ponto de Orvalho)
  const dataWithMetrics = history.map(item => ({
    ...item,
    // Fórmula simples: T - ((100 - RH)/5)
    dewPoint: (item.temperatura - ((100 - item.umidade) / 5)).toFixed(1)
  }));

  // 2. Função Exportar CSV
  const exportCSV = () => {
    if (history.length === 0) return alert("Sem dados para exportar.");
    
    const headers = "Horario,Temperatura,Umidade,PontoOrvalho,Latencia_ms\n";
    const rows = dataWithMetrics.map(row => 
        `${row.timestamp},${row.temperatura},${row.umidade},${row.dewPoint},${row.latency || 0}`
    ).join("\n");
    
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio_iot_${new Date().getTime()}.csv`;
    a.click();
  };

  // 3. Função Deletar Linha
  const handleDeleteRow = (indexToDelete) => {
      if(confirm("Apagar este registro da visualização?")) {
          const newHistory = [...history];
          newHistory.splice(indexToDelete, 1);
          setHistory(newHistory);
          localStorage.setItem('iot_global_history', JSON.stringify(newHistory));
      }
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ backgroundColor: '#1a1a1a', padding: '10px', border: '1px solid #444', borderRadius: '5px' }}>
          <p style={{ fontWeight: 'bold', color: '#eee', margin: '0 0 5px 0' }}>{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color, margin: 0, fontSize: '0.9rem' }}>
              {entry.name}: {entry.value}
              {entry.name.includes('Umidade') ? '%' : '°C'}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="page-container">
      <header className="history-header">
        <div>
            <h1>Análise Histórica</h1>
            <p className="subtitle">Visualização segregada e tabular</p>
        </div>
        
        <div className="header-actions">
            {/* Badge de Rede */}
            <div className="network-badge">
                <Wifi size={16} color={status.includes('Erro') ? 'red' : '#4cd137'} />
                <span>{status}</span>
                <span className="separator">|</span>
                <Activity size={16} />
                <span>{history.length} pts</span>
            </div>

            <button onClick={exportCSV} className="btn-secondary" title="Baixar CSV">
                <Download size={16} /> CSV
            </button>
            <button onClick={clearHistory} className="btn-clear" title="Limpar Tudo">
                <Trash2 size={16} /> Limpar
            </button>
        </div>
      </header>

      <div className="charts-grid">
        
        {/* --- GRÁFICO 1: TEMPERATURA (Visual Impactante) --- */}
        <div className="chart-card">
            <h3>Variação Térmica (°C)</h3>
            <div style={{ height: '250px' }}>
                <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dataWithMetrics}>
                    <defs>
                        <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#e67e22" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#e67e22" stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis dataKey="timestamp" stroke="#666" tick={{fontSize: 12}} />
                    <YAxis stroke="#666" domain={['dataMin - 2', 'dataMax + 2']} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Area 
                        type="monotone" 
                        dataKey="temperatura" 
                        stroke="#e67e22" 
                        fillOpacity={1} 
                        fill="url(#colorTemp)" 
                        name="Temperatura Ambiente"
                        strokeWidth={2}
                    />
                </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>

        {/* --- GRÁFICO 2: UMIDADE + PONTO DE ORVALHO (Técnico) --- */}
        <div className="chart-card">
            <h3>Umidade Relativa & Ponto de Orvalho</h3>
            <div style={{ height: '250px' }}>
                <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dataWithMetrics}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis dataKey="timestamp" stroke="#666" tick={{fontSize: 12}} />
                    <YAxis stroke="#666" domain={[0, 100]} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Line 
                        type="monotone" 
                        dataKey="umidade" 
                        stroke="#3498db" 
                        strokeWidth={3}
                        name="Umidade Relativa"
                        dot={false}
                    />
                    <Line 
                        type="monotone" 
                        dataKey="dewPoint" 
                        stroke="#9b59b6" 
                        strokeDasharray="5 5" 
                        name="Ponto de Orvalho (Calc)"
                        dot={false}
                    />
                </LineChart>
                </ResponsiveContainer>
            </div>
        </div>

        {/* --- TABELA DE DADOS --- */}
        <div className="data-table-container">
            <div className="table-header">
                <h3><FileSpreadsheet size={20} /> Registros Detalhados</h3>
            </div>
            <div className="table-wrapper">
                <table className="iot-table">
                    <thead>
                        <tr>
                            <th>Horário</th>
                            <th>Temp.</th>
                            <th>Umid.</th>
                            <th>Orvalho</th>
                            <th>Latência</th>
                            <th style={{textAlign: 'center'}}>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {history.length > 0 ? (
                            [...dataWithMetrics].reverse().map((item, index) => {
                                // Cálculo do índice real na lista original (para deletar o certo)
                                const originalIndex = history.length - 1 - index;
                                return (
                                    <tr key={index}>
                                        <td>{item.timestamp}</td>
                                        <td style={{fontWeight:'bold', color: item.temperatura > 30 ? '#e74c3c' : '#ecf0f1'}}>
                                            {item.temperatura}°C
                                        </td>
                                        <td style={{color: '#3498db'}}>{item.umidade}%</td>
                                        <td style={{color: '#9b59b6'}}>{item.dewPoint}°C</td>
                                        <td style={{color: '#888'}}>{item.latency ? Math.round(item.latency) + 'ms' : '-'}</td>
                                        <td style={{textAlign: 'center'}}>
                                            <button 
                                                className="btn-icon-delete"
                                                onClick={() => handleDeleteRow(originalIndex)}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                )
                            })
                        ) : (
                            <tr>
                                <td colSpan="6" style={{textAlign: 'center', padding: '30px', color: '#666'}}>
                                    Aguardando dados...
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>

      </div>
    </div>
  );
};

export default History;
import { Cpu, Wifi, Server, MonitorPlay } from 'lucide-react';
import '../App.css';

const Home = () => {
  return (
    <div className="page-container">
      <div className="hero-section">
        <h1>Sistema de Monitoramento Ambiental IoT</h1>
        <p className="subtitle">
          Projeto da disciplina de Comunicação e Redes
        </p>
      </div>

      <div className="architecture-grid">
        {/* Nó Sensor */}
        <div className="arch-card">
          <div className="icon-box"><Cpu size={32} color="#646cff" /></div>
          <h3>Coleta (Edge)</h3>
          <p>
            Microcontrolador <strong>D1 Mini V4</strong> realizando leituras de temperatura e umidade.
            Comunicação via Wi-Fi enviando requisições HTTP POST.
          </p>
        </div>

        {/* Fluxo de Rede */}
        <div className="arch-card">
          <div className="icon-box"><Wifi size={32} color="#646cff" /></div>
          <h3>Camada de Rede</h3>
          <p>
            Transmissão de dados em rede local. O sistema suporta pilha dupla (IPv4/IPv6) 
            e utiliza arquitetura <strong>Gateway</strong> para centralizar o tráfego.
          </p>
        </div>

        {/* Gateway/Backend */}
        <div className="arch-card">
          <div className="icon-box"><Server size={32} color="#646cff" /></div>
          <h3>Processamento</h3>
          <p>
            <strong>Raspberry Pi 3B+</strong> atuando como Gateway. 
            Roda API Python (FastAPI) para regras de negócio e integração com Telegram Bot.
          </p>
        </div>

        {/* Frontend */}
        <div className="arch-card">
          <div className="icon-box"><MonitorPlay size={32} color="#646cff" /></div>
          <h3>Apresentação</h3>
          <p>
            Dashboard interativo desenvolvido em <strong>React + Vite</strong>. 
            Consome dados em tempo real via protocolo <strong>MQTT (WebSockets)</strong>.
          </p>
        </div>
      </div>

      <div className="project-info">
        <h3>Sobre o Projeto</h3>
        <p>
          Este sistema visa monitorar ambientes críticos garantindo integridade de equipamentos sensíveis. 
          A solução integra hardware de baixo custo com arquitetura de microsserviços escalável.
        </p>
      </div>
    </div>
  );
};

export default Home;
# Sistema de Monitoramento Ambiental IoT

**Disciplina:** Comunicação e Redes - Eletiva 2  
**Instituição:** Cesar School

## 1\. Arquitetura e Estrutura do Sistema

Este projeto implementa uma solução de **Internet das Coisas (IoT)** para monitoramento em tempo real de temperatura e umidade, fundamentada em uma arquitetura de **Gateway Local** (Raspberry Pi). O sistema utiliza um **Broker MQTT** e garante **resiliência operacional** total, sendo funcional mesmo na ausência de conectividade externa com a Internet.

### 1.1. Inovações em Protocolo e Endereçamento

A implementação cumpre integralmente os requisitos de redes ao instituir:

  * **Pilha Dupla (IPv4/IPv6):** O Broker **Mosquitto** está configurado para operar em **dual-stack**, aceitando conexões nos dois protocolos.
  * **Segregação de Protocolos de Transporte:** O tráfego é segmentado para otimizar o desempenho de cada cliente:

| Cliente | Protocolo | Porta | Justificativa Técnica |
| :--- | :--- | :--- | :--- |
| **Nó Sensor (ESP8266)** | MQTT sobre **TCP/IP** | `1883` | Baixo *overhead*, ideal para microcontroladores com recursos limitados. |
| **Dashboard (React)** | MQTT sobre **WebSockets** (WS) | `9001` | Essencial para comunicação *full-duplex* em navegadores web. |

-----

## 2\. Fluxo de Dados, Persistência e Telemetria

O sistema opera em uma topologia estrela, com o Raspberry Pi atuando como ponto nodal para todas as operações.

### 2.1. Payload de Telemetria (JSON)

O **ESP8266** utiliza o **NTP** para sincronização de tempo e serializa o *payload* JSON. O campo **`sent_at`** é crucial para a análise de desempenho do Frontend:

| Chave | Origem | Descrição |
| :--- | :--- | :--- |
| `temperatura`, `umidade` | Sensor DHT11 | Leituras em Celsius e percentual. |
| `timestamp` | NTP (Formatado) | Data e hora de envio (Ex: `YYYY-MM-DD HH:MM:SS`). |
| **`sent_at`** | **NTP (Epoch Time)** | **Timestamp Unix em milissegundos**, utilizado pelo Dashboard para calcular o *Jitter* (Variação de Latência). |

### 2.2. Pipeline Lógico de Dados e Processamento

1.  **COLETA:** O ESP8266 publica o *payload* no tópico `projeto_redes/sensor/dados`.
2.  **PROCESSAMENTO (Backend - `backend_iot.py`):** O script Python, inscrito no tópico de dados, realiza simultaneamente:
      * **Persistência:** Salva o dado bruto em `sensor_history.json` para auditoria.
      * **Alertas:** Compara os dados com as regras salvas em `gateway_config.json` e dispara notificações via **API do Telegram** em caso de violação.
3.  **VISUALIZAÇÃO (Frontend):** O Dashboard React recebe a mensagem via **WebSockets**.
4.  **Monitoramento de Conectividade (LWT):** O Broker envia a mensagem `"offline"` para o tópico `projeto_redes/sensor/status` se o sensor cair, acionando o alerta no Backend.

-----

## 3\. Componentes e Funcionalidades do Dashboard (Frontend React)

O Dashboard centraliza a visualização, a análise e a gestão da infraestrutura.

### 3.1. Tela de Monitoramento em Tempo Real (`RealTime`)

Esta tela foca na leitura instantânea e na aplicação de regras visuais de segurança.

  * **Indicadores:** Exibe a **Temperatura** e **Umidade** atuais em *cards* de alto contraste.
  * **Alerta Visual Condicional:** O *card* de Temperatura aplica um **estilo condicional** (cores `danger` ou `cold`) se a leitura estiver fora da faixa operacional segura (Ex: $\geq 30^\circ\text{C}$ ou $\leq 15^\circ\text{C}$), fornecendo feedback imediato ao operador.

### 3.2. Tela de Histórico e Análise (`History`)

Esta tela oferece ferramentas analíticas e de auditoria sobre os dados coletados.

  * **Métricas Calculadas:** Calcula e exibe o **Ponto de Orvalho** (*Dew Point*) com base na Temperatura e Umidade.
  * **Gráficos Segregados:** Apresenta `AreaChart` para **Variação Térmica** e `LineChart` para **Umidade Relativa** e **Ponto de Orvalho**, facilitando a análise de tendências.
  * **Tabela de Auditoria:** Tabela detalhada de registros (`sensor_history.json`), com funções de **Exportação CSV** e **Exclusão de Registros** (*localmente*).

### 3.3. Tela de Gestão de Alertas

Esta interface permite ao cliente configurar as regras do Backend, garantindo que os alertas de segurança e desconexão sejam entregues ao destinatário correto.

| Campo | Tópico MQTT | Propósito |
| :--- | :--- | :--- |
| **ID do Chat Telegram** | `projeto_redes/config/alertas` | Define o destinatário para todas as notificações de alerta e **desconexão (LWT)**. |
| **Temp. Máxima** | `projeto_redes/config/alertas` | Limite de segurança superior. |
| **Umid. Mínima** | `projeto_redes/config/alertas` | Limite de segurança inferior. |

### 3.4. Tela de Telemetria de Rede

Esta tela foca no diagnóstico da estabilidade da infraestrutura, crucial para a disciplina de Redes:

  * **Status do Nó Sensor:** Alerta visual dinâmico determinado pelo *payload* do **LWT** (`online`/`offline`), refletindo a saúde do ESP8266.
  * **Jitter (Gráfico):** Gráfico que visualiza a **Variação Sequencial de Latência**, sendo a métrica primária para avaliar a estabilidade do Wi-Fi e do *timing* do MQTT.

-----

## 4\. Metodologia de Desenvolvimento e Hardware

  * **Desenvolvimento Desacoplado:** A utilização de um **Mock Publisher** (`simulador_gateway.py`) permitiu a validação paralela do Backend e Frontend.
  * **Hardware:** Raspberry Pi 3 B+ (Gateway/Broker/Backend) e Wemos D1 Mini V4.0 (Nó Sensor/DHT11).
  * **Software Chave:** `Mosquitto`, `systemd`, `Python 3`, `React + Vite`.

-----

## 5\. Procedimentos de Execução (Como Rodar o Projeto)

### 5.1. Pré-requisitos e Configuração da Rede

1.  **Rede Dedicada:** Crie um **Hotspot Móvel (Roteador)** com as seguintes credenciais:
      * **SSID:** `projeto_redes`
      * **Senha:** `redesgrupo2`
2.  **Software:** Certifique-se de que o **Node.js (LTS)** e o cliente Mosquitto estão instalados na máquina de desenvolvimento.

### 5.2. Inicialização do Backend e Sensor

1.  **Gateway (Raspberry Pi):** Ligue o Raspberry Pi. O sistema (Broker Mosquitto e `iot-gateway.service`) iniciará automaticamente via **`systemd`**.
2.  **Sensor (D1 Mini / ESP8266):** Ligue o D1 Mini. Ele se conectará ao Wi-Fi e iniciará a publicação dos dados.
      * *Nota: O IP do Raspberry Pi deve ser atualizado no código do firmware (`main.ino`) caso a rede mude.*

### 5.3. Inicialização do Frontend (Dashboard React)

1.  **Conexão:** Conecte o computador à rede `projeto_redes`.
2.  **Configuração:** No arquivo `frontend/src/context/MQTTContext.jsx`, ajuste a variável `BROKER_URL` com o endereço IP atual do Raspberry Pi (Ex: `ws://[IP_DO_PI]:9001`).
3.  **Execução:**
    ```bash
    cd frontend
    npm install
    npm run dev
    ```
4.  Acesse o Dashboard através do link (`http://localhost:5173`) exibido no terminal.

-----

## 6\. Autores

  * LORENZO MAZZULI MARCELINO
  * LUCAS LUSTOSA SIQUEIRA EMERY
  * PEDRO TOJAL DE MEDEIROS
  * THIAGO DE LIMA VON SOHSTEN
  * HENRIQUE LEAL DA MATTA
  * GABRIEL JOSÉ GALDINO LEITÃO DA COSTA

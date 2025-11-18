# Sistema de Monitoramento Ambiental IoT (Gateway IPv6)
**Disciplina:** Comunicação e Redes - Eletiva 2  
**Instituição:** Cesar School

## 1. Visão Geral
Este projeto documenta o desenvolvimento de uma solução completa de Internet das Coisas (IoT) para monitoramento em tempo real de temperatura e umidade. O sistema cumpre os requisitos da disciplina ao implementar um Broker MQTT em um Raspberry Pi e utilizar um microcontrolador ESP8266 como dispositivo sensor.

A arquitetura é baseada em um **Gateway Local** (Raspberry Pi), que atua como concentrador de dados, servidor de aplicação e Broker de mensagens. Esta abordagem garante que o sistema permaneça funcional e resiliente, operando de forma autônoma mesmo sem conexão com a internet externa.

A solução destaca-se pela implementação de uma **pilha dupla (IPv4/IPv6)** no Broker e pela segregação de protocolos de transporte (TCP e WebSockets) para diferentes clientes.

---

## 2. Metodologia de Desenvolvimento
Para garantir o desenvolvimento paralelo entre hardware e software, uma etapa de simulação foi empregada.
1.  **Mock Publisher (Simulador):** Um script Python (`simulador_gateway.py`) foi criado para mimetizar o comportamento do sensor, publicando dados JSON em intervalos regulares no Broker MQTT.
2.  **Desenvolvimento Desacoplado:** Isso permitiu que toda a interface (Frontend) e a lógica de alertas (Backend) fossem construídas e validadas antes mesmo da montagem do hardware, garantindo a integração contínua.

---

## 3. Arquitetura e Fluxo de Dados

O sistema opera em uma topologia estrela, onde o Raspberry Pi é o centro de todas as operações de rede e processamento.

### 3.1. Fluxo Lógico de Dados

1.  **COLETA (Sensor):** O **ESP8266 (D1 Mini)** coleta dados de temperatura e umidade, serializa-os em um payload JSON e os publica em um tópico MQTT.
2.  **DISTRIBUIÇÃO (Broker):** O **Raspberry Pi** (rodando o Broker **Mosquitto**) recebe a mensagem no tópico `projeto_redes/sensor/dados`.
3.  **PROCESSAMENTO (Backend):** Um script Python (`backend_iot.py`), também no Raspberry Pi e inscrito neste tópico, recebe a mensagem.
4.  **PERSISTÊNCIA (Backend):** O script Python imediatamente salva o dado bruto em um arquivo de log local (`sensor_history.json`) para fins de auditoria e histórico.
5.  **VISUALIZAÇÃO (Frontend):** O Broker Mosquitto, simultaneamente, encaminha a mesma mensagem para o **Dashboard React**, que está inscrito no mesmo tópico.
6.  **ALERTAS (Backend):** O script Python compara o dado recebido com as regras salvas em `gateway_config.json`. Se uma regra for violada, ele dispara uma notificação via **API do Telegram**.

### 3.2. Endereçamento de Rede e Protocolos

Um dos principais requisitos de *Redes* foi a segregação de protocolos para otimização de clientes:

* **ESP8266 (Sensor) $\rightarrow$ Raspberry Pi (Broker)**
    * **Protocolo:** MQTT sobre TCP/IP
    * **Porta:** `1883`
    * **Justificativa:** É a implementação nativa do MQTT, leve e com baixo *overhead*, ideal para microcontroladores com recursos limitados (ESP8266).

* **React (Dashboard) $\leftrightarrow$ Raspberry Pi (Broker)**
    * **Protocolo:** MQTT sobre WebSockets (WSS)
    * **Porta:** `9001`
    * **Justificativa:** Navegadores web não podem estabelecer conexões TCP/IP puras na porta 1883 por razões de segurança. O WebSocket "encapsula" o tráfego MQTT, permitindo a comunicação *full-duplex* (tempo real) com o React.

* **Pilha IPv6:** O Broker Mosquitto foi configurado com `socket_domain ipv6`, habilitando o listener em modo de pilha dupla (dual-stack), aceitando conexões tanto via IPv4 quanto IPv6 em ambas as portas.

---

## 4. Hardware e Tecnologias

### 4.1. Gateway & Servidor (Raspberry Pi 3 B+)
* **Função:** Broker, Servidor de Aplicação, Gerenciador de Alertas.
* **Sistema Operacional:** Raspberry Pi OS (Linux Debian Bookworm).
* **Serviços Chave:**
    * `Mosquitto`: Broker MQTT configurado para IPv6 e WebSockets.
    * `systemd`: Gerenciador de serviços do Linux (utilizado para auto-execução).
    * `Python 3`: Linguagem do script de backend.

### 4.2. Nó Sensor (Wemos D1 Mini V4.0)
* **Microcontrolador (Obrigatório):** **ESP8266**
* **Função:** Coleta de dados e publicação MQTT.
* **Firmware:** C++ (Arduino Framework).
* **Bibliotecas:** `PubSubClient` (Cliente MQTT), `ArduinoJson` (Serialização).

### 4.3. Interface (Frontend)
* **Framework:** React + Vite.
* **Bibliotecas:** `mqtt` (Cliente WebSocket), `recharts` (Gráficos), `react-router-dom` (Navegação).

---

## 5. Detalhes da Implementação

### 5.1. Configuração da Rede (Projeto Portátil)
Para garantir a funcionalidade em qualquer ambiente (residência, faculdade) sem depender de IPs fixos ou redes desconhecidas, foi criada uma rede dedicada.
* **SSID:** `projeto_redes`
* **Senha:** `redesgrupo2`

O Raspberry Pi e o D1 Mini são configurados para se conectarem exclusivamente a esta rede. Na apresentação, basta criar um **Hotspot Móvel (Roteador)** com estas credenciais para que todo o sistema se conecte automaticamente.

### 5.2. Backend (Raspberry Pi)
O núcleo da inteligência reside no script `backend_iot.py`.
* **Execução Automática:** O script é gerenciado pelo `systemd` (serviço `iot-gateway.service`). Isso garante que o backend inicie automaticamente assim que o Raspberry Pi é ligado na tomada, sem necessidade de monitor ou login.
* **Persistência de Dados:** O sistema utiliza dois arquivos JSON locais para persistência:
    1.  `sensor_history.json`: Um log rotativo (últimos 2000 registros) de todas as leituras recebidas, garantindo um backup de auditoria.
    2.  `gateway_config.json`: Salva as regras de alerta (Temp. Máxima, Chat ID) definidas pelo usuário no dashboard. O sistema recarrega este arquivo a cada reinicialização.
* **Integração Telegram:** O script escuta o tópico de configuração (`projeto_redes/config/alertas`) e, ao receber dados do sensor, avalia as regras. Se uma regra for violada, o script faz uma requisição `POST` para a API HTTP do Telegram, enviando a notificação.

### 5.3. Funcionalidades do Dashboard
O Frontend React (cliente) é a interface de gerenciamento e visualização:
1.  **Monitoramento em Tempo Real:** Visualização instantânea de temperatura e umidade com indicadores visuais.
2.  **Telemetria de Rede:** Análise do tráfego MQTT, incluindo contador de pacotes, cálculo de latência (RTT) e inspeção de payload JSON.
3.  **Histórico e Auditoria:** Tabela detalhada de registros com opção de exclusão (local) e exportação dos dados em formato `.csv` para relatórios.
4.  **Gestão de Alertas:** Interface para configurar limites de segurança e o ID do Telegram. Ao salvar, a configuração é publicada via MQTT para o Raspberry Pi, que a salva no disco.

---

## 6. Como Rodar o Projeto

### Pré-requisitos
* Um roteador (ou Hotspot de celular) com a rede `projeto_redes` (Senha: `redesgrupo2`).
* Node.js (LTS) instalado no computador de visualização.

### 6.1. Backend (Raspberry Pi)
O sistema foi configurado para **auto-execução**.
1.  Ligue o Raspberry Pi na fonte de energia.
2.  Ele se conectará ao Wi-Fi `projeto_redes` e iniciará o serviço `iot-gateway.service` automaticamente.
3.  (Opcional) Para verificar o status, acesse via SSH e digite: `systemctl status iot-gateway.service`.

### 6.2. Sensor (D1 Mini / ESP8266)
1.  Ligue o D1 Mini em uma fonte USB.
2.  Ele se conectará ao Wi-Fi `projeto_redes` e começará a publicar dados no IP do Raspberry Pi.
    *Nota: O IP do Raspberry Pi (`192.168.X.X`) está fixado no código do firmware (`main.ino`).*

### 6.3. Frontend (Computador de Visualização)
1.  Conecte o computador à rede `projeto_redes`.
2.  Clone o repositório.
3.  No código (`frontend/src/context/MQTTContext.jsx`), atualize a variável `BROKER_URL` com o IP do Raspberry Pi (ex: `ws://192.168.43.10:9001`).
4.  Instale as dependências e inicie:
    ```bash
    cd frontend
    npm install
    npm run dev
    ```
5.  Acesse o link (`http://localhost:5173`) exibido no terminal.

---

## 7. Tópicos MQTT Utilizados

| Tópico | Publicador | Assinante(s) | Descrição |
| :--- | :--- | :--- | :--- |
| `projeto_redes/sensor/dados` | D1 Mini (ESP8266) | Backend (Python) / Frontend (React) | Leituras de sensor. |
| `projeto_redes/config/alertas` | Frontend (React) | Backend (Python) | Envio de novas regras de alerta. |

---

## 8. Autores
* LORENZO MAZZULI MARCELINO
* LUCAS LUSTOSA SIQUEIRA EMERY
* PEDRO TOJAL DE MEDEIROS
* THIAGO DE LIMA VON SOHSTEN
* HENRIQUE LEAL DA MATTA
* GABRIEL JOSÉ GALDINO LEITÃO DA COSTA
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { MQTTProvider } from './context/MQTTContext';
import Sidebar from './components/Sidebar';
import Home from './pages/Home';
import RealTime from './pages/RealTime';
import History from './pages/History';
import Alerts from './pages/Alerts';
import Network from './pages/Network';
import './App.css';

function App() {
  return (
    <MQTTProvider>
      <BrowserRouter>
        <div className="app-layout">
          <Sidebar />
          <main className="content-area">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/monitor" element={<RealTime />} />
              <Route path="/historico" element={<History />} />
              <Route path="/alertas" element={<Alerts />} />
              <Route path="/rede" element={<Network />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </MQTTProvider>
  );
}

export default App;
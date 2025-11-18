import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Activity, History, Bell, Network } from 'lucide-react';
import '../App.css';

const Sidebar = () => {
  return (
    <nav className="sidebar">
      <div className="sidebar-header">
        <h2>IoT Monitor</h2>
      </div>
      <ul className="nav-links">
        <li>
          <NavLink to="/" className={({ isActive }) => isActive ? "active" : ""}>
            <LayoutDashboard size={20} /> Home
          </NavLink>
        </li>
        <li>
          <NavLink to="/monitor" className={({ isActive }) => isActive ? "active" : ""}>
            <Activity size={20} /> Tempo Real
          </NavLink>
        </li>
        <li>
          <NavLink to="/historico" className={({ isActive }) => isActive ? "active" : ""}>
            <History size={20} /> Histórico
          </NavLink>
        </li>
        <li>
          <NavLink to="/alertas" className={({ isActive }) => isActive ? "active" : ""}>
            <Bell size={20} /> Configurar Alertas
          </NavLink>
        </li>
        <li>
            <NavLink to="/rede" className={({ isActive }) => isActive ? "active" : ""}>
              <Network size={20} /> Rede & Infra
            </NavLink>
        </li>
      </ul>
    </nav>
  );
};

export default Sidebar;
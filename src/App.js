import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

const API_BASE_URL = 'http://206.189.214.35:3000/api';

function App() {
  const [users, setUsers] = useState([]);
  const [accessLogs, setAccessLogs] = useState([]);
  const [unauthorizedAccess, setUnauthorizedAccess] = useState([]);
  const [doorStatus, setDoorStatus] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', accessCode: '', isActive: true });

  useEffect(() => {
    fetchUsers();
    fetchAccessLogs();
    fetchUnauthorizedAccess();
    fetchDoorStatus();

    const intervalId = setInterval(() => {
      fetchDoorStatus();
      fetchUnauthorizedAccess();
    }, 3000);

    return () => clearInterval(intervalId);
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/users`);
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAccessLogs = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/access/logs?limit=100`);
      setAccessLogs(response.data);
    } catch (error) {
      console.error('Error fetching access logs:', error);
    }
  };

  const fetchUnauthorizedAccess = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/access/unauthorized?limit=20`);
      setUnauthorizedAccess(response.data);
    } catch (error) {
      console.error('Error fetching unauthorized access:', error);
    }
  };

  const fetchDoorStatus = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/doors/status/realtime`);
      setDoorStatus(response.data);
    } catch (error) {
      console.error('Error fetching door status:', error);
    }
  };

  const openDoorManually = async () => {
    if (!window.confirm('¿Desea abrir la puerta manualmente?')) {
      return;
    }

    try {
      const response = await axios.post(`${API_BASE_URL}/doors/open/manual`, {
        adminName: 'Administrador Dashboard'
      });
      
      if (response.data.success) {
        alert('Puerta abierta exitosamente');
        fetchDoorStatus();
        fetchAccessLogs();
      } else {
        alert('Error al abrir puerta: ' + response.data.reason);
      }
    } catch (error) {
      console.error('Error opening door:', error);
      alert('Error al abrir puerta');
    }
  };

  const createUser = async (e) => {
    e.preventDefault();
    if (!newUser.name || !newUser.accessCode) {
      alert('Por favor complete todos los campos');
      return;
    }

    try {
      await axios.post(`${API_BASE_URL}/users`, newUser);
      setNewUser({ name: '', accessCode: '', isActive: true });
      fetchUsers();
      alert('Usuario creado exitosamente');
    } catch (error) {
      console.error('Error creating user:', error);
      alert('Error al crear usuario: ' + (error.response?.data?.error || 'Error desconocido'));
    }
  };

  const toggleUserStatus = async (userId, currentStatus) => {
    try {
      await axios.put(`${API_BASE_URL}/users/${userId}`, {
        isActive: !currentStatus
      });
      fetchUsers();
    } catch (error) {
      console.error('Error updating user:', error);
      alert('Error al actualizar usuario');
    }
  };

  const deleteUser = async (userId) => {
    if (window.confirm('¿Está seguro de que desea eliminar este usuario?')) {
      try {
        await axios.delete(`${API_BASE_URL}/users/${userId}`);
        fetchUsers();
        alert('Usuario eliminado exitosamente');
      } catch (error) {
        console.error('Error deleting user:', error);
        alert('Error al eliminar usuario');
      }
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('es-ES');
  };

  return (
    <div className="container-fluid">
      <nav className="navbar navbar-dark bg-dark mb-4">
        <div className="container-fluid">
          <span className="navbar-brand mb-0 h1">
            <i className="fas fa-lock me-2"></i>
            Dashboard Control de Acceso
          </span>
        </div>
      </nav>

      <div className="container">
        <ul className="nav nav-tabs mb-4">
          <li className="nav-item">
            <button 
              className={`nav-link ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActiveTab('dashboard')}
            >
              <i className="fas fa-tachometer-alt me-2"></i>
              Dashboard
            </button>
          </li>
          <li className="nav-item">
            <button 
              className={`nav-link ${activeTab === 'users' ? 'active' : ''}`}
              onClick={() => setActiveTab('users')}
            >
              <i className="fas fa-users me-2"></i>
              Gestión de Usuarios
            </button>
          </li>
          <li className="nav-item">
            <button 
              className={`nav-link ${activeTab === 'logs' ? 'active' : ''}`}
              onClick={() => setActiveTab('logs')}
            >
              <i className="fas fa-history me-2"></i>
              Historial de Accesos
            </button>
          </li>
        </ul>

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div>
            <div className="row mb-4">
              <div className="col-md-6">
                <div className="card">
                  <div className="card-header bg-primary text-white">
                    <h5><i className="fas fa-door-open me-2"></i>Estado de la Puerta</h5>
                  </div>
                  <div className="card-body text-center">
                    {doorStatus ? (
                      <>
                        <div className={`mb-3 p-4 rounded ${doorStatus.isOpen ? 'bg-danger' : 'bg-success'} text-white`}>
                          <i className={`fas ${doorStatus.isOpen ? 'fa-door-open' : 'fa-door-closed'} fa-4x mb-3`}></i>
                          <h3>{doorStatus.isOpen ? 'ABIERTA' : 'CERRADA'}</h3>
                        </div>
                        <p className="text-muted mb-3">
                          Última actualización: {formatDate(doorStatus.lastEventTs)}
                        </p>
                        <button 
                          className="btn btn-warning btn-lg"
                          onClick={openDoorManually}
                        >
                          <i className="fas fa-unlock-alt me-2"></i>
                          Abrir Puerta Manualmente
                        </button>
                      </>
                    ) : (
                      <div className="spinner-border" role="status">
                        <span className="visually-hidden">Cargando...</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="col-md-6">
                <div className="card">
                  <div className="card-header bg-info text-white">
                    <h5><i className="fas fa-chart-bar me-2"></i>Estadísticas</h5>
                  </div>
                  <div className="card-body">
                    <div className="row text-center">
                      <div className="col-4">
                        <div className="p-3 bg-light rounded">
                          <h2 className="text-primary">{users.filter(u => u.isActive).length}</h2>
                          <p className="mb-0">Usuarios Activos</p>
                        </div>
                      </div>
                      <div className="col-4">
                        <div className="p-3 bg-light rounded">
                          <h2 className="text-success">{accessLogs.filter(log => log.granted).length}</h2>
                          <p className="mb-0">Accesos Autorizados</p>
                        </div>
                      </div>
                      <div className="col-4">
                        <div className="p-3 bg-light rounded">
                          <h2 className="text-danger">{unauthorizedAccess.length}</h2>
                          <p className="mb-0">Accesos No Autorizados</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="row">
              <div className="col-12">
                <div className="card border-danger">
                  <div className="card-header bg-danger text-white d-flex justify-content-between align-items-center">
                    <h5 className="mb-0">
                      <i className="fas fa-exclamation-triangle me-2"></i>
                      Accesos No Autorizados Recientes
                    </h5>
                    <button 
                      className="btn btn-sm btn-outline-light"
                      onClick={fetchUnauthorizedAccess}
                    >
                      <i className="fas fa-sync-alt me-1"></i>
                      Actualizar
                    </button>
                  </div>
                  <div className="card-body">
                    {unauthorizedAccess.length === 0 ? (
                      <div className="alert alert-success">
                        <i className="fas fa-check-circle me-2"></i>
                        No hay accesos no autorizados recientes
                      </div>
                    ) : (
                      <div className="table-responsive">
                        <table className="table table-striped">
                          <thead>
                            <tr>
                              <th>Fecha y Hora</th>
                              <th>Motivo</th>
                              <th>Código Usado</th>
                              <th>Estado</th>
                            </tr>
                          </thead>
                          <tbody>
                            {unauthorizedAccess.map((log, index) => (
                              <tr key={index} className="table-danger">
                                <td>{formatDate(log.timestamp)}</td>
                                <td><strong>{log.reason}</strong></td>
                                <td><code>{log.accessCode || 'N/A'}</code></td>
                                <td>
                                  <span className="badge bg-danger">
                                    <i className="fas fa-times me-1"></i>
                                    NO AUTORIZADO
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div>
            <div className="row">
              <div className="col-md-4">
                <div className="card">
                  <div className="card-header">
                    <h5><i className="fas fa-user-plus me-2"></i>Agregar Nuevo Usuario</h5>
                  </div>
                  <div className="card-body">
                    <form onSubmit={createUser}>
                      <div className="mb-3">
                        <label className="form-label">Nombre</label>
                        <input 
                          type="text" 
                          className="form-control"
                          value={newUser.name}
                          onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                          required
                        />
                      </div>
                      <div className="mb-3">
                        <label className="form-label">Código de Acceso</label>
                        <input 
                          type="text" 
                          className="form-control"
                          value={newUser.accessCode}
                          onChange={(e) => setNewUser({...newUser, accessCode: e.target.value})}
                          required
                        />
                      </div>
                      <div className="mb-3 form-check">
                        <input 
                          type="checkbox" 
                          className="form-check-input"
                          checked={newUser.isActive}
                          onChange={(e) => setNewUser({...newUser, isActive: e.target.checked})}
                        />
                        <label className="form-check-label">Usuario Activo</label>
                      </div>
                      <button type="submit" className="btn btn-primary w-100">
                        <i className="fas fa-plus me-2"></i>Crear Usuario
                      </button>
                    </form>
                  </div>
                </div>
              </div>

              <div className="col-md-8">
                <div className="card">
                  <div className="card-header">
                    <h5><i className="fas fa-users me-2"></i>Lista de Usuarios</h5>
                  </div>
                  <div className="card-body">
                    {loading ? (
                      <div className="text-center">
                        <div className="spinner-border" role="status">
                          <span className="visually-hidden">Cargando...</span>
                        </div>
                      </div>
                    ) : (
                      <div className="table-responsive">
                        <table className="table table-striped">
                          <thead>
                            <tr>
                              <th>Nombre</th>
                              <th>Código</th>
                              <th>Estado</th>
                              <th>Acciones</th>
                            </tr>
                          </thead>
                          <tbody>
                            {users.map(user => (
                              <tr key={user._id}>
                                <td>{user.name}</td>
                                <td><code>{user.accessCode}</code></td>
                                <td>
                                  <span className={`badge ${user.isActive ? 'bg-success' : 'bg-secondary'}`}>
                                    {user.isActive ? 'Activo' : 'Inactivo'}
                                  </span>
                                </td>
                                <td>
                                  <button 
                                    className={`btn btn-sm ${user.isActive ? 'btn-warning' : 'btn-success'} me-2`}
                                    onClick={() => toggleUserStatus(user._id, user.isActive)}
                                  >
                                    <i className={`fas ${user.isActive ? 'fa-pause' : 'fa-play'} me-1`}></i>
                                    {user.isActive ? 'Desactivar' : 'Activar'}
                                  </button>
                                  <button 
                                    className="btn btn-sm btn-danger"
                                    onClick={() => deleteUser(user._id)}
                                  >
                                    <i className="fas fa-trash me-1"></i>
                                    Eliminar
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Logs Tab */}
        {activeTab === 'logs' && (
          <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h5><i className="fas fa-history me-2"></i>Historial de Accesos</h5>
              <button 
                className="btn btn-sm btn-outline-primary"
                onClick={fetchAccessLogs}
              >
                <i className="fas fa-sync-alt me-1"></i>
                Actualizar
              </button>
            </div>
            <div className="card-body">
              <div className="table-responsive">
                <table className="table table-striped">
                  <thead>
                    <tr>
                      <th>Fecha y Hora</th>
                      <th>Usuario</th>
                      <th>Código</th>
                      <th>Puerta</th>
                      <th>Estado</th>
                      <th>Motivo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {accessLogs.map((log, index) => (
                      <tr key={index}>
                        <td>{formatDate(log.timestamp)}</td>
                        <td>{log.userName || 'Desconocido'}</td>
                        <td><code>{log.accessCode}</code></td>
                        <td>{log.doorId}</td>
                        <td>
                          <span className={`badge ${log.granted ? 'bg-success' : 'bg-danger'}`}>
                            <i className={`fas ${log.granted ? 'fa-check' : 'fa-times'} me-1`}></i>
                            {log.granted ? 'Autorizado' : 'Denegado'}
                          </span>
                        </td>
                        <td>{log.reason || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;

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
  const [manualOpenInProgress, setManualOpenInProgress] = useState(false);

  useEffect(() => {
    fetchUsers();
    fetchAccessLogs();
    fetchUnauthorizedAccess();
    fetchDoorStatus();

    // Intervalo más frecuente para capturar cambios en tiempo real
    const intervalId = setInterval(() => {
      fetchDoorStatus();
      fetchUnauthorizedAccess();
      fetchAccessLogs();
    }, 2000); // Cada 2 segundos

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
      setManualOpenInProgress(true);
      const response = await axios.post(`${API_BASE_URL}/doors/open/manual`, {
        adminName: 'Administrador Dashboard'
      });
      
      // Actualizar estado inmediatamente después de enviar solicitud
      await fetchDoorStatus();
      
      if (response.data.success) {
        // Mostrar notificación de éxito
        showNotification('Puerta abierta exitosamente', 'success');
        
        // Actualizar datos
        await fetchAccessLogs();
        
        // Monitorear estado durante 10 segundos
        const monitorInterval = setInterval(async () => {
          await fetchDoorStatus();
        }, 500); // Cada 500ms durante el proceso
        
        setTimeout(() => {
          clearInterval(monitorInterval);
          setManualOpenInProgress(false);
        }, 10000); // 10 segundos
      } else {
        showNotification('Error al abrir puerta: ' + response.data.reason, 'error');
        setManualOpenInProgress(false);
      }
    } catch (error) {
      console.error('Error opening door:', error);
      showNotification('Error al abrir puerta', 'error');
      setManualOpenInProgress(false);
    }
  };

  const showNotification = (message, type) => {
    // Crear elemento de notificación
    const notification = document.createElement('div');
    notification.className = `alert alert-${type === 'success' ? 'success' : 'danger'} position-fixed top-0 start-50 translate-middle-x mt-3`;
    notification.style.zIndex = '9999';
    notification.innerHTML = `
      <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'} me-2"></i>
      ${message}
    `;
    document.body.appendChild(notification);
    
    // Remover después de 3 segundos
    setTimeout(() => {
      notification.remove();
    }, 3000);
  };

  const createUser = async (e) => {
    e.preventDefault();
    if (!newUser.name || !newUser.accessCode) {
      showNotification('Por favor complete todos los campos', 'error');
      return;
    }

    try {
      await axios.post(`${API_BASE_URL}/users`, newUser);
      setNewUser({ name: '', accessCode: '', isActive: true });
      fetchUsers();
      showNotification('Usuario creado exitosamente', 'success');
    } catch (error) {
      console.error('Error creating user:', error);
      showNotification('Error al crear usuario: ' + (error.response?.data?.error || 'Error desconocido'), 'error');
    }
  };

  const toggleUserStatus = async (userId, currentStatus) => {
    try {
      await axios.put(`${API_BASE_URL}/users/${userId}`, {
        isActive: !currentStatus
      });
      fetchUsers();
      showNotification('Usuario actualizado exitosamente', 'success');
    } catch (error) {
      console.error('Error updating user:', error);
      showNotification('Error al actualizar usuario', 'error');
    }
  };

  const deleteUser = async (userId) => {
    if (window.confirm('¿Está seguro de que desea eliminar este usuario?')) {
      try {
        await axios.delete(`${API_BASE_URL}/users/${userId}`);
        fetchUsers();
        showNotification('Usuario eliminado exitosamente', 'success');
      } catch (error) {
        console.error('Error deleting user:', error);
        showNotification('Error al eliminar usuario', 'error');
      }
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleString('es-ES', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch (error) {
      return 'Fecha inválida';
    }
  };

  const getStatusBadge = (log) => {
    if (log.status === 'apertura_manual') {
      return (
        <span className="badge bg-info">
          <i className="fas fa-hand-pointer me-1"></i>
          APERTURA MANUAL
        </span>
      );
    }
    if (log.status === 'acceso_no_autorizado') {
      return (
        <span className="badge bg-danger">
          <i className="fas fa-exclamation-triangle me-1"></i>
          NO AUTORIZADO
        </span>
      );
    }
    if (log.granted) {
      return (
        <span className="badge bg-success">
          <i className="fas fa-check me-1"></i>
          AUTORIZADO
        </span>
      );
    }
    return (
      <span className="badge bg-danger">
        <i className="fas fa-times me-1"></i>
        DENEGADO
      </span>
    );
  };

  return (
    <div className="container-fluid">
      <nav className="navbar navbar-dark bg-dark mb-4">
        <div className="container-fluid">
          <span className="navbar-brand mb-0 h1">
            <i className="fas fa-lock me-2"></i>
            Dashboard Control de Acceso
          </span>
          <div className="text-white">
            <small>
              <i className="fas fa-circle text-success me-1"></i>
              Actualización en tiempo real
            </small>
          </div>
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
                <div className="card shadow-sm">
                  <div className="card-header bg-primary text-white">
                    <h5 className="mb-0">
                      <i className="fas fa-door-open me-2"></i>
                      Estado de la Puerta
                      {manualOpenInProgress && (
                        <span className="badge bg-warning ms-2">
                          <i className="fas fa-spinner fa-spin me-1"></i>
                          En proceso
                        </span>
                      )}
                    </h5>
                  </div>
                  <div className="card-body text-center">
                    {doorStatus ? (
                      <>
                        <div className={`mb-3 p-4 rounded ${doorStatus.isOpen ? 'bg-danger' : 'bg-success'} text-white position-relative`}>
                          <i className={`fas ${doorStatus.isOpen ? 'fa-door-open' : 'fa-door-closed'} fa-4x mb-3`}></i>
                          <h2 className="mb-0">{doorStatus.isOpen ? 'ABIERTA' : 'CERRADA'}</h2>
                          {doorStatus.isOpen && (
                            <div className="position-absolute top-0 end-0 p-2">
                              <i className="fas fa-exclamation-triangle fa-2x"></i>
                            </div>
                          )}
                        </div>
                        <div className="text-muted mb-3">
                          <small>
                            <i className="fas fa-clock me-1"></i>
                            Última actualización: {formatDate(doorStatus.lastEventTs)}
                          </small>
                        </div>
                        <button 
                          className="btn btn-warning btn-lg w-100"
                          onClick={openDoorManually}
                          disabled={manualOpenInProgress}
                        >
                          {manualOpenInProgress ? (
                            <>
                              <i className="fas fa-spinner fa-spin me-2"></i>
                              Abriendo puerta...
                            </>
                          ) : (
                            <>
                              <i className="fas fa-unlock-alt me-2"></i>
                              Abrir Puerta Manualmente
                            </>
                          )}
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
                <div className="card shadow-sm">
                  <div className="card-header bg-info text-white">
                    <h5 className="mb-0">
                      <i className="fas fa-chart-bar me-2"></i>
                      Estadísticas
                    </h5>
                  </div>
                  <div className="card-body">
                    <div className="row text-center g-3">
                      <div className="col-4">
                        <div className="p-3 bg-light rounded shadow-sm">
                          <h2 className="text-primary mb-0">{users.filter(u => u.isActive).length}</h2>
                          <small className="text-muted">Usuarios Activos</small>
                        </div>
                      </div>
                      <div className="col-4">
                        <div className="p-3 bg-light rounded shadow-sm">
                          <h2 className="text-success mb-0">{accessLogs.filter(log => log.granted).length}</h2>
                          <small className="text-muted">Accesos Autorizados</small>
                        </div>
                      </div>
                      <div className="col-4">
                        <div className="p-3 bg-light rounded shadow-sm">
                          <h2 className="text-danger mb-0">{unauthorizedAccess.length}</h2>
                          <small className="text-muted">Accesos Denegados</small>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="row">
              <div className="col-12">
                <div className="card border-danger shadow-sm">
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
                        <table className="table table-hover">
                          <thead className="table-dark">
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
                                <td>
                                  <i className="fas fa-calendar-alt me-2 text-muted"></i>
                                  {formatDate(log.timestamp)}
                                </td>
                                <td>
                                  <strong>{log.reason}</strong>
                                </td>
                                <td>
                                  <code className="bg-dark text-white px-2 py-1 rounded">
                                    {log.accessCode || 'N/A'}
                                  </code>
                                </td>
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
                <div className="card shadow-sm">
                  <div className="card-header bg-success text-white">
                    <h5 className="mb-0">
                      <i className="fas fa-user-plus me-2"></i>
                      Agregar Nuevo Usuario
                    </h5>
                  </div>
                  <div className="card-body">
                    <form onSubmit={createUser}>
                      <div className="mb-3">
                        <label className="form-label fw-bold">
                          <i className="fas fa-user me-2 text-primary"></i>
                          Nombre
                        </label>
                        <input 
                          type="text" 
                          className="form-control"
                          placeholder="Ingrese el nombre"
                          value={newUser.name}
                          onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                          required
                        />
                      </div>
                      <div className="mb-3">
                        <label className="form-label fw-bold">
                          <i className="fas fa-key me-2 text-primary"></i>
                          Código de Acceso
                        </label>
                        <input 
                          type="text" 
                          className="form-control"
                          placeholder="Ingrese el código"
                          value={newUser.accessCode}
                          onChange={(e) => setNewUser({...newUser, accessCode: e.target.value})}
                          required
                        />
                      </div>
                      <div className="mb-3 form-check">
                        <input 
                          type="checkbox" 
                          className="form-check-input"
                          id="isActiveCheck"
                          checked={newUser.isActive}
                          onChange={(e) => setNewUser({...newUser, isActive: e.target.checked})}
                        />
                        <label className="form-check-label" htmlFor="isActiveCheck">
                          Usuario Activo
                        </label>
                      </div>
                      <button type="submit" className="btn btn-success w-100">
                        <i className="fas fa-plus me-2"></i>
                        Crear Usuario
                      </button>
                    </form>
                  </div>
                </div>
              </div>

              <div className="col-md-8">
                <div className="card shadow-sm">
                  <div className="card-header bg-primary text-white">
                    <h5 className="mb-0">
                      <i className="fas fa-users me-2"></i>
                      Lista de Usuarios ({users.length})
                    </h5>
                  </div>
                  <div className="card-body">
                    {loading ? (
                      <div className="text-center py-5">
                        <div className="spinner-border text-primary" role="status">
                          <span className="visually-hidden">Cargando...</span>
                        </div>
                      </div>
                    ) : (
                      <div className="table-responsive">
                        <table className="table table-hover">
                          <thead className="table-dark">
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
                                <td>
                                  <i className="fas fa-user me-2 text-muted"></i>
                                  {user.name}
                                </td>
                                <td>
                                  <code className="bg-dark text-white px-2 py-1 rounded">
                                    {user.accessCode}
                                  </code>
                                </td>
                                <td>
                                  <span className={`badge ${user.isActive ? 'bg-success' : 'bg-secondary'}`}>
                                    <i className={`fas ${user.isActive ? 'fa-check-circle' : 'fa-ban'} me-1`}></i>
                                    {user.isActive ? 'Activo' : 'Inactivo'}
                                  </span>
                                </td>
                                <td>
                                  <div className="btn-group" role="group">
                                    <button 
                                      className={`btn btn-sm ${user.isActive ? 'btn-warning' : 'btn-success'}`}
                                      onClick={() => toggleUserStatus(user._id, user.isActive)}
                                      title={user.isActive ? 'Desactivar' : 'Activar'}
                                    >
                                      <i className={`fas ${user.isActive ? 'fa-pause' : 'fa-play'}`}></i>
                                    </button>
                                    <button 
                                      className="btn btn-sm btn-danger"
                                      onClick={() => deleteUser(user._id)}
                                      title="Eliminar"
                                    >
                                      <i className="fas fa-trash"></i>
                                    </button>
                                  </div>
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
          <div className="card shadow-sm">
            <div className="card-header bg-dark text-white d-flex justify-content-between align-items-center">
              <h5 className="mb-0">
                <i className="fas fa-history me-2"></i>
                Historial de Accesos ({accessLogs.length})
              </h5>
              <button 
                className="btn btn-sm btn-outline-light"
                onClick={fetchAccessLogs}
              >
                <i className="fas fa-sync-alt me-1"></i>
                Actualizar
              </button>
            </div>
            <div className="card-body">
              <div className="table-responsive">
                <table className="table table-hover">
                  <thead className="table-dark">
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
                      <tr key={index} className={!log.granted ? 'table-danger' : ''}>
                        <td>
                          <i className="fas fa-calendar-alt me-2 text-muted"></i>
                          {formatDate(log.timestamp)}
                        </td>
                        <td>
                          <i className="fas fa-user me-2 text-muted"></i>
                          {log.userName || 'Desconocido'}
                        </td>
                        <td>
                          <code className="bg-dark text-white px-2 py-1 rounded">
                            {log.accessCode || 'N/A'}
                          </code>
                        </td>
                        <td>
                          <i className="fas fa-door-open me-2 text-muted"></i>
                          {log.doorId}
                        </td>
                        <td>{getStatusBadge(log)}</td>
                        <td>
                          {log.reason ? (
                            <small className="text-muted">{log.reason}</small>
                          ) : (
                            <span className="text-muted">-</span>
                          )}
                        </td>
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

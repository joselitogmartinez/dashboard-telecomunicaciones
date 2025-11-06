import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import './App.css';

const API_BASE_URL = 'http://206.189.214.35:3000/api';
const SOCKET_URL = 'http://206.189.214.35:3000';

function App() {
  const [users, setUsers] = useState([]);
  const [accessLogs, setAccessLogs] = useState([]);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    todayAccesses: 0,
    todayGranted: 0,
    todayDenied: 0
  });
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', accessCode: '', isActive: true });
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [mqttStatus, setMqttStatus] = useState('disconnected');
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    // Cargar datos iniciales
    fetchUsers();
    fetchAccessLogs();
    fetchStats();

    // Configurar Socket.IO con logs detallados
    console.log('🚀 Conectando a WebSocket:', SOCKET_URL);
    const socketConnection = io(SOCKET_URL, {
      transports: ['websocket', 'polling']
    });

    setSocket(socketConnection);

    // Eventos de conexión
    socketConnection.on('connect', () => {
      console.log('✅ Conectado al WebSocket:', socketConnection.id);
      console.log('🌐 Transporte:', socketConnection.io.engine.transport.name);
      setConnectionStatus('connected');
    });

    socketConnection.on('disconnect', (reason) => {
      console.log('❌ Desconectado del WebSocket. Razón:', reason);
      setConnectionStatus('disconnected');
    });

    socketConnection.on('connect_error', (error) => {
      console.error('❌ Error de conexión WebSocket:', error);
      setConnectionStatus('error');
    });

    // Eventos del sistema de acceso
    socketConnection.on('new-access-log', (log) => {
      console.log('📥 Nuevo log recibido via WebSocket:', log);
      setAccessLogs(prev => [log, ...prev.slice(0, 99)]); // Mantener solo 100 registros
      
      // Mostrar notificación visual
      showNotification(log);
    });

    // Eventos de usuarios
    socketConnection.on('user-created', (user) => {
      console.log('👤 Usuario creado:', user);
      setUsers(prev => [...prev, user]);
    });

    socketConnection.on('user-updated', (user) => {
      console.log('✏️ Usuario actualizado:', user);
      setUsers(prev => prev.map(u => u._id === user._id ? user : u));
    });

    socketConnection.on('user-deleted', (deletedUser) => {
      console.log('🗑️ Usuario eliminado:', deletedUser);
      setUsers(prev => prev.filter(u => u._id !== deletedUser._id));
    });

    // Estadísticas actualizadas
    socketConnection.on('stats-updated', (newStats) => {
      console.log('📊 Estadísticas actualizadas:', newStats);
      setStats(newStats);
    });

    // Estado del sistema
    socketConnection.on('mqtt-status', (status) => {
      console.log('📡 Estado MQTT:', status);
      setMqttStatus(status.status);
    });

    socketConnection.on('connection-status', (status) => {
      console.log('🔗 Estado de conexión:', status);
    });

    socketConnection.on('server-heartbeat', (data) => {
      console.log('💓 Heartbeat del servidor:', data);
    });

    // Eventos de sistema para debugging
    socketConnection.on('access-request-started', (data) => {
      console.log('🔄 Solicitud de acceso iniciada:', data);
    });

    socketConnection.on('door-status-changed', (data) => {
      console.log('🚪 Estado de puerta cambiado:', data);
    });

    socketConnection.on('system-error', (error) => {
      console.error('⚠️ Error del sistema:', error);
    });

    // Escuchar TODOS los eventos para debugging
    socketConnection.onAny((eventName, ...args) => {
      console.log('🔔 Evento WebSocket recibido:', eventName, args);
    });

    // Cleanup al desmontar
    return () => {
      console.log('🧹 Desconectando WebSocket...');
      socketConnection.disconnect();
    };
  }, []);

  // Mostrar notificación visual para nuevos accesos
  const showNotification = (log) => {
    const notification = document.createElement('div');
    notification.className = `alert ${log.granted ? 'alert-success' : 'alert-danger'} position-fixed`;
    notification.style.top = '20px';
    notification.style.right = '20px';
    notification.style.zIndex = '9999';
    notification.style.minWidth = '300px';
    notification.innerHTML = `
      <strong>${log.granted ? '✅ Acceso Autorizado' : '❌ Acceso Denegado'}</strong><br>
      Usuario: ${log.userName || 'Desconocido'}<br>
      Código: ${log.accessCode}<br>
      ${log.reason ? `Motivo: ${log.reason}` : ''}
    `;
    
    document.body.appendChild(notification);
    
    // Remover después de 5 segundos
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 5000);
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/users`);
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
      alert('Error al cargar usuarios');
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
      alert('Error al cargar historial de accesos');
    }
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/stats`);
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
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
    } catch (error) {
      console.error('Error updating user:', error);
      alert('Error al actualizar usuario');
    }
  };

  const deleteUser = async (userId) => {
    if (window.confirm('¿Está seguro de que desea eliminar este usuario?')) {
      try {
        await axios.delete(`${API_BASE_URL}/users/${userId}`);
        alert('Usuario eliminado exitosamente');
      } catch (error) {
        console.error('Error deleting user:', error);
        alert('Error al eliminar usuario');
      }
    }
  };

  const testWebSocket = async () => {
    try {
      const response = await axios.post(`${API_BASE_URL}/test/websocket`);
      alert('Evento WebSocket de prueba enviado. Revisa la consola.');
      console.log('Test WebSocket result:', response.data);
    } catch (error) {
      console.error('Error testing WebSocket:', error);
      alert('Error al probar WebSocket');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('es-ES');
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      connected: { class: 'bg-success', text: 'Conectado' },
      disconnected: { class: 'bg-secondary', text: 'Desconectado' },
      error: { class: 'bg-danger', text: 'Error' }
    };
    
    return statusConfig[status] || { class: 'bg-secondary', text: 'Desconocido' };
  };

  return (
    <div className="container-fluid">
      <nav className="navbar navbar-dark bg-dark mb-4">
        <div className="container-fluid">
          <span className="navbar-brand mb-0 h1">
            <i className="fas fa-lock me-2"></i>
            Dashboard Control de Acceso
          </span>
          
          {/* Estado de conexiones */}
          <div className="d-flex gap-3">
            <span className={`badge ${getStatusBadge(connectionStatus).class}`}>
              <i className="fas fa-wifi me-1"></i>
              WebSocket: {getStatusBadge(connectionStatus).text}
            </span>
            <span className={`badge ${getStatusBadge(mqttStatus).class}`}>
              <i className="fas fa-broadcast-tower me-1"></i>
              MQTT: {getStatusBadge(mqttStatus).text}
            </span>
          </div>
        </div>
      </nav>

      <div className="container">
        {/* Tabs */}
        <ul className="nav nav-tabs mb-4">
          <li className="nav-item">
            <button 
              className={`nav-link ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActiveTab('dashboard')}
            >
              <i className="fas fa-chart-bar me-2"></i>
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

        {/* Tab Content */}
        
        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div>
            {/* Estadísticas */}
            <div className="row mb-4">
              <div className="col-md-3">
                <div className="card bg-primary text-white">
                  <div className="card-body">
                    <div className="d-flex justify-content-between">
                      <div>
                        <h4>{stats.totalUsers}</h4>
                        <p className="mb-0">Usuarios Totales</p>
                      </div>
                      <i className="fas fa-users fa-2x"></i>
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-md-3">
                <div className="card bg-success text-white">
                  <div className="card-body">
                    <div className="d-flex justify-content-between">
                      <div>
                        <h4>{stats.activeUsers}</h4>
                        <p className="mb-0">Usuarios Activos</p>
                      </div>
                      <i className="fas fa-user-check fa-2x"></i>
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-md-3">
                <div className="card bg-info text-white">
                  <div className="card-body">
                    <div className="d-flex justify-content-between">
                      <div>
                        <h4>{stats.todayAccesses}</h4>
                        <p className="mb-0">Accesos Hoy</p>
                      </div>
                      <i className="fas fa-door-open fa-2x"></i>
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-md-3">
                <div className="card bg-warning text-white">
                  <div className="card-body">
                    <div className="d-flex justify-content-between">
                      <div>
                        <h4>{stats.todayDenied}</h4>
                        <p className="mb-0">Accesos Denegados Hoy</p>
                      </div>
                      <i className="fas fa-door-closed fa-2x"></i>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Últimos accesos */}
            <div className="card">
              <div className="card-header d-flex justify-content-between align-items-center">
                <h5><i className="fas fa-clock me-2"></i>Últimos Accesos (Tiempo Real)</h5>
                <button 
                  className="btn btn-sm btn-info"
                  onClick={testWebSocket}
                >
                  <i className="fas fa-test-tube me-1"></i>
                  Probar WebSocket
                </button>
              </div>
              <div className="card-body">
                <div className="table-responsive">
                  <table className="table table-sm">
                    <thead>
                      <tr>
                        <th>Hora</th>
                        <th>Usuario</th>
                        <th>Código</th>
                        <th>Estado</th>
                        <th>Motivo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {accessLogs.slice(0, 10).map((log, index) => (
                        <tr key={index}>
                          <td>{formatDate(log.timestamp)}</td>
                          <td>{log.userName || 'Desconocido'}</td>
                          <td><code>{log.accessCode}</code></td>
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
                                <td>
                                  <code>{user.accessCode}</code>
                                </td>
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
              <h5><i className="fas fa-history me-2"></i>Historial de Accesos Completo</h5>
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
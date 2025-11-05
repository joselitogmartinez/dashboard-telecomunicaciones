import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

const API_BASE_URL = 'http://localhost:3000/api';

function App() {
  const [users, setUsers] = useState([]);
  const [accessLogs, setAccessLogs] = useState([]);
  const [activeTab, setActiveTab] = useState('users');
  const [loading, setLoading] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', accessCode: '', isActive: true });

  useEffect(() => {
    fetchUsers();
    fetchAccessLogs();
  }, []);

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
        {/* Tabs */}
        <ul className="nav nav-tabs mb-4">
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
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function TecnicoPage() {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [generalSearchInput, setGeneralSearchInput] = useState('');

  // Modales
  const [activeModal, setActiveModal] = useState(null); // 'create', 'search', 'edit', 'view', 'delete'
  const [currentUser, setCurrentUser] = useState(null);
  
  // Mensajes de alerta temporales
  const [messages, setMessages] = useState([]);

  // Estados de formularios
  const [formData, setFormData] = useState({
    nombre: '',
    cedula: '',
    email: '',
    telefono: '',
    direccion: '',
    tipoServicio: '',
    observaciones: ''
  });

  const [searchCriteria, setSearchCriteria] = useState({
    searchType: 'nombre',
    searchTerm: ''
  });
  const [searchResults, setSearchResults] = useState([]);

  // Carga inicial de usuarios
  useEffect(() => {
    setLoading(true);
    setTimeout(() => {
      const initialUsers = [
        {
          id: 1,
          nombre: 'Juan Pérez',
          cedula: '12345678',
          email: 'juan@email.com',
          telefono: '3001234567',
          direccion: 'Calle 123 #45-67',
          tipoServicio: 'internet',
          observaciones: 'Cliente preferencial',
          estado: 'activo',
          fechaRegistro: new Date().toISOString()
        },
        {
          id: 2,
          nombre: 'María García',
          cedula: '87654321',
          email: 'maria@email.com',
          telefono: '3007654321',
          direccion: 'Carrera 45 #123-89',
          tipoServicio: 'television',
          observaciones: '',
          estado: 'activo',
          fechaRegistro: new Date().toISOString()
        },
        {
          id: 3,
          nombre: 'Carlos López',
          cedula: '11223344',
          email: 'carlos@email.com',
          telefono: '3009988776',
          direccion: 'Avenida 30 #67-89',
          tipoServicio: 'tecnologia',
          observaciones: 'Requiere soporte técnico',
          estado: 'inactivo',
          fechaRegistro: new Date().toISOString()
        }
      ];
      setUsers(initialUsers);
      setFilteredUsers(initialUsers);
      setLoading(false);
    }, 800);
  }, []);

  // Búsqueda en tiempo real en la tabla
  useEffect(() => {
    const term = generalSearchInput.toLowerCase();
    const result = users.filter(user => 
      user.nombre.toLowerCase().includes(term) ||
      user.cedula.toLowerCase().includes(term) ||
      user.email.toLowerCase().includes(term) ||
      user.telefono.toLowerCase().includes(term)
    );
    setFilteredUsers(result);
  }, [generalSearchInput, users]);

  const showMessage = (type, text) => {
    const id = Date.now();
    setMessages(prev => [...prev, { id, type, text }]);
    setTimeout(() => {
      setMessages(prev => prev.filter(m => m.id !== id));
    }, 5000);
  };

  const getServiceTypeLabel = (type) => {
    const labels = {
      'internet': 'Internet',
      'television': 'Televisión',
      'tecnologia': 'Tecnología',
      'electrico': 'Servicios Eléctricos'
    };
    return labels[type] || type;
  };

  const handleCreateUser = (e) => {
    e.preventDefault();
    if (users.some(u => u.cedula === formData.cedula)) {
      showMessage('error', 'Ya existe un usuario con esta cédula');
      return;
    }
    if (users.some(u => u.email === formData.email)) {
      showMessage('error', 'Ya existe un usuario con este email');
      return;
    }

    const newUser = {
      id: users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 1,
      ...formData,
      estado: 'activo',
      fechaRegistro: new Date().toISOString()
    };

    setUsers(prev => [...prev, newUser]);
    setActiveModal(null);
    setFormData({ nombre: '', cedula: '', email: '', telefono: '', direccion: '', tipoServicio: '', observaciones: '' });
    showMessage('success', 'Usuario creado exitosamente');
  };

  const handleEditUser = (e) => {
    e.preventDefault();
    if (users.some(u => u.cedula === formData.cedula && u.id !== currentUser.id)) {
      showMessage('error', 'Ya existe otro usuario con esta cédula');
      return;
    }
    if (users.some(u => u.email === formData.email && u.id !== currentUser.id)) {
      showMessage('error', 'Ya existe otro usuario con este email');
      return;
    }

    setUsers(prev => prev.map(u => u.id === currentUser.id ? { ...u, ...formData } : u));
    setActiveModal(null);
    showMessage('success', 'Usuario actualizado exitosamente');
  };

  const confirmDelete = () => {
    if (!currentUser) return;
    setUsers(prev => prev.filter(u => u.id !== currentUser.id));
    setActiveModal(null);
    setCurrentUser(null);
    showMessage('success', 'Usuario eliminado exitosamente');
  };

  const handleSearchModalSubmit = (e) => {
    e.preventDefault();
    const term = searchCriteria.searchTerm.toLowerCase();
    const res = users.filter(user => user[searchCriteria.searchType]?.toLowerCase().includes(term));
    setSearchResults(res);
  };

  return (
    <>
      {/* Header */}
      <header className="header">
        <Link href="/" className="logo">AlfaRed<span> Energia y Telecomunicaciones</span></Link>
        <nav className="navbar"></nav>
        <div className="icons">
          <div id="menu-btn" className="fas fa-bars"></div>
          <div id="info-btn" className="fas fa-info-circle"></div>
        </div>
      </header>

      {/* Main Content */}
      <div className="tecnico-container" style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
        <div className="tecnico-header" style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1><i className="fas fa-tools"></i> Sistema de Gestión de Técnicos</h1>
          <p className="subtitle" style={{ color: 'var(--light-color)' }}>Gestiona usuarios, servicios y mantenimientos de manera eficiente</p>
        </div>

        {/* Main Actions */}
        <div className="main-actions" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
          <div className="action-card" onClick={() => { setFormData({ nombre: '', cedula: '', email: '', telefono: '', direccion: '', tipoServicio: '', observaciones: '' }); setActiveModal('create'); }} style={{ background: '#fff', padding: '2rem', borderRadius: '1rem', boxShadow: 'var(--box-shadow)', cursor: 'pointer', textAlign: 'center' }}>
            <i className="fas fa-user-plus" style={{ fontSize: '3rem', color: 'var(--yellow)', marginBottom: '1rem' }}></i>
            <h3>Crear Usuario</h3>
            <p style={{ color: 'var(--light-color)', fontSize: '1.2rem' }}>Registra nuevos usuarios en el sistema con todos sus datos personales y de contacto</p>
          </div>

          <div className="action-card" onClick={() => setActiveModal('usersList')} style={{ background: '#fff', padding: '2rem', borderRadius: '1rem', boxShadow: 'var(--box-shadow)', cursor: 'pointer', textAlign: 'center' }}>
            <i className="fas fa-users" style={{ fontSize: '3rem', color: 'var(--yellow)', marginBottom: '1rem' }}></i>
            <h3>Ver Usuarios Registrados</h3>
            <p style={{ color: 'var(--light-color)', fontSize: '1.2rem' }}>Consulta la lista completa de usuarios registrados en el sistema</p>
          </div>

          <div className="action-card" onClick={() => { setSearchResults([]); setSearchCriteria({ searchType: 'nombre', searchTerm: '' }); setActiveModal('search'); }} style={{ background: '#fff', padding: '2rem', borderRadius: '1rem', boxShadow: 'var(--box-shadow)', cursor: 'pointer', textAlign: 'center' }}>
            <i className="fas fa-search" style={{ fontSize: '3rem', color: 'var(--yellow)', marginBottom: '1rem' }}></i>
            <h3>Buscar Usuario</h3>
            <p style={{ color: 'var(--light-color)', fontSize: '1.2rem' }}>Busca usuarios específicos por nombre, cédula o número de contacto</p>
          </div>
        </div>

        {/* Users Section (Se muestra si se activa o por defecto) */}
        <div className="users-section" id="usersSection" style={{ background: '#fff', padding: '2rem', borderRadius: '1rem', boxShadow: 'var(--box-shadow)' }}>
          <div className="section-header" style={{ fontSize: '1.8rem', fontWeight: 600, marginBottom: '1rem' }}>
            <i className="fas fa-users"></i> Usuarios Registrados
          </div>
          
          <div className="search-bar" style={{ marginBottom: '1.5rem' }}>
            <input 
              type="text" 
              className="search-input box" 
              value={generalSearchInput}
              onChange={(e) => setGeneralSearchInput(e.target.value)}
              placeholder="Buscar usuarios por nombre, cédula o email..." 
              style={{ width: '100%', padding: '1rem', border: '1px solid #ccc', borderRadius: '.5rem' }}
            />
          </div>
          
          {loading ? (
            <div className="loading active" style={{ textAlign: 'center', padding: '2rem' }}>
              <div className="spinner"></div>
              <p>Cargando usuarios...</p>
            </div>
          ) : (
            <div id="usersTableContainer">
              <table className="users-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '1.2rem' }}>
                <thead>
                  <tr style={{ background: '#f5f5f5' }}>
                    <th style={{ border: '1px solid #ddd', padding: '.8rem' }}>ID</th>
                    <th style={{ border: '1px solid #ddd', padding: '.8rem' }}>Nombre</th>
                    <th style={{ border: '1px solid #ddd', padding: '.8rem' }}>Cédula</th>
                    <th style={{ border: '1px solid #ddd', padding: '.8rem' }}>Email</th>
                    <th style={{ border: '1px solid #ddd', padding: '.8rem' }}>Teléfono</th>
                    <th style={{ border: '1px solid #ddd', padding: '.8rem' }}>Tipo de Servicio</th>
                    <th style={{ border: '1px solid #ddd', padding: '.8rem' }}>Estado</th>
                    <th style={{ border: '1px solid #ddd', padding: '.8rem' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan="8" style={{ textAlign: 'center', padding: '3rem', color: 'var(--light-color)' }}>No se encontraron usuarios</td>
                    </tr>
                  ) : (
                    filteredUsers.map(user => (
                      <tr key={user.id}>
                        <td style={{ border: '1px solid #ddd', padding: '.8rem' }}>{user.id}</td>
                        <td style={{ border: '1px solid #ddd', padding: '.8rem' }}>{user.nombre}</td>
                        <td style={{ border: '1px solid #ddd', padding: '.8rem' }}>{user.cedula}</td>
                        <td style={{ border: '1px solid #ddd', padding: '.8rem' }}>{user.email}</td>
                        <td style={{ border: '1px solid #ddd', padding: '.8rem' }}>{user.telefono}</td>
                        <td style={{ border: '1px solid #ddd', padding: '.8rem' }}>{getServiceTypeLabel(user.tipoServicio)}</td>
                        <td style={{ border: '1px solid #ddd', padding: '.8rem' }}>
                          <span className={`status ${user.estado}`} style={{ padding: '.3rem .6rem', borderRadius: '4px', background: user.estado === 'activo' ? '#4CAF50' : '#f44336', color: '#fff' }}>{user.estado}</span>
                        </td>
                        <td style={{ border: '1px solid #ddd', padding: '.8rem' }}>
                          <div className="action-buttons" style={{ display: 'flex', gap: '.5rem' }}>
                            <button className="btn-action btn-view" onClick={() => { setCurrentUser(user); setActiveModal('view'); }} title="Ver" style={{ padding: '.4rem .8rem', background: '#3137fd', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                              <i className="fas fa-eye"></i>
                            </button>
                            <button className="btn-action btn-edit" onClick={() => { setCurrentUser(user); setFormData(user); setActiveModal('edit'); }} title="Editar" style={{ padding: '.4rem .8rem', background: '#ff9800', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                              <i className="fas fa-edit"></i>
                            </button>
                            <button className="btn-action btn-delete" onClick={() => { setCurrentUser(user); setActiveModal('delete'); }} title="Eliminar" style={{ padding: '.4rem .8rem', background: '#f44336', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                              <i className="fas fa-trash"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Messages Container */}
        <div id="messagesContainer" style={{ position: 'fixed', bottom: '20px', right: '20px', zIndex: 1100 }}>
          {messages.map(msg => (
            <div key={msg.id} className={`message ${msg.type}`} style={{ background: msg.type === 'success' ? '#4CAF50' : '#f44336', color: '#fff', padding: '1rem 2rem', borderRadius: '.5rem', marginBottom: '.5rem', boxShadow: '0 2px 5px rgba(0,0,0,0.3)', fontSize: '1.2rem' }}>
              {msg.text}
            </div>
          ))}
        </div>
      </div>

      {/* --- MODALES --- */}

      {/* Create User Modal */}
      {activeModal === 'create' && (
        <div className="modal active" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="modal-content" style={{ background: '#fff', padding: '2rem', borderRadius: '1rem', width: '90%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2><i className="fas fa-user-plus"></i> Crear Usuario Nuevo</h2>
              <button className="close-btn" onClick={() => setActiveModal(null)} style={{ background: 'none', border: 'none', fontSize: '2rem', cursor: 'pointer' }}>&times;</button>
            </div>
            
            <form onSubmit={handleCreateUser}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label>Nombre Completo *</label>
                  <input type="text" className="box" value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} required style={{ width: '100%', padding: '.8rem', border: '1px solid #ccc', borderRadius: '.4rem' }} />
                </div>
                <div>
                  <label>Cédula *</label>
                  <input type="text" className="box" value={formData.cedula} onChange={e => setFormData({...formData, cedula: e.target.value})} required style={{ width: '100%', padding: '.8rem', border: '1px solid #ccc', borderRadius: '.4rem' }} />
                </div>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label>Correo Electrónico *</label>
                  <input type="email" className="box" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} required style={{ width: '100%', padding: '.8rem', border: '1px solid #ccc', borderRadius: '.4rem' }} />
                </div>
                <div>
                  <label>Número de Contacto *</label>
                  <input type="tel" className="box" value={formData.telefono} onChange={e => setFormData({...formData, telefono: e.target.value})} required style={{ width: '100%', padding: '.8rem', border: '1px solid #ccc', borderRadius: '.4rem' }} />
                </div>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label>Dirección *</label>
                  <input type="text" className="box" value={formData.direccion} onChange={e => setFormData({...formData, direccion: e.target.value})} required style={{ width: '100%', padding: '.8rem', border: '1px solid #ccc', borderRadius: '.4rem' }} />
                </div>
                <div>
                  <label>Tipo de Servicio *</label>
                  <select className="box" value={formData.tipoServicio} onChange={e => setFormData({...formData, tipoServicio: e.target.value})} required style={{ width: '100%', padding: '.8rem', border: '1px solid #ccc', borderRadius: '.4rem' }}>
                    <option value="">Seleccionar servicio</option>
                    <option value="internet">Internet</option>
                    <option value="television">Televisión</option>
                    <option value="tecnologia">Tecnología</option>
                    <option value="electrico">Servicios Eléctricos</option>
                  </select>
                </div>
              </div>
              
              <div style={{ marginBottom: '1rem' }}>
                <label>Observaciones</label>
                <textarea className="box" rows="3" value={formData.observaciones} onChange={e => setFormData({...formData, observaciones: e.target.value})} placeholder="Observaciones adicionales..." style={{ width: '100%', padding: '.8rem', border: '1px solid #ccc', borderRadius: '.4rem' }}></textarea>
              </div>
              
              <div style={{ textAlign: 'center', marginTop: '2rem' }}>
                <button type="submit" className="btn" style={{ padding: '1rem 2rem', background: '#3137fd', color: '#fff', border: 'none', borderRadius: '.5rem', cursor: 'pointer' }}>Crear Usuario</button>
                <button type="button" className="btn" onClick={() => setActiveModal(null)} style={{ background: '#666', color: '#fff', border: 'none', borderRadius: '.5rem', cursor: 'pointer', marginLeft: '1rem', padding: '1rem 2rem' }}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Search User Modal */}
      {activeModal === 'search' && (
        <div className="modal active" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="modal-content" style={{ background: '#fff', padding: '2rem', borderRadius: '1rem', width: '90%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2><i className="fas fa-search"></i> Buscar Usuario</h2>
              <button className="close-btn" onClick={() => setActiveModal(null)} style={{ background: 'none', border: 'none', fontSize: '2rem', cursor: 'pointer' }}>&times;</button>
            </div>
            
            <form onSubmit={handleSearchModalSubmit}>
              <div style={{ marginBottom: '1rem' }}>
                <label>Buscar por:</label>
                <select className="box" value={searchCriteria.searchType} onChange={e => setSearchCriteria({...searchCriteria, searchType: e.target.value})} style={{ width: '100%', padding: '.8rem', border: '1px solid #ccc', borderRadius: '.4rem' }}>
                  <option value="nombre">Nombre</option>
                  <option value="cedula">Cédula</option>
                  <option value="email">Email</option>
                  <option value="telefono">Teléfono</option>
                </select>
              </div>
              
              <div style={{ marginBottom: '1rem' }}>
                <label>Término de búsqueda:</label>
                <input type="text" className="box" value={searchCriteria.searchTerm} onChange={e => setSearchCriteria({...searchCriteria, searchTerm: e.target.value})} placeholder="Ingrese el término a buscar..." required style={{ width: '100%', padding: '.8rem', border: '1px solid #ccc', borderRadius: '.4rem' }} />
              </div>
              
              <div style={{ textAlign: 'center', marginTop: '2rem' }}>
                <button type="submit" className="btn" style={{ padding: '1rem 2rem', background: '#3137fd', color: '#fff', border: 'none', borderRadius: '.5rem', cursor: 'pointer' }}>Buscar</button>
                <button type="button" className="btn" onClick={() => setActiveModal(null)} style={{ background: '#666', color: '#fff', border: 'none', borderRadius: '.5rem', cursor: 'pointer', marginLeft: '1rem', padding: '1rem 2rem' }}>Cancelar</button>
              </div>
            </form>
            
            <div style={{ marginTop: '2rem' }}>
              {searchResults.length > 0 && (
                <div>
                  <h3>Resultados de la búsqueda:</h3>
                  {searchResults.map(user => (
                    <div key={user.id} style={{ background: '#eee', padding: '1rem', margin: '1rem 0', borderRadius: '.5rem' }}>
                      <h4>{user.nombre}</h4>
                      <p><strong>Cédula:</strong> {user.cedula}</p>
                      <p><strong>Email:</strong> {user.email}</p>
                      <p><strong>Teléfono:</strong> {user.telefono}</p>
                      <p><strong>Servicio:</strong> {getServiceTypeLabel(user.tipoServicio)}</p>
                      <div style={{ marginTop: '1rem', display: 'flex', gap: '.5rem' }}>
                        <button className="btn-action btn-view" onClick={() => { setCurrentUser(user); setActiveModal('view'); }} style={{ padding: '.4rem .8rem', background: '#3137fd', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Ver</button>
                        <button className="btn-action btn-edit" onClick={() => { setCurrentUser(user); setFormData(user); setActiveModal('edit'); }} style={{ padding: '.4rem .8rem', background: '#ff9800', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Editar</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {activeModal === 'edit' && currentUser && (
        <div className="modal active" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="modal-content" style={{ background: '#fff', padding: '2rem', borderRadius: '1rem', width: '90%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2><i className="fas fa-user-edit"></i> Modificar Usuario</h2>
              <button className="close-btn" onClick={() => setActiveModal(null)} style={{ background: 'none', border: 'none', fontSize: '2rem', cursor: 'pointer' }}>&times;</button>
            </div>
            
            <form onSubmit={handleEditUser}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label>Nombre Completo *</label>
                  <input type="text" className="box" value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} required style={{ width: '100%', padding: '.8rem', border: '1px solid #ccc', borderRadius: '.4rem' }} />
                </div>
                <div>
                  <label>Cédula *</label>
                  <input type="text" className="box" value={formData.cedula} onChange={e => setFormData({...formData, cedula: e.target.value})} required style={{ width: '100%', padding: '.8rem', border: '1px solid #ccc', borderRadius: '.4rem' }} />
                </div>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label>Correo Electrónico *</label>
                  <input type="email" className="box" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} required style={{ width: '100%', padding: '.8rem', border: '1px solid #ccc', borderRadius: '.4rem' }} />
                </div>
                <div>
                  <label>Número de Contacto *</label>
                  <input type="tel" className="box" value={formData.telefono} onChange={e => setFormData({...formData, telefono: e.target.value})} required style={{ width: '100%', padding: '.8rem', border: '1px solid #ccc', borderRadius: '.4rem' }} />
                </div>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label>Dirección *</label>
                  <input type="text" className="box" value={formData.direccion} onChange={e => setFormData({...formData, direccion: e.target.value})} required style={{ width: '100%', padding: '.8rem', border: '1px solid #ccc', borderRadius: '.4rem' }} />
                </div>
                <div>
                  <label>Tipo de Servicio *</label>
                  <select className="box" value={formData.tipoServicio} onChange={e => setFormData({...formData, tipoServicio: e.target.value})} required style={{ width: '100%', padding: '.8rem', border: '1px solid #ccc', borderRadius: '.4rem' }}>
                    <option value="">Seleccionar servicio</option>
                    <option value="internet">Internet</option>
                    <option value="television">Televisión</option>
                    <option value="tecnologia">Tecnología</option>
                    <option value="electrico">Servicios Eléctricos</option>
                  </select>
                </div>
              </div>
              
              <div style={{ marginBottom: '1rem' }}>
                <label>Observaciones</label>
                <textarea className="box" rows="3" value={formData.observaciones} onChange={e => setFormData({...formData, observaciones: e.target.value})} style={{ width: '100%', padding: '.8rem', border: '1px solid #ccc', borderRadius: '.4rem' }}></textarea>
              </div>
              
              <div style={{ textAlign: 'center', marginTop: '2rem' }}>
                <button type="submit" className="btn" style={{ padding: '1rem 2rem', background: '#3137fd', color: '#fff', border: 'none', borderRadius: '.5rem', cursor: 'pointer' }}>Guardar Cambios</button>
                <button type="button" className="btn" onClick={() => setActiveModal(null)} style={{ background: '#666', color: '#fff', border: 'none', borderRadius: '.5rem', cursor: 'pointer', marginLeft: '1rem', padding: '1rem 2rem' }}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View User Modal */}
      {activeModal === 'view' && currentUser && (
        <div className="modal active" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="modal-content" style={{ background: '#fff', padding: '2rem', borderRadius: '1rem', width: '90%', maxWidth: '500px' }}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2><i className="fas fa-user"></i> Información del Usuario</h2>
              <button className="close-btn" onClick={() => setActiveModal(null)} style={{ background: 'none', border: 'none', fontSize: '2rem', cursor: 'pointer' }}>&times;</button>
            </div>
            
            <div style={{ background: '#f9f9f9', padding: '1.5rem', borderRadius: '0.5rem', marginBottom: '1.5rem' }}>
              <h3 style={{ marginBottom: '1rem' }}>{currentUser.nombre}</h3>
              <p><strong>Cédula:</strong> {currentUser.cedula}</p>
              <p><strong>Email:</strong> {currentUser.email}</p>
              <p><strong>Teléfono:</strong> {currentUser.telefono}</p>
              <p><strong>Servicio:</strong> {getServiceTypeLabel(currentUser.tipoServicio)}</p>
              <p><strong>Dirección:</strong> {currentUser.direccion}</p>
              {currentUser.observaciones && <p><strong>Observaciones:</strong> {currentUser.observaciones}</p>}
              <p><strong>Estado:</strong> {currentUser.estado}</p>
            </div>
            
            <div style={{ textAlign: 'center' }}>
              <button className="btn" onClick={() => setActiveModal(null)} style={{ padding: '.8rem 1.5rem', background: '#666', color: '#fff', border: 'none', borderRadius: '.4rem', cursor: 'pointer' }}>Cerrar</button>
              <button className="btn" onClick={() => { setFormData(currentUser); setActiveModal('edit'); }} style={{ padding: '.8rem 1.5rem', background: '#ff9800', color: '#fff', border: 'none', borderRadius: '.4rem', cursor: 'pointer', marginLeft: '1rem' }}>Modificar</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {activeModal === 'delete' && currentUser && (
        <div className="modal active confirmation-modal" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="modal-content" style={{ background: '#fff', padding: '2rem', borderRadius: '1rem', width: '90%', maxWidth: '400px', textAlign: 'center' }}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ color: '#f44336' }}><i className="fas fa-exclamation-triangle"></i> Confirmar</h2>
              <button className="close-btn" onClick={() => setActiveModal(null)} style={{ background: 'none', border: 'none', fontSize: '2rem', cursor: 'pointer' }}>&times;</button>
            </div>
            
            <p style={{ fontSize: '1.4rem', margin: '1.5rem 0' }}>¿Está seguro de eliminar permanentemente al usuario <strong>{currentUser.nombre}</strong>?</p>
            
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button onClick={confirmDelete} style={{ padding: '.8rem 1.5rem', background: '#f44336', color: '#fff', border: 'none', borderRadius: '.4rem', cursor: 'pointer' }}>Sí, Eliminar</button>
              <button onClick={() => setActiveModal(null)} style={{ padding: '.8rem 1.5rem', background: '#ccc', border: 'none', borderRadius: '.4rem', cursor: 'pointer' }}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
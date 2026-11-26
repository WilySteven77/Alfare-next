'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiFetch, getStoredUsuario, refreshSessionFromServer } from '@/lib/alfaredApi';

const EMPTY_FORM = {
  nombre_completo: '',
  cedula: '',
  email: '',
  telefono: '',
  direccion: '',
  tipo_servicio: '',
  observaciones: '',
};

const SERVICE_LABELS = {
  INTERNET: 'Internet',
  TELEVISION: 'Televisión',
  TECNOLOGIA: 'Tecnología',
  ELECTRICO: 'Servicios Eléctricos',
};

const INCIDENT_TYPES = { INSTALACION: 'Instalación', SERVICIO: 'Servicio', DANO: 'Daño' };
const PRIORITY_LABELS = { ALTA: 'Alta', MEDIA: 'Media', BAJA: 'Baja' };

function normalizeUser(row) {
  return {
    ...row,
    id: row.id_cliente,
    nombre: row.nombre_completo,
    tipoServicio: row.tipo_servicio,
    estado: row.activo ? 'activo' : 'inactivo',
  };
}

export default function TecnicoPage() {
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [selected, setSelected] = useState(null);
  const [incidents, setIncidents] = useState([]);
  const [incidentType, setIncidentType] = useState('TODAS');
  const [incidentLoading, setIncidentLoading] = useState(false);
  const [incidentForm, setIncidentForm] = useState({ cliente_id: '', titular: '', tipo: 'INSTALACION', prioridad: 'MEDIA', descripcion: '', ubicacion: '' });

  const visibleUsers = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return users;
    return users.filter((user) => [
      user.nombre_completo,
      user.cedula,
      user.email,
      user.telefono,
    ].some((value) => String(value || '').toLowerCase().includes(term)));
  }, [query, users]);

  const loadUsers = async () => {
    setLoading(true);
    setError('');
    const response = await apiFetch('/tecnico/clientes', {
      __actionLabel: 'Técnico: cargar usuarios de servicio',
    });
    if (!response?.success) {
      setUsers([]);
      setError(response?.error || 'No fue posible cargar los usuarios de servicio.');
    } else {
      setUsers((response.data || []).map(normalizeUser));
    }
    setLoading(false);
  };

  const loadIncidents = async (type = incidentType) => {
    setIncidentLoading(true);
    const suffix = type === 'TODAS' ? '' : `?tipo=${type}`;
    const response = await apiFetch(`/tecnico/incidencias${suffix}`, { __actionLabel: 'Técnico: consultar cola de incidencias' });
    if (!response?.success) setError(response?.error || 'No fue posible cargar las incidencias.');
    else setIncidents(response.data || []);
    setIncidentLoading(false);
  };

  const createIncident = async (event) => {
    event.preventDefault();
    const response = await apiFetch('/tecnico/incidencias', { method: 'POST', body: JSON.stringify(incidentForm), __actionLabel: 'Técnico: registrar incidencia' });
    if (!response?.success) { setError(response?.error || 'No fue posible registrar la incidencia.'); return; }
    setMessage('Incidencia registrada correctamente.');
    setIncidentForm({ cliente_id: '', titular: '', tipo: 'INSTALACION', prioridad: 'MEDIA', descripcion: '', ubicacion: '' });
    await loadIncidents();
  };

  const takeNextIncident = async (type) => {
    const response = await apiFetch('/tecnico/incidencias/next', { method: 'POST', body: JSON.stringify({ tipo: type }), __actionLabel: `Técnico: atender siguiente incidencia ${type}` });
    if (!response?.success) { setError(response?.error || 'No hay incidencias pendientes para atender.'); return; }
    setMessage(`Incidencia #${response.data.id_incidencia} atendida correctamente.`);
    await loadIncidents();
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      const stored = getStoredUsuario();
      const session = stored ? await refreshSessionFromServer() : null;
      const current = getStoredUsuario();
      const isTechnician = Boolean(
        mounted && session?.success && current?.tipo?.toLowerCase() === 'tecnico'
      );
      if (!isTechnician) {
        router.replace('/cuenta');
        return;
      }
      setAuthorized(true);
      await loadUsers();
      await loadIncidents();
    })();
    return () => { mounted = false; };
    // La carga inicial usa deliberadamente el filtro inicial TODAS.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setModal('create');
    setError('');
  };

  const openEdit = (user) => {
    setForm({
      nombre_completo: user.nombre_completo || '',
      cedula: user.cedula || '',
      email: user.email || '',
      telefono: user.telefono || '',
      direccion: user.direccion || '',
      tipo_servicio: user.tipo_servicio || '',
      observaciones: user.observaciones || '',
    });
    setEditingId(user.id_cliente);
    setModal('edit');
    setError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    const endpoint = editingId ? `/tecnico/clientes/${editingId}` : '/tecnico/clientes';
    const response = await apiFetch(endpoint, {
      method: editingId ? 'PATCH' : 'POST',
      body: JSON.stringify(form),
      __actionLabel: editingId ? 'Técnico: actualizar usuario de servicio' : 'Técnico: crear usuario de servicio',
    });
    if (!response?.success) {
      setError(response?.error || 'El servidor rechazó la operación.');
      return;
    }
    setModal(null);
    setMessage(editingId ? 'Usuario actualizado correctamente.' : 'Usuario creado correctamente.');
    await loadUsers();
  };

  const handleDelete = async () => {
    if (!selected) return;
    const response = await apiFetch(`/tecnico/clientes/${selected.id_cliente}`, {
      method: 'DELETE',
      __actionLabel: 'Técnico: desactivar usuario de servicio',
    });
    if (!response?.success) {
      setError(response?.error || 'No fue posible retirar el usuario.');
      return;
    }
    setSelected(null);
    setModal(null);
    setMessage('Usuario retirado del listado operativo.');
    await loadUsers();
  };

  if (!authorized) return <main className="container-narrow" style={{ padding: '4rem 1rem' }}>Validando sesión técnica...</main>;

  return (
    <>
      <header className="header">
        <Link href="/" className="logo">AlfaRed<span> Gestión Técnica</span></Link>
        <nav className="navbar">
          <Link href="/">Inicio</Link>
          <Link href="/cuenta">Mi cuenta</Link>
          <Link href="/tecnico/ordenes">Mis órdenes</Link>
        </nav>
      </header>

      <main className="container-narrow" style={{ padding: '3rem 1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <h1 className="heading">Sistema de Gestión de Técnicos</h1>
            <p className="muted">Usuarios de servicio registrados en AlfaRed Energía y Telecomunicaciones.</p>
          </div>
          <button type="button" className="btn" onClick={openCreate}>Crear usuario</button>
        </div>

        {message && <p role="status" style={{ color: '#187a3d' }}>{message}</p>}
        {error && <p role="alert" style={{ color: '#b42318' }}>{error}</p>}

        <section className="card" style={{ marginTop: '1.5rem' }}>
          <div className="card-body">
            <label htmlFor="searchUsers">Buscar por nombre, cédula, correo o teléfono</label>
            <input id="searchUsers" className="box" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Escribe un término..." />
          </div>
        </section>

        <section className="card" style={{ marginTop: '1.5rem' }}>
          <div className="card-body" style={{ overflowX: 'auto' }}>
            {loading ? <p>Cargando usuarios desde el servidor...</p> : visibleUsers.length === 0 ? <p>No se encontraron usuarios de servicio.</p> : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr>
                  {['ID', 'Nombre', 'Cédula', 'Email', 'Teléfono', 'Servicio', 'Estado', 'Acciones'].map((title) => <th key={title} style={{ textAlign: 'left', padding: '.7rem', borderBottom: '1px solid #ddd' }}>{title}</th>)}
                </tr></thead>
                <tbody>
                  {visibleUsers.map((user) => <tr key={user.id_cliente}>
                    <td style={{ padding: '.7rem' }}>{user.id_cliente}</td>
                    <td style={{ padding: '.7rem' }}>{user.nombre_completo}</td>
                    <td style={{ padding: '.7rem' }}>{user.cedula}</td>
                    <td style={{ padding: '.7rem' }}>{user.email}</td>
                    <td style={{ padding: '.7rem' }}>{user.telefono}</td>
                    <td style={{ padding: '.7rem' }}>{SERVICE_LABELS[user.tipo_servicio] || user.tipo_servicio}</td>
                    <td style={{ padding: '.7rem' }}>{user.activo ? 'Activo' : 'Inactivo'}</td>
                    <td style={{ padding: '.7rem', whiteSpace: 'nowrap' }}>
                      <button type="button" className="btn" onClick={() => { setSelected(user); setModal('view'); }}>Ver</button>{' '}
                      <button type="button" className="btn" onClick={() => openEdit(user)}>Editar</button>{' '}
                      <button type="button" className="btn" onClick={() => { setSelected(user); setModal('delete'); }}>Retirar</button>
                    </td>
                  </tr>)}
                </tbody>
              </table>
            )}
          </div>
        </section>

        <section className="card" style={{ marginTop: '1.5rem' }}>
          <div className="card-body">
            <h2>Registrar incidencia</h2>
            <form onSubmit={createIncident} style={{ display: 'grid', gap: '.8rem' }}>
              <label htmlFor="incidentClient">Usuario de servicio</label>
              <select id="incidentClient" className="box" required value={incidentForm.cliente_id} onChange={(event) => setIncidentForm({ ...incidentForm, cliente_id: event.target.value })}>
                <option value="">Selecciona un usuario</option>
                {users.map((user) => <option key={user.id_cliente} value={user.id_cliente}>{user.nombre_completo} — {user.cedula}</option>)}
              </select>
              <label htmlFor="incidentTitular">Titular o contacto</label>
              <input id="incidentTitular" className="box" required value={incidentForm.titular} onChange={(event) => setIncidentForm({ ...incidentForm, titular: event.target.value })} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: '.8rem' }}>
                <div><label htmlFor="incidentType">Tipo</label><select id="incidentType" className="box" value={incidentForm.tipo} onChange={(event) => setIncidentForm({ ...incidentForm, tipo: event.target.value })}>{Object.entries(INCIDENT_TYPES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
                <div><label htmlFor="incidentPriority">Prioridad</label><select id="incidentPriority" className="box" value={incidentForm.prioridad} onChange={(event) => setIncidentForm({ ...incidentForm, prioridad: event.target.value })}>{Object.entries(PRIORITY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
              </div>
              <label htmlFor="incidentDescription">Descripción</label>
              <textarea id="incidentDescription" className="box" required value={incidentForm.descripcion} onChange={(event) => setIncidentForm({ ...incidentForm, descripcion: event.target.value })} />
              <label htmlFor="incidentLocation">Ubicación</label>
              <input id="incidentLocation" className="box" required value={incidentForm.ubicacion} onChange={(event) => setIncidentForm({ ...incidentForm, ubicacion: event.target.value })} />
              <button type="submit" className="btn">Registrar incidencia</button>
            </form>
          </div>
        </section>

        <section className="card" style={{ marginTop: '1.5rem' }}>
          <div className="card-body">
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <h2>Bandeja de incidencias</h2>
              <div><label htmlFor="incidentFilter">Cola</label>{' '}<select id="incidentFilter" value={incidentType} onChange={(event) => { const type = event.target.value; setIncidentType(type); loadIncidents(type); }}><option value="TODAS">Todas</option>{Object.entries(INCIDENT_TYPES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
            </div>
            {incidentLoading ? <p>Cargando incidencias...</p> : incidents.length === 0 ? <p>No hay incidencias pendientes en esta cola.</p> : (
              <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse' }}><thead><tr>{['ID', 'Cliente', 'Tipo', 'Prioridad', 'Descripción', 'Fecha', 'Estado'].map((title) => <th key={title} style={{ textAlign: 'left', padding: '.7rem', borderBottom: '1px solid #ddd' }}>{title}</th>)}</tr></thead><tbody>{incidents.map((incident) => <tr key={incident.id_incidencia}><td style={{ padding: '.7rem' }}>{incident.id_incidencia}</td><td style={{ padding: '.7rem' }}>{incident.nombre_cliente}</td><td style={{ padding: '.7rem' }}>{INCIDENT_TYPES[incident.tipo] || incident.tipo}</td><td style={{ padding: '.7rem' }}>{PRIORITY_LABELS[incident.prioridad] || incident.prioridad}</td><td style={{ padding: '.7rem' }}>{incident.descripcion}</td><td style={{ padding: '.7rem' }}>{new Date(incident.fecha_registro).toLocaleString()}</td><td style={{ padding: '.7rem' }}>{incident.estado}</td></tr>)}</tbody></table></div>
            )}
            <div style={{ display: 'flex', gap: '.6rem', flexWrap: 'wrap', marginTop: '1rem' }}>{Object.entries(INCIDENT_TYPES).map(([type, label]) => <button key={type} type="button" className="btn" onClick={() => takeNextIncident(type)}>Atender siguiente: {label}</button>)}</div>
          </div>
        </section>
      </main>

      {(modal === 'create' || modal === 'edit') && <div className="modal active" role="dialog" aria-modal="true" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', display: 'grid', placeItems: 'center', padding: '1rem' }}>
        <form onSubmit={handleSubmit} className="card" style={{ width: 'min(700px, 100%)', maxHeight: '90vh', overflow: 'auto' }}>
          <div className="card-body">
            <h2>{editingId ? 'Editar usuario de servicio' : 'Crear usuario de servicio'}</h2>
            {['nombre_completo', 'cedula', 'email', 'telefono', 'direccion'].map((field) => <div key={field} style={{ marginBottom: '.8rem' }}>
              <label htmlFor={field}>{field === 'nombre_completo' ? 'Nombre completo' : field[0].toUpperCase() + field.slice(1)}</label>
              <input id={field} className="box" required value={form[field]} onChange={(event) => setForm({ ...form, [field]: event.target.value })} />
            </div>)}
            <label htmlFor="tipo_servicio">Tipo de servicio</label>
            <select id="tipo_servicio" className="box" required value={form.tipo_servicio} onChange={(event) => setForm({ ...form, tipo_servicio: event.target.value })}>
              <option value="">Selecciona un tipo</option>
              {Object.entries(SERVICE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <label htmlFor="observaciones">Observaciones (opcional)</label>
            <textarea id="observaciones" className="box" value={form.observaciones} onChange={(event) => setForm({ ...form, observaciones: event.target.value })} />
            <div style={{ display: 'flex', gap: '.8rem', marginTop: '1rem' }}>
              <button type="submit" className="btn">Guardar</button>
              <button type="button" className="btn" onClick={() => setModal(null)}>Cancelar</button>
            </div>
          </div>
        </form>
      </div>}

      {modal === 'view' && selected && <div className="modal active" role="dialog" aria-modal="true" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', display: 'grid', placeItems: 'center', padding: '1rem' }}>
        <div className="card" style={{ width: 'min(600px, 100%)' }}><div className="card-body">
          <h2>Detalle del usuario</h2>
          <p><strong>Nombre:</strong> {selected.nombre_completo}</p><p><strong>Cédula:</strong> {selected.cedula}</p><p><strong>Email:</strong> {selected.email}</p><p><strong>Teléfono:</strong> {selected.telefono}</p><p><strong>Dirección:</strong> {selected.direccion}</p><p><strong>Servicio:</strong> {SERVICE_LABELS[selected.tipo_servicio] || selected.tipo_servicio}</p><p><strong>Estado:</strong> {selected.activo ? 'Activo' : 'Inactivo'}</p>
          <button type="button" className="btn" onClick={() => setModal(null)}>Cerrar</button>
        </div></div>
      </div>}

      {modal === 'delete' && selected && <div className="modal active" role="dialog" aria-modal="true" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', display: 'grid', placeItems: 'center', padding: '1rem' }}>
        <div className="card" style={{ width: 'min(500px, 100%)' }}><div className="card-body">
          <h2>Confirmar retiro</h2><p>¿Deseas retirar a <strong>{selected.nombre_completo}</strong> del listado operativo?</p>
          <button type="button" className="btn" onClick={handleDelete}>Confirmar</button>{' '}
          <button type="button" className="btn" onClick={() => setModal(null)}>Cancelar</button>
        </div></div>
      </div>}
    </>
  );
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  listOrdenesServicio,
  createOrdenServicio,
  updateOrdenServicio,
  accionOrdenServicio,
  deleteOrdenServicio,
  getStoredUsuario,
} from '@/lib/alfaredApi';

const EMPTY_FORM = {
  cliente_nombre: '',
  cliente_cedula: '',
  cliente_email: '',
  cliente_telefono: '',
  cliente_direccion: '',
  tipo_servicio: '',
  observaciones: '',
  fecha_programada: '',
};

const TIPO_LABELS = {
  INSTALACION: 'Instalación',
  REPORTE_DANO: 'Reporte de daño',
  MANTENIMIENTO: 'Mantenimiento',
  INTERNET: 'Internet',
  TELEVISION: 'Televisión',
  TECNOLOGIA: 'Tecnología',
  ELECTRICO: 'Servicios eléctricos',
};

const ESTADO_COLORS = {
  PENDIENTE: '#f39c12',
  EN_CURSO: '#3137fd',
  CERRADA: '#27ae60',
  CANCELADA: '#95a5a6',
};

export default function TecnicoPage() {
  const [ordenes, setOrdenes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [usuario, setUsuario] = useState(null);
  const [activeModal, setActiveModal] = useState(null);
  const [currentOrden, setCurrentOrden] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [notasCierre, setNotasCierre] = useState('');
  const [saving, setSaving] = useState(false);
  const [messages, setMessages] = useState([]);

  const showMessage = (type, text) => {
    const id = Date.now();
    setMessages((prev) => [...prev, { id, type, text }]);
    setTimeout(() => {
      setMessages((prev) => prev.filter((m) => m.id !== id));
    }, 4500);
  };

  const cargarOrdenes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listOrdenesServicio({
        estado: filtroEstado || undefined,
      });
      if (res && res.success) {
        setOrdenes(Array.isArray(res.data) ? res.data : []);
      } else {
        setOrdenes([]);
        showMessage('error', res?.error || 'No se pudieron cargar las órdenes.');
      }
    } catch (_) {
      setOrdenes([]);
      showMessage('error', 'Error de red al cargar órdenes.');
    } finally {
      setLoading(false);
    }
  }, [filtroEstado]);

  useEffect(() => {
    const u = getStoredUsuario();
    setUsuario(u);
  }, []);

  useEffect(() => {
    cargarOrdenes();
  }, [cargarOrdenes]);

  const esStaff = ['tecnico', 'administrador'].includes(String(usuario?.tipo || '').toLowerCase());

  const term = busqueda.trim().toLowerCase();
  const ordenesFiltradas = !term
    ? ordenes
    : ordenes.filter((o) =>
        [o.cliente_nombre, o.cliente_cedula, o.cliente_email, o.cliente_telefono, o.cliente_direccion]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(term))
      );

  const resumen = {
    pendiente: ordenesFiltradas.filter((o) => o.estado === 'PENDIENTE').length,
    enCurso: ordenesFiltradas.filter((o) => o.estado === 'EN_CURSO').length,
    cerrada: ordenesFiltradas.filter((o) => o.estado === 'CERRADA').length,
  };

  const abrirCrear = () => {
    setFormData(EMPTY_FORM);
    setCurrentOrden(null);
    setActiveModal('create');
  };

  const abrirEditar = (orden) => {
    setCurrentOrden(orden);
    setFormData({
      cliente_nombre: orden.cliente_nombre || '',
      cliente_cedula: orden.cliente_cedula || '',
      cliente_email: orden.cliente_email || '',
      cliente_telefono: orden.cliente_telefono || '',
      cliente_direccion: orden.cliente_direccion || '',
      tipo_servicio: orden.tipo_servicio || '',
      observaciones: orden.observaciones || '',
      fecha_programada: orden.fecha_programada
        ? String(orden.fecha_programada).slice(0, 10)
        : '',
    });
    setActiveModal('edit');
  };

  const abrirVer = (orden) => {
    setCurrentOrden(orden);
    setActiveModal('view');
  };

  const abrirCerrar = (orden) => {
    setCurrentOrden(orden);
    setNotasCierre('');
    setActiveModal('cerrar');
  };

  const abrirEliminar = (orden) => {
    setCurrentOrden(orden);
    setActiveModal('delete');
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...formData,
        tipo_servicio: formData.tipo_servicio,
        fecha_programada: formData.fecha_programada || null,
      };
      const res = await createOrdenServicio(payload);
      if (res && res.success) {
        showMessage('success', `Orden #${res.data.id_orden} creada.`);
        setActiveModal(null);
        await cargarOrdenes();
      } else {
        showMessage('error', res?.error || 'No se pudo crear la orden.');
      }
    } catch (_) {
      showMessage('error', 'Error de red al crear la orden.');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    if (!currentOrden) return;
    setSaving(true);
    try {
      const res = await updateOrdenServicio(currentOrden.id_orden, {
        ...formData,
        fecha_programada: formData.fecha_programada || null,
      });
      if (res && res.success) {
        showMessage('success', `Orden #${currentOrden.id_orden} actualizada.`);
        setActiveModal(null);
        await cargarOrdenes();
      } else {
        showMessage('error', res?.error || 'No se pudo actualizar.');
      }
    } catch (_) {
      showMessage('error', 'Error de red al actualizar.');
    } finally {
      setSaving(false);
    }
  };

  const handleAccion = async (orden, accion) => {
    setSaving(true);
    try {
      const extra = {};
      if (accion === 'cerrar') extra.notas_cierre = notasCierre || 'Trabajo completado';
      if (accion === 'tomar' || accion === 'iniciar') {
        if (usuario?.id_usuario) extra.tecnico_id = usuario.id_usuario;
      }
      const res = await accionOrdenServicio(orden.id_orden, accion, extra);
      if (res && res.success) {
        showMessage('success', res.message || `Orden #${orden.id_orden}: ${accion}`);
        setActiveModal(null);
        await cargarOrdenes();
      } else {
        showMessage('error', res?.error || 'No se pudo cambiar el estado.');
      }
    } catch (_) {
      showMessage('error', 'Error de red al cambiar el estado.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!currentOrden) return;
    setSaving(true);
    try {
      const res = await deleteOrdenServicio(currentOrden.id_orden);
      if (res && res.success) {
        showMessage('success', `Orden #${currentOrden.id_orden} eliminada.`);
        setActiveModal(null);
        setCurrentOrden(null);
        await cargarOrdenes();
      } else {
        showMessage('error', res?.error || 'No se pudo eliminar.');
      }
    } catch (_) {
      showMessage('error', 'Error de red al eliminar.');
    } finally {
      setSaving(false);
    }
  };

  const modalShell = (title, children) => (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
      <div style={{ background: '#fff', padding: '2rem', borderRadius: '1rem', width: '100%', maxWidth: '640px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.8rem' }}>{title}</h2>
          <button type="button" onClick={() => setActiveModal(null)} style={{ background: 'none', border: 'none', fontSize: '2rem', cursor: 'pointer' }}>&times;</button>
        </div>
        {children}
      </div>
    </div>
  );

  const formFields = (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
        <div>
          <label>Nombre del cliente *</label>
          <input className="box" required value={formData.cliente_nombre} onChange={(e) => setFormData({ ...formData, cliente_nombre: e.target.value })} style={{ width: '100%', padding: '.8rem' }} />
        </div>
        <div>
          <label>Cédula *</label>
          <input className="box" required value={formData.cliente_cedula} onChange={(e) => setFormData({ ...formData, cliente_cedula: e.target.value })} style={{ width: '100%', padding: '.8rem' }} />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
        <div>
          <label>Correo</label>
          <input type="email" className="box" value={formData.cliente_email} onChange={(e) => setFormData({ ...formData, cliente_email: e.target.value })} style={{ width: '100%', padding: '.8rem' }} />
        </div>
        <div>
          <label>Teléfono *</label>
          <input className="box" required value={formData.cliente_telefono} onChange={(e) => setFormData({ ...formData, cliente_telefono: e.target.value })} style={{ width: '100%', padding: '.8rem' }} />
        </div>
      </div>
      <div style={{ marginBottom: '1rem' }}>
        <label>Dirección *</label>
        <input className="box" required value={formData.cliente_direccion} onChange={(e) => setFormData({ ...formData, cliente_direccion: e.target.value })} style={{ width: '100%', padding: '.8rem' }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
        <div>
          <label>Tipo de servicio *</label>
          <select className="box" required value={formData.tipo_servicio} onChange={(e) => setFormData({ ...formData, tipo_servicio: e.target.value })} style={{ width: '100%', padding: '.8rem' }}>
            <option value="">Seleccionar</option>
            {Object.entries(TIPO_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
        <div>
          <label>Fecha programada</label>
          <input type="date" className="box" value={formData.fecha_programada} onChange={(e) => setFormData({ ...formData, fecha_programada: e.target.value })} style={{ width: '100%', padding: '.8rem' }} />
        </div>
      </div>
      <div style={{ marginBottom: '1rem' }}>
        <label>Observaciones / detalle</label>
        <textarea className="box" rows="3" value={formData.observaciones} onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })} style={{ width: '100%', padding: '.8rem' }} />
      </div>
    </>
  );

  return (
    <>
      <header className="header">
        <Link href="/" className="logo">AlfaRed<span> Técnico</span></Link>
        <nav className="navbar">
          <Link href="/">Inicio</Link>
          <Link href="/cuenta">Mi cuenta</Link>
          <Link href="/pqrs-gestion">Gestión PQRS</Link>
        </nav>
        <div className="icons"></div>
      </header>

      <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto', paddingTop: '8rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2.4rem' }}><i className="fas fa-tools"></i> Órdenes de servicio</h1>
          <p style={{ color: 'var(--light-color)', fontSize: '1.4rem' }}>
            Agenda de instalaciones, reportes de daño y mantenimientos
          </p>
          {usuario ? (
            <p style={{ fontSize: '1.2rem', marginTop: '.5rem' }}>
              Sesión: <strong>{usuario.nombre}</strong> ({usuario.tipo})
              {!esStaff ? (
                <span style={{ display: 'block', color: '#c0392b', marginTop: '.4rem' }}>
                  Tip: inicia sesión como <code>tecnico.demo@alfared.local</code> para asignarte órdenes.
                </span>
              ) : null}
            </p>
          ) : (
            <p style={{ fontSize: '1.2rem', color: '#c0392b' }}>
              Sin sesión. Puedes gestionar órdenes; para asignarte como técnico inicia sesión en{' '}
              <Link href="/cuenta">Mi cuenta</Link>.
            </p>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ background: '#fff', padding: '1.2rem', borderRadius: '.8rem', boxShadow: 'var(--box-shadow)', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: ESTADO_COLORS.PENDIENTE }}>{resumen.pendiente}</div>
            <div style={{ fontSize: '1.2rem' }}>Pendientes</div>
          </div>
          <div style={{ background: '#fff', padding: '1.2rem', borderRadius: '.8rem', boxShadow: 'var(--box-shadow)', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: ESTADO_COLORS.EN_CURSO }}>{resumen.enCurso}</div>
            <div style={{ fontSize: '1.2rem' }}>En curso</div>
          </div>
          <div style={{ background: '#fff', padding: '1.2rem', borderRadius: '.8rem', boxShadow: 'var(--box-shadow)', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: ESTADO_COLORS.CERRADA }}>{resumen.cerrada}</div>
            <div style={{ fontSize: '1.2rem' }}>Cerradas</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem', alignItems: 'center' }}>
          <button type="button" className="btn" onClick={abrirCrear}>+ Nueva orden</button>
          <button type="button" className="btn" onClick={cargarOrdenes} style={{ background: 'var(--light-color)' }}>Actualizar</button>
          <select
            className="box"
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            style={{ minWidth: '180px', padding: '.8rem' }}
          >
            <option value="">Todos los estados</option>
            <option value="PENDIENTE">Pendiente</option>
            <option value="EN_CURSO">En curso</option>
            <option value="CERRADA">Cerrada</option>
            <option value="CANCELADA">Cancelada</option>
          </select>
          <input
            className="box"
            placeholder="Buscar por nombre, cédula, teléfono..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            style={{ flex: '1 1 220px', padding: '.8rem' }}
          />
        </div>

        <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '1rem', boxShadow: 'var(--box-shadow)', overflowX: 'auto' }}>
          {loading ? (
            <p style={{ textAlign: 'center', padding: '2rem', fontSize: '1.4rem' }}>Cargando órdenes...</p>
          ) : ordenesFiltradas.length === 0 ? (
            <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--light-color)', fontSize: '1.4rem' }}>
              No hay órdenes. Crea la primera con “Nueva orden”.
            </p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '1.25rem' }}>
              <thead>
                <tr style={{ background: '#f5f5f5' }}>
                  <th style={{ border: '1px solid #ddd', padding: '.7rem', textAlign: 'left' }}>#</th>
                  <th style={{ border: '1px solid #ddd', padding: '.7rem', textAlign: 'left' }}>Cliente</th>
                  <th style={{ border: '1px solid #ddd', padding: '.7rem', textAlign: 'left' }}>Servicio</th>
                  <th style={{ border: '1px solid #ddd', padding: '.7rem', textAlign: 'left' }}>Estado</th>
                  <th style={{ border: '1px solid #ddd', padding: '.7rem', textAlign: 'left' }}>Técnico</th>
                  <th style={{ border: '1px solid #ddd', padding: '.7rem', textAlign: 'left' }}>Programada</th>
                  <th style={{ border: '1px solid #ddd', padding: '.7rem', textAlign: 'left' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {ordenesFiltradas.map((o) => (
                  <tr key={o.id_orden}>
                    <td style={{ border: '1px solid #ddd', padding: '.7rem' }}>{o.id_orden}</td>
                    <td style={{ border: '1px solid #ddd', padding: '.7rem' }}>
                      <strong>{o.cliente_nombre}</strong>
                      <div style={{ fontSize: '1.1rem', color: '#666' }}>{o.cliente_cedula} · {o.cliente_telefono}</div>
                    </td>
                    <td style={{ border: '1px solid #ddd', padding: '.7rem' }}>{TIPO_LABELS[o.tipo_servicio] || o.tipo_servicio}</td>
                    <td style={{ border: '1px solid #ddd', padding: '.7rem' }}>
                      <span style={{ padding: '.3rem .6rem', borderRadius: '4px', background: ESTADO_COLORS[o.estado] || '#999', color: '#fff', fontSize: '1.1rem' }}>
                        {o.estado}
                      </span>
                    </td>
                    <td style={{ border: '1px solid #ddd', padding: '.7rem' }}>{o.tecnico_nombre?.trim() || '—'}</td>
                    <td style={{ border: '1px solid #ddd', padding: '.7rem' }}>
                      {o.fecha_programada ? String(o.fecha_programada).slice(0, 10) : '—'}
                    </td>
                    <td style={{ border: '1px solid #ddd', padding: '.7rem' }}>
                      <div style={{ display: 'flex', gap: '.4rem', flexWrap: 'wrap' }}>
                        <button type="button" title="Ver" onClick={() => abrirVer(o)} style={{ padding: '.35rem .6rem', background: '#3137fd', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                          <i className="fas fa-eye"></i>
                        </button>
                        <button type="button" title="Editar" onClick={() => abrirEditar(o)} style={{ padding: '.35rem .6rem', background: '#ff9800', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                          <i className="fas fa-edit"></i>
                        </button>
                        {o.estado === 'PENDIENTE' && (
                          <button type="button" title="Iniciar" disabled={saving} onClick={() => handleAccion(o, 'iniciar')} style={{ padding: '.35rem .6rem', background: '#3498db', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                            Iniciar
                          </button>
                        )}
                        {(o.estado === 'PENDIENTE' || o.estado === 'EN_CURSO') && (
                          <button type="button" title="Cerrar" onClick={() => abrirCerrar(o)} style={{ padding: '.35rem .6rem', background: '#27ae60', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                            Cerrar
                          </button>
                        )}
                        {(o.estado === 'CERRADA' || o.estado === 'CANCELADA') && (
                          <button type="button" title="Reabrir" disabled={saving} onClick={() => handleAccion(o, 'reabrir')} style={{ padding: '.35rem .6rem', background: '#8e44ad', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                            Reabrir
                          </button>
                        )}
                        {o.estado !== 'CERRADA' && o.estado !== 'CANCELADA' && (
                          <button type="button" title="Cancelar" disabled={saving} onClick={() => handleAccion(o, 'cancelar')} style={{ padding: '.35rem .6rem', background: '#7f8c8d', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                            Cancelar
                          </button>
                        )}
                        <button type="button" title="Eliminar" onClick={() => abrirEliminar(o)} style={{ padding: '.35rem .6rem', background: '#f44336', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                          <i className="fas fa-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div style={{ position: 'fixed', bottom: '20px', right: '20px', zIndex: 1100 }}>
        {messages.map((msg) => (
          <div key={msg.id} style={{ background: msg.type === 'success' ? '#4CAF50' : '#f44336', color: '#fff', padding: '1rem 1.5rem', borderRadius: '.5rem', marginBottom: '.5rem', boxShadow: '0 2px 5px rgba(0,0,0,0.3)', fontSize: '1.2rem' }}>
            {msg.text}
          </div>
        ))}
      </div>

      {activeModal === 'create' && modalShell('Nueva orden de servicio', (
        <form onSubmit={handleCreate}>
          {formFields}
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '1.5rem' }}>
            <button type="submit" className="btn" disabled={saving}>{saving ? 'Guardando…' : 'Crear orden'}</button>
            <button type="button" className="btn" onClick={() => setActiveModal(null)} style={{ background: '#666' }}>Cancelar</button>
          </div>
        </form>
      ))}

      {activeModal === 'edit' && currentOrden && modalShell(`Editar orden #${currentOrden.id_orden}`, (
        <form onSubmit={handleEdit}>
          {formFields}
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '1.5rem' }}>
            <button type="submit" className="btn" disabled={saving}>{saving ? 'Guardando…' : 'Guardar cambios'}</button>
            <button type="button" className="btn" onClick={() => setActiveModal(null)} style={{ background: '#666' }}>Cancelar</button>
          </div>
        </form>
      ))}

      {activeModal === 'view' && currentOrden && modalShell(`Orden #${currentOrden.id_orden}`, (
        <div style={{ fontSize: '1.35rem', lineHeight: '1.8' }}>
          <p><strong>Cliente:</strong> {currentOrden.cliente_nombre}</p>
          <p><strong>Cédula:</strong> {currentOrden.cliente_cedula}</p>
          <p><strong>Email:</strong> {currentOrden.cliente_email || '—'}</p>
          <p><strong>Teléfono:</strong> {currentOrden.cliente_telefono}</p>
          <p><strong>Dirección:</strong> {currentOrden.cliente_direccion}</p>
          <p><strong>Servicio:</strong> {TIPO_LABELS[currentOrden.tipo_servicio] || currentOrden.tipo_servicio}</p>
          <p><strong>Estado:</strong> {currentOrden.estado}</p>
          <p><strong>Técnico:</strong> {currentOrden.tecnico_nombre?.trim() || 'Sin asignar'}</p>
          <p><strong>Programada:</strong> {currentOrden.fecha_programada ? String(currentOrden.fecha_programada).slice(0, 10) : '—'}</p>
          <p><strong>Creada:</strong> {currentOrden.fecha_creacion ? new Date(currentOrden.fecha_creacion).toLocaleString('es-CO') : '—'}</p>
          {currentOrden.observaciones && <p><strong>Observaciones:</strong> {currentOrden.observaciones}</p>}
          {currentOrden.notas_cierre && <p><strong>Notas de cierre:</strong> {currentOrden.notas_cierre}</p>}
          <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
            <button type="button" className="btn" onClick={() => setActiveModal(null)} style={{ background: '#666' }}>Cerrar</button>
            <button type="button" className="btn" onClick={() => abrirEditar(currentOrden)} style={{ marginLeft: '1rem', background: '#ff9800' }}>Editar</button>
          </div>
        </div>
      ))}

      {activeModal === 'cerrar' && currentOrden && modalShell(`Cerrar orden #${currentOrden.id_orden}`, (
        <div>
          <p style={{ fontSize: '1.3rem', marginBottom: '1rem' }}>
            Cliente: <strong>{currentOrden.cliente_nombre}</strong> — {TIPO_LABELS[currentOrden.tipo_servicio]}
          </p>
          <label>Notas de cierre</label>
          <textarea
            className="box"
            rows="3"
            value={notasCierre}
            onChange={(e) => setNotasCierre(e.target.value)}
            placeholder="Resumen del trabajo realizado..."
            style={{ width: '100%', padding: '.8rem', marginBottom: '1rem' }}
          />
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <button type="button" className="btn" disabled={saving} onClick={() => handleAccion(currentOrden, 'cerrar')} style={{ background: '#27ae60' }}>
              {saving ? 'Cerrando…' : 'Confirmar cierre'}
            </button>
            <button type="button" className="btn" onClick={() => setActiveModal(null)} style={{ background: '#666' }}>Cancelar</button>
          </div>
        </div>
      ))}

      {activeModal === 'delete' && currentOrden && modalShell('Eliminar orden', (
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '1.4rem', marginBottom: '1.5rem' }}>
            ¿Eliminar permanentemente la orden <strong>#{currentOrden.id_orden}</strong> de{' '}
            <strong>{currentOrden.cliente_nombre}</strong>?
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <button type="button" disabled={saving} onClick={handleDelete} style={{ padding: '.8rem 1.5rem', background: '#f44336', color: '#fff', border: 'none', borderRadius: '.4rem', cursor: 'pointer' }}>
              Sí, eliminar
            </button>
            <button type="button" onClick={() => setActiveModal(null)} style={{ padding: '.8rem 1.5rem', background: '#ccc', border: 'none', borderRadius: '.4rem', cursor: 'pointer' }}>
              Cancelar
            </button>
          </div>
        </div>
      ))}
    </>
  );
}

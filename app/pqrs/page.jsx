'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createPqrs, getPqrsPorUsuarioPublico, getStoredUsuario } from '@/lib/alfaredApi';

export default function PqrsPage() {
  // Estados para el formulario de registro de PQRS
  const [userId, setUserId] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [type, setType] = useState('');
  const [message, setMessage] = useState('');
  const [formResult, setFormResult] = useState('');

  // Estados para "Mis PQRS"
  const [misPqrsList, setMisPqrsList] = useState([]);
  const [mostrarMisPqrs, setMostrarMisPqrs] = useState(false);

  // Estados para reabrir PQRS
  const [reabrirId, setReabrirId] = useState('');
  const [reabrirUserId, setReabrirUserId] = useState('');
  const [reabrirMotivo, setReabrirMotivo] = useState('');
  const [reabrirResult, setReabrirResult] = useState('');

  // Sesión de cliente simulada
  const [sesionClienteActiva, setSesionClienteActiva] = useState(false);

  useEffect(() => {
    const usuarioGuardado = sessionStorage.getItem('alfared_usuario');
    if (usuarioGuardado) {
      try {
        const u = JSON.parse(usuarioGuardado);
        if (u && u.id_usuario && u.tipo?.toLowerCase() === 'cliente') {
          setUserId(u.id_usuario);
          setSesionClienteActiva(true);
          setMostrarMisPqrs(true);
        }
      } catch (_) {}
    }
  }, []);

  const limpiarFormulario = () => {
    setUserId('');
    setName('');
    setEmail('');
    setPhone('');
    setType('');
    setMessage('');
    setFormResult('');
  };

  const handleSubmitPqrs = async (e) => {
    e.preventDefault();
    setFormResult('Enviando solicitud...');

    try {
      const res = await createPqrs(type, message, parseInt(userId, 10));
      if (res && res.success) {
        setFormResult(`¡PQRS registrada con éxito! Radicado: ${res.data.id_pqrs || ''} • Estado inicial: ${res.data.estado || ''}`);
        setMostrarMisPqrs(true);
      } else if (res && res.code === 'USER_NOT_FOUND') {
        setFormResult('El ID de usuario no existe. Corrige el ID e intenta de nuevo.');
      } else {
        setFormResult(res?.error || 'No se pudo registrar la PQRS. Inténtalo más tarde.');
      }
    } catch (err) {
      setFormResult('Error de red al registrar la PQRS.');
    }
  };

  const cargarMisPqrs = async () => {
    const uid = parseInt(userId, 10);
    if (!uid || Number.isNaN(uid)) {
      alert('Por favor ingresa o rellena tu ID de usuario.');
      return;
    }
    try {
      const res = await getPqrsPorUsuarioPublico(uid);
      if (!res || res.success === false) {
        if (res && res.code === 'USER_NOT_FOUND') {
          alert('El ID de usuario no existe.');
        } else {
          alert(res?.error || 'No se pudieron cargar las PQRS.');
        }
        setMisPqrsList([]);
        return;
      }
      setMisPqrsList(res.data || []);
    } catch (err) {
      alert('Error de red al cargar las PQRS.');
    }
  };

  const handleReabrirPqrs = () => {
    if (!reabrirId || !reabrirUserId || !reabrirMotivo.trim()) {
      setReabrirResult('Completa ID PQRS, tu ID de usuario y el motivo.');
      return;
    }
    // Simulación de reapertura
    setReabrirResult(`PQRS #${reabrirId} reabierta con éxito. Estado: ABIERTO. El equipo será notificado.`);
  };

  return (
    <>
      <header className="header">
        <Link href="/" className="logo">AlfaRed<span> PQRS</span></Link>
        <nav className="navbar">
          <Link href="/">Inicio</Link>
          <Link href="/pagos">Pagos</Link>
          <Link href="/cuenta">Mi cuenta</Link>
          <Link href="/pqrs-gestion">Gestión PQRS</Link>
        </nav>
        <div className="icons"></div>
      </header>

      <main style={{ paddingBottom: '4rem' }}>
        <section style={{ paddingTop: '3rem' }}>
          <div className="container-narrow">
            
            {/* Banner Sesión Cliente */}
            <div id="bannerSesionCliente" className="card" style={{ display: sesionClienteActiva ? 'block' : 'none', marginBottom: '1rem' }}>
              <div className="card-body">
                <p style={{ fontSize: '1.35rem', margin: 0 }}>
                  Sesión como <strong>cliente</strong>: tu ID de usuario se rellenó automáticamente.{' '}
                  <Link href="/cuenta">Gestionar cuenta</Link>
                </p>
              </div>
            </div>

            <div className="card">
              <div className="card-body">
                <h1 className="heading">PQRS</h1>
                <p className="muted" style={{ fontSize: '1.5rem' }}>
                  Registra tu solicitud con un ID de usuario válido. El sistema valida campos obligatorios y asigna estado inicial al crear la PQRS.
                </p>
              </div>
            </div>

            <div className="spacer-md"></div>

            {/* Formulario Enviar Solicitud */}
            <div className="card">
              <div className="card-body">
                <h3>Enviar solicitud</h3>
                <p className="muted" style={{ fontSize: '1.4rem', lineHeight: '2', padding: '1rem 0' }}>Nombre, correo, tipo y mensaje son obligatorios.</p>
                <form onSubmit={handleSubmitPqrs} className="pqrs-form">
                  <div className="form-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: '1rem' }}>
                    <div>
                      <label style={{ fontSize: '1.4rem', display: 'block', marginBottom: '.5rem' }}>ID Usuario</label>
                      <input 
                        type="number" 
                        id="pqrsUserId" 
                        className="box" 
                        placeholder="Ej: 101" 
                        value={userId}
                        onChange={(e) => setUserId(e.target.value)}
                        required 
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '1.4rem', display: 'block', marginBottom: '.5rem' }}>Nombre completo</label>
                      <input 
                        type="text" 
                        id="pqrsName" 
                        className="box" 
                        placeholder="Tu nombre" 
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required 
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '1.4rem', display: 'block', marginBottom: '.5rem' }}>Correo</label>
                      <input 
                        type="email" 
                        id="pqrsEmail" 
                        className="box" 
                        placeholder="tu@correo.com" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required 
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '1.4rem', display: 'block', marginBottom: '.5rem' }}>Celular</label>
                      <input 
                        type="tel" 
                        id="pqrsPhone" 
                        className="box" 
                        placeholder="300 000 0000" 
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '1.4rem', display: 'block', marginBottom: '.5rem' }}>Tipo</label>
                      <select 
                        id="pqrsType" 
                        className="box" 
                        value={type}
                        onChange={(e) => setType(e.target.value)}
                        required
                      >
                        <option value="">Selecciona tipo</option>
                        <option value="PETICION">PETICION</option>
                        <option value="QUEJA">QUEJA</option>
                        <option value="RECLAMO">RECLAMO</option>
                        <option value="SUGERENCIA">SUGERENCIA</option>
                      </select>
                    </div>
                  </div>
                  <div style={{ marginTop: '1rem' }}>
                    <label style={{ fontSize: '1.4rem', display: 'block', marginBottom: '.5rem' }}>Mensaje</label>
                    <textarea 
                      id="pqrsMessage" 
                      className="box" 
                      rows="6" 
                      placeholder="Cuéntanos los detalles" 
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      required
                    ></textarea>
                  </div>
                  <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    <button type="submit" className="btn">Enviar PQRS</button>
                    <button type="button" id="pqrsClear" className="btn" onClick={limpiarFormulario} style={{ background: 'var(--light-color)' }}>Limpiar</button>
                  </div>
                  {formResult && <div id="pqrsResult" style={{ marginTop: '1rem', fontSize: '1.4rem', color: '#27ae60' }}>{formResult}</div>}
                </form>
              </div>
            </div>

            <div className="spacer-md"></div>

            {/* Listado Mis PQRS */}
            <div id="misPqrsCard" className="card" style={{ display: mostrarMisPqrs ? 'block' : 'none' }}>
              <div className="card-body">
                <h3>Mis PQRS</h3>
                <p className="muted" style={{ fontSize: '1.3rem' }}>Listado según tu ID de usuario (mismo criterio que la consulta de facturas).</p>
                <div style={{ marginBottom: '1rem' }}>
                  <button type="button" id="btnCargarMisPqrs" className="btn" onClick={cargarMisPqrs}>Actualizar listado</button>
                </div>
                <div id="misPqrsBody">
                  {misPqrsList.length > 0 && (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '1.25rem', marginTop: '1rem' }}>
                      <thead>
                        <tr style={{ background: '#f5f5f5' }}>
                          <th style={{ border: 'var(--border)', padding: '.5rem', textAlign: 'left' }}>ID</th>
                          <th style={{ border: 'var(--border)', padding: '.5rem', textAlign: 'left' }}>Tipo</th>
                          <th style={{ border: 'var(--border)', padding: '.5rem', textAlign: 'left' }}>Mensaje</th>
                          <th style={{ border: 'var(--border)', padding: '.5rem', textAlign: 'left' }}>Estado</th>
                          <th style={{ border: 'var(--border)', padding: '.5rem', textAlign: 'left' }}>Fecha</th>
                        </tr>
                      </thead>
                      <tbody>
                        {misPqrsList.map(item => (
                          <tr key={item.id}>
                            <td style={{ border: 'var(--border)', padding: '.5rem' }}>{item.id}</td>
                            <td style={{ border: 'var(--border)', padding: '.5rem' }}>{item.tipo}</td>
                            <td style={{ border: 'var(--border)', padding: '.5rem' }}>{item.mensaje}</td>
                            <td style={{ border: 'var(--border)', padding: '.5rem' }}>{item.estado}</td>
                            <td style={{ border: 'var(--border)', padding: '.5rem' }}>{item.fecha}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>

            <div className="spacer-md"></div>

            {/* Reabrir PQRS cerrada */}
            <div className="card">
              <div className="card-body">
                <h3>Reabrir PQRS cerrada</h3>
                <p className="muted" style={{ fontSize: '1.3rem' }}>Si tu caso figura como CERRADO y no estás conforme, indica el ID de la PQRS, tu mismo ID de usuario y el motivo.</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: '1rem', marginTop: '1rem' }}>
                  <div>
                    <label style={{ fontSize: '1.3rem', display: 'block' }}>ID PQRS</label>
                    <input 
                      type="number" 
                      id="reabrirPqrsId" 
                      className="box" 
                      value={reabrirId}
                      onChange={(e) => setReabrirId(e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '1.3rem', display: 'block' }}>Tu ID usuario</label>
                    <input 
                      type="number" 
                      id="reabrirUserId" 
                      className="box" 
                      value={reabrirUserId}
                      onChange={(e) => setReabrirUserId(e.target.value)}
                    />
                  </div>
                </div>
                <div style={{ marginTop: '1rem' }}>
                  <label style={{ fontSize: '1.3rem', display: 'block' }}>Motivo de insatisfacción</label>
                  <textarea 
                    id="reabrirMotivo" 
                    className="box" 
                    rows="3" 
                    placeholder="Describe por qué solicitas reapertura"
                    value={reabrirMotivo}
                    onChange={(e) => setReabrirMotivo(e.target.value)}
                  ></textarea>
                </div>
                <div style={{ marginTop: '1rem' }}>
                  <button type="button" id="btnReabrirPqrs" className="btn" onClick={handleReabrirPqrs}>Solicitar reapertura</button>
                </div>
                {reabrirResult && <div id="reabrirResult" className="muted" style={{ marginTop: '1rem', fontSize: '1.3rem', color: '#2980b9' }}>{reabrirResult}</div>}
              </div>
            </div>

          </div>
        </section>
      </main>
    </>
  );
}
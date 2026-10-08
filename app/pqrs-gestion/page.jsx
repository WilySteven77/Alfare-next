'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { login, logout, getPqrsTodas, tomarPqrs, cerrarPqrs, getStoredUsuario, refreshSessionFromServer } from '@/lib/alfaredApi';

export default function PqrsGestionPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginMsg, setLoginMsg] = useState('');
  const [pqrsList, setPqrsList] = useState([]);
  // Verificar sesión activa al montar el componente
  useEffect(() => {
    const checkSession = async () => {
      if (!getStoredUsuario()) {
        return;
      }
      const res = await refreshSessionFromServer();
      if (res && res.success) {
        const u = getStoredUsuario();
        if (u && ['administrador', 'contador', 'tecnico'].includes(u.tipo?.toLowerCase())) {
          setIsLoggedIn(true);
          await cargarBandejaPqrs();
        }
      }
    };
    checkSession();
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginMsg('Verificando credenciales...');

    const res = await login(email, password);
    if (res && res.success) {
      const u = getStoredUsuario();
      if (u && ['administrador', 'contador', 'tecnico'].includes(u.tipo?.toLowerCase())) {
        setIsLoggedIn(true);
        await cargarBandejaPqrs();
      } else {
        setLoginMsg('Solo cuentas de personal (admin, técnico, contador) pueden acceder aquí.');
      }
    } else {
      setLoginMsg(res?.error || 'Credenciales incorrectas.');
    }
  };

  const cargarBandejaPqrs = async () => {
    setPqrsList([]);
    try {
      const res = await getPqrsTodas();
      if (res && res.success && Array.isArray(res.data)) {
        setPqrsList(res.data);
      } else {
        setPqrsList([]);
      }
    } catch (err) {
      setPqrsList([]);
    }
  };

  const tomarCaso = async (id) => {
    try {
      const res = await tomarPqrs(id);
      if (res && res.success) {
        await cargarBandejaPqrs();
      }
    } catch (err) {}
  };

  const cerrarCaso = async (id) => {
    const respuesta = prompt('Ingrese la respuesta final para cerrar este caso:');
    if (!respuesta || !respuesta.trim()) return;
    try {
      const res = await cerrarPqrs(id, respuesta.trim());
      if (res && res.success) {
        await cargarBandejaPqrs();
      }
    } catch (err) {}
  };

  const handleLogout = () => {
    logout();
    setIsLoggedIn(false);
    setEmail('');
    setPassword('');
    setPqrsList([]);
  };

  return (
    <>
      <header className="header">
        <Link href="/" className="logo">AlfaRed<span> Gestión PQRS</span></Link>
        <nav className="navbar">
          <Link href="/">Inicio</Link>
          <Link href="/pqrs">PQRS cliente</Link>
          <Link href="/pagos">Pagos</Link>
          <Link href="/cuenta">Mi cuenta</Link>
        </nav>
        <div className="icons"></div>
      </header>

      <main style={{ paddingBottom: '4rem' }}>
        <section style={{ paddingTop: '3rem' }}>
          <div className="container-narrow">
            
            {/* Panel de Login para Personal */}
            {!isLoggedIn ? (
              <div className="card" id="loginCard">
                <div className="card-body">
                  <h1 className="heading">Acceso personal</h1>
                  <p className="muted" style={{ fontSize: '1.4rem' }}>
                    Inicia sesión con una cuenta de administrador, contador o técnico para ver todas las PQRS, tomar casos y cerrar con respuesta final.
                    También puedes entrar desde <Link href="/cuenta">Mi cuenta</Link>. Tras ejecutar <code>npm run seed</code> en el proyecto, usa las cuentas demo (admin / técnico / contador) indicadas en esa página;
                  </p>
                  <form onSubmit={handleLogin} id="staffLoginForm" style={{ marginTop: '1rem', maxWidth: '400px' }}>
                    <label style={{ display: 'block', marginBottom: '.3rem' }}>Correo</label>
                    <input 
                      type="email" 
                      id="staffEmail" 
                      className="box" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required 
                    />
                    <label style={{ display: 'block', margin: '.8rem 0 .3rem' }}>Contraseña</label>
                    <input 
                      type="password" 
                      id="staffPass" 
                      className="box" 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required 
                    />
                    <div style={{ marginTop: '1rem' }}>
                      <button type="submit" className="btn">Ingresar</button>
                    </div>
                  </form>
                  {loginMsg && <p id="loginMsg" className="muted" style={{ marginTop: '1rem', color: '#c0392b' }}>{loginMsg}</p>}
                </div>
              </div>
            ) : (
              /* Panel de Gestión / Bandeja PQRS */
              <div id="gestionPanel">
                <div className="card">
                  <div className="card-body">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                      <h2 className="heading">PQRS — bandeja</h2>
                      <button type="button" id="btnLogoutStaff" className="btn" onClick={handleLogout} style={{ background: 'var(--light-color)' }}>Cerrar sesión</button>
                    </div>
                    <p className="muted" style={{ fontSize: '1.3rem' }}>Tomar (NUEVO/PENDIENTE → EN_PROCESO). Cerrar solo con respuesta final (EN_PROCESO → CERRADO).</p>
                    
                    <div id="tablaPqrsStaff" style={{ marginTop: '1rem', overflowX: 'auto' }}>
                      {pqrsList.length > 0 ? (
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '1.25rem' }}>
                          <thead>
                            <tr style={{ background: '#f5f5f5' }}>
                              <th style={{ border: 'var(--border)', padding: '.5rem', textAlign: 'left' }}>ID</th>
                              <th style={{ border: 'var(--border)', padding: '.5rem', textAlign: 'left' }}>Usuario</th>
                              <th style={{ border: 'var(--border)', padding: '.5rem', textAlign: 'left' }}>Tipo</th>
                              <th style={{ border: 'var(--border)', padding: '.5rem', textAlign: 'left' }}>Mensaje</th>
                              <th style={{ border: 'var(--border)', padding: '.5rem', textAlign: 'left' }}>Estado</th>
                              <th style={{ border: 'var(--border)', padding: '.5rem', textAlign: 'left' }}>Acciones</th>
                            </tr>
                          </thead>
                          <tbody>
                            {pqrsList.map(item => (
                              <tr key={item.id}>
                                <td style={{ border: 'var(--border)', padding: '.5rem' }}>{item.id}</td>
                                <td style={{ border: 'var(--border)', padding: '.5rem' }}>{item.usuarioId}</td>
                                <td style={{ border: 'var(--border)', padding: '.5rem' }}>{item.tipo}</td>
                                <td style={{ border: 'var(--border)', padding: '.5rem' }}>{item.mensaje}</td>
                                <td style={{ border: 'var(--border)', padding: '.5rem' }}><strong>{item.estado}</strong></td>
                                <td style={{ border: 'var(--border)', padding: '.5rem', display: 'flex', gap: '.5rem' }}>
                                  {item.estado === 'NUEVO' && (
                                    <button className="btn" onClick={() => tomarCaso(item.id)} style={{ fontSize: '1.1rem', padding: '.4rem .8rem' }}>Tomar caso</button>
                                  )}
                                  {item.estado === 'EN_PROCESO' && (
                                    <button className="btn" onClick={() => cerrarCaso(item.id)} style={{ fontSize: '1.1rem', padding: '.4rem .8rem', background: '#27ae60' }}>Cerrar caso</button>
                                  )}
                                  {item.estado === 'CERRADO' && (
                                    <span style={{ fontSize: '1.1rem', color: '#666' }}>Finalizado</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <p className="muted">No hay PQRS registradas en la bandeja. </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>
        </section>
      </main>
    </>
  );
}
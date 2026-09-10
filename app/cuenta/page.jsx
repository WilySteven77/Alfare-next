'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { login, register, refreshSessionFromServer, getStoredUsuario, logout, getToken } from '@/lib/alfaredApi';

export default function CuentaPage() {
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [regNombre, setRegNombre] = useState('');
  const [regApellido, setRegApellido] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPass, setRegPass] = useState('');
  const [sesionActiva, setSesionActiva] = useState(false);
  const [usuario, setUsuario] = useState(null);
  const [loginMsg, setLoginMsg] = useState('');
  const [regMsg, setRegMsg] = useState('');

  useEffect(() => {
    const u = getStoredUsuario();
    const token = getToken();
    if (token && u) {
      setUsuario(u);
      setSesionActiva(true);
    }
  }, []);

  useEffect(() => {
    const sync = async () => {
      if (!getToken()) return;
      const res = await refreshSessionFromServer();
      if (res && res.success) {
        const u = getStoredUsuario();
        setUsuario(u);
        setSesionActiva(true);
      } else if (res && res.code === 'INVALID_TOKEN') {
        logout();
        setSesionActiva(false);
        setUsuario(null);
      }
    };
    sync();
  }, []);

  const staffPuedeGestion = (tipo) => {
    return ['administrador', 'contador', 'tecnico'].includes((tipo || '').toLowerCase());
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginMsg('Verificando credenciales...');
    const res = await login(loginEmail, loginPass);
    if (res && res.success) {
      const u = getStoredUsuario();
      setUsuario(u);
      setSesionActiva(true);
      setLoginMsg('Bienvenido.');
    } else {
      setLoginMsg(res?.error || 'No se pudo iniciar sesión.');
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    const res = await register({ nombre: regNombre, apellido: regApellido, email: regEmail, contrasena: regPass });
    if (res && res.success) {
      setRegMsg('Cuenta creada. Ya puedes iniciar sesión.');
      setRegNombre('');
      setRegApellido('');
      setRegEmail('');
      setRegPass('');
    } else if (res && res.code === 'EMAIL_EXISTS') {
      setRegMsg('Ese correo ya está registrado.');
    } else {
      setRegMsg(res?.error || 'No se pudo registrar.');
    }
  };

  const handleLogout = () => {
    logout();
    setSesionActiva(false);
    setUsuario(null);
  };

  return (
    <>
      <header className="header">
        <Link href="/" className="logo">AlfaRed<span> Mi cuenta</span></Link>
        <nav className="navbar">
          <Link href="/">Inicio</Link>
          <Link href="/pagos">Pagos</Link>
          <Link href="/pqrs">PQRS</Link>
          <Link href="/pqrs-gestion">Gestión PQRS</Link>
        </nav>
        <div className="icons"></div>
      </header>

      <main style={{ paddingBottom: '4rem' }}>
        <section style={{ paddingTop: '3rem' }}>
          <div className="container-narrow">
            <div className="card" id="panelSesion" style={{ display: sesionActiva ? 'block' : 'none' }}>
              <div className="card-body">
                <h2 className="heading">Sesión activa</h2>
                <p id="sesionDetalle" style={{ fontSize: '1.4rem', lineHeight: '1.8' }}>
                  <strong>Nombre:</strong> {usuario?.nombre || ''} {usuario?.apellido || ''}<br/>
                  <strong>Correo:</strong> {usuario?.email}<br/>
                  <strong>ID usuario:</strong> {usuario?.id_usuario}<br/>
                  <strong>Rol:</strong> {usuario?.tipo}
                </p>
                <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  <Link id="linkGestion" href="/pqrs-gestion" className="btn" style={{ display: staffPuedeGestion(usuario?.tipo) ? 'inline-block' : 'none' }}>Ir a gestión PQRS</Link>
                  <button type="button" id="btnCerrarSesion" className="btn" onClick={handleLogout}>Cerrar sesión</button>
                </div>
                <p className="muted" style={{ fontSize: '1.2rem', marginTop: '1rem' }}>
                  Las páginas <strong>Pagos</strong> y <strong>PQRS</strong> siguen funcionando sin sesión para consultas por ID.
                  Con sesión de <strong>cliente</strong> se rellena tu ID automáticamente y puedes usar listados protegidos donde aplique.
                </p>
              </div>
            </div>

            <div className="spacer-md"></div>

            <div className="card" id="panelLogin" style={{ display: sesionActiva ? 'none' : 'block' }}>
              <div className="card-body">
                <h2 className="heading">Iniciar sesión</h2>
                <form id="formLogin" onSubmit={handleLoginSubmit}>
                  <label style={{ fontSize: '1.3rem', display: 'block', marginBottom: '.3rem' }}>Correo</label>
                  <input type="email" id="loginEmail" className="box" required autoComplete="username"
                    value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} />
                  <label style={{ fontSize: '1.3rem', display: 'block', margin: '.8rem 0 .3rem' }}>Contraseña</label>
                  <input type="password" id="loginPass" className="box" required autoComplete="current-password"
                    value={loginPass} onChange={(e) => setLoginPass(e.target.value)} />
                  <div style={{ marginTop: '1rem' }}>
                    <button type="submit" className="btn">Entrar</button>
                  </div>
                </form>
                {loginMsg && <p id="loginMsg" className="muted" style={{ marginTop: '1rem', color: '#c0392b' }}>{loginMsg}</p>}
                <p className="muted" style={{ fontSize: '1.2rem', marginTop: '1rem' }}>
                  Cuentas demo (tras <code>npm run seed</code>):<br />
                  <strong>admin.demo@alfared.local</strong>, <strong>tecnico.demo@alfared.local</strong>,
                  <strong>contador.demo@alfared.local</strong> &mdash; misma contraseña por defecto (<code>alfared2024</code>).
                </p>
              </div>
            </div>

            <div className="spacer-md"></div>

            <div className="card" id="panelRegistro" style={{ display: sesionActiva ? 'none' : 'block' }}>
              <div className="card-body">
                <h2 className="heading">Crear cuenta (cliente)</h2>
                <p className="muted" style={{ fontSize: '1.3rem' }}>Solo se registra el rol <strong>cliente</strong>. Personal interno lo crea el administrador en BD.</p>
                <form id="formRegistro" onSubmit={handleRegisterSubmit}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: '1rem' }}>
                    <div>
                      <label style={{ fontSize: '1.3rem' }}>Nombre</label>
                      <input type="text" id="regNombre" className="box" required
                        value={regNombre} onChange={(e) => setRegNombre(e.target.value)} />
                    </div>
                    <div>
                      <label style={{ fontSize: '1.3rem' }}>Apellido</label>
                      <input type="text" id="regApellido" className="box" required
                        value={regApellido} onChange={(e) => setRegApellido(e.target.value)} />
                    </div>
                    <div>
                      <label style={{ fontSize: '1.3rem' }}>Correo</label>
                      <input type="email" id="regEmail" className="box" required autoComplete="email"
                        value={regEmail} onChange={(e) => setRegEmail(e.target.value)} />
                    </div>
                    <div>
                      <label style={{ fontSize: '1.3rem' }}>Contraseña</label>
                      <input type="password" id="regPass" className="box" required minLength="6" autoComplete="new-password"
                        value={regPass} onChange={(e) => setRegPass(e.target.value)} />
                    </div>
                  </div>
                  <div style={{ marginTop: '1rem' }}>
                    <button type="submit" className="btn">Registrarme</button>
                  </div>
                </form>
                {regMsg && <p className="muted" style={{ fontSize: '1.2rem', marginTop: '1rem', color: '#c0392b' }}>{regMsg}</p>}
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}

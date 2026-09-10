'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getFacturasByCliente, getPagosPorUsuarioPublico, getToken, getStoredUsuario } from '@/lib/alfaredApi';

export default function PagosPage() {
  const [clienteId, setClienteId] = useState('');
  const [facturas, setFacturas] = useState([]);
  const [historialPagos, setHistorialPagos] = useState([]);
  const [mensaje, setMensaje] = useState('');
  const [mostrarModal, setMostrarModal] = useState(false);
  const [facturaSeleccionada, setFacturaSeleccionada] = useState(null);
  const [detalleFactura, setDetalleFactura] = useState(null);
  const [sesionClienteActiva, setSesionClienteActiva] = useState(false);

  // Simulación de carga inicial al montar el componente
  useEffect(() => {
    // Aquí puedes verificar si hay sesión activa almacenada
    const usuarioGuardado = sessionStorage.getItem('alfared_usuario');
    if (usuarioGuardado) {
      try {
        const u = JSON.parse(usuarioGuardado);
        if (u && u.id_usuario && u.tipo?.toLowerCase() === 'cliente') {
          setClienteId(u.id_usuario);
          setSesionClienteActiva(true);
        }
      } catch (_) {}
    }
  }, []);

   // Manejador para buscar facturas por ID de usuario
   const buscarFacturas = async (e) => {
     e.preventDefault();
     setMensaje('Buscando facturas...');
     setDetalleFactura(null);
     setFacturas([]);
     setHistorialPagos([]);

     try {
       const res = await getFacturasByCliente(clienteId);
       if (!res) {
         setMensaje('Error consultando facturas.');
         return;
       }
       if (res.success === false && res.code === 'USER_NOT_FOUND') {
         setMensaje('El ID ingresado no es válido o no existe en el sistema.');
         return;
       }
       if (res.success === false && res.code && ['NO_TOKEN', 'INVALID_TOKEN', 'ACCESS_DENIED'].includes(res.code)) {
         setMensaje('Debe iniciar sesión y consultar con su propio ID de usuario.');
         return;
       }
       if (res.success) {
         const data = Array.isArray(res.data) ? res.data : [];
         setFacturas(data);
         setMensaje('');
         if (data.length === 0) {
           setMensaje('No hay facturas registradas para este usuario.');
         }
       } else {
         setMensaje(res.error || 'No se pudieron cargar las facturas.');
       }
     } catch (err) {
       setMensaje('Error de red al consultar facturas.');
     }

     try {
       const histRes = await getPagosPorUsuarioPublico(clienteId);
       if (histRes && histRes.success && Array.isArray(histRes.data)) {
         setHistorialPagos(histRes.data);
       }
     } catch (_) {}
   };

  const abrirModalPago = (factura) => {
    setFacturaSeleccionada(factura);
    setMostrarModal(true);
  };

  const confirmarYContinuarPago = () => {
    if (facturaSeleccionada) {
      alert(`Enviando factura #${facturaSeleccionada.id_factura} por un monto de $${facturaSeleccionada.monto} a Mercado Pago...`);
    }
    setMostrarModal(false);
  };

  const verDetalle = (f) => {
    setDetalleFactura(f);
  };

  return (
    <>
      <header className="header">
        <Link href="/" className="logo">AlfaRed<span> Pagos</span></Link>
        <nav className="navbar">
          <Link href="/">Inicio</Link>
          <Link href="/pqrs">PQRS</Link>
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
                  Sesión como <strong>cliente</strong>: el campo de ID se rellenó con tu usuario.{' '}
                  <Link href="/cuenta">Gestionar cuenta</Link>
                </p>
              </div>
            </div>

            <div className="card">
              <div className="card-body">
                <h1 className="heading" style={{ marginBottom: '1.5rem' }}>Mi factura</h1>
                <p className="muted" style={{ fontSize: '1.5rem' }}>Consulta y paga tus facturas en línea.</p>
              </div>
            </div>

            <div className="spacer-md"></div>

            {/* Formulario de Consulta por ID */}
            <div className="card">
              <div className="card-body">
                <h3>Consulta tus facturas</h3>
                <p className="muted" style={{ fontSize: '1.4rem', lineHeight: '2', padding: '1rem 0' }}>
                  Ingresa tu ID de usuario registrado. Solo verás las facturas asociadas a ese ID.
                  Las facturas en estado <strong>PENDIENTE</strong> pueden pagarse con Mercado Pago.
                </p>
                <form onSubmit={buscarFacturas} id="invoiceSearchForm">
                  <div className="form-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: '1rem' }}>
                    <div>
                      <label style={{ fontSize: '1.4rem', display: 'block', marginBottom: '.5rem' }}>ID Usuario</label>
                      <input 
                        type="number" 
                        id="searchCustomerId" 
                        className="box" 
                        placeholder="Ej: 101" 
                        value={clienteId}
                        onChange={(e) => setClienteId(e.target.value)}
                        required 
                      />
                    </div>
                  </div>
                  <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    <button type="submit" className="btn">Buscar facturas</button>
                  </div>
                </form>
                {mensaje && <div style={{ marginTop: '1rem', fontSize: '1.4rem', color: '#c0392b' }}>{mensaje}</div>}
              </div>
            </div>

            {/* Listado de Facturas Encontradas */}
            {facturas.length > 0 && (
              <div className="card" style={{ marginTop: '1.5rem' }}>
                <div className="card-body">
                  <h3>Facturas del Usuario</h3>
                  <div style={{ marginTop: '1rem' }}>
                    {facturas.map((f) => (
                      <div key={f.id_factura} style={{ padding: '0.8rem 1rem', border: 'var(--border)', background: '#fff', marginBottom: '.6rem', display: 'flex', gap: '1rem', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                        <div>
                          <strong>Factura #{f.id_factura}</strong>
                          <div style={{ fontSize: '1.3rem', color: 'var(--light-color)' }}>
                            Vence: {f.fecha_vencimiento} • Estado: {f.estado}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 600 }}>${f.monto.toLocaleString('es-CO')}</span>
                          {f.estado === 'PENDIENTE' ? (
                            <button type="button" className="btn" onClick={() => abrirModalPago(f)}>Pagar online</button>
                          ) : (
                            <span style={{ padding: '.4rem .8rem', background: '#4CAF50', color: '#fff', borderRadius: '4px', fontSize: '1.2rem' }}>Pagada</span>
                          )}
                          <button type="button" className="btn" onClick={() => verDetalle(f)} style={{ fontSize: '1.2rem', background: 'var(--light-color)' }}>Ver detalle</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Detalle factura seleccionada */}
            {detalleFactura && (
              <div id="facturaDetalleCard" className="card" style={{ marginTop: '1.5rem' }}>
                <div className="card-body">
                  <h3>Detalle de factura</h3>
                  <div id="facturaDetalleBody" style={{ fontSize: '1.35rem', lineHeight: '1.8' }}>
                    <p><strong>ID Factura:</strong> {detalleFactura.id_factura}</p>
                    <p><strong>ID Usuario:</strong> {clienteId}</p>
                    <p><strong>Monto:</strong> ${detalleFactura.monto.toLocaleString('es-CO')}</p>
                    <p><strong>Fecha de vencimiento:</strong> {detalleFactura.fecha_vencimiento}</p>
                    <p><strong>Estado:</strong> {detalleFactura.estado}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Entidad Pago / Historial */}
            {historialPagos.length > 0 && (
              <div id="historialPagosCard" className="card" style={{ marginTop: '1.5rem' }}>
                <div className="card-body">
                  <h3>Transacciones registradas (entidad Pago)</h3>
                  <p className="muted" style={{ fontSize: '1.3rem', marginBottom: '1rem' }}>
                    Historial de intentos y pagos asociados a tus facturas.
                  </p>
                  <div id="historialPagosBody" style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '1.25rem' }}>
                      <thead>
                        <tr style={{ background: '#f5f5f5' }}>
                          <th style={{ border: 'var(--border)', padding: '.5rem .75rem', textAlign: 'left' }}>ID Pago</th>
                          <th style={{ border: 'var(--border)', padding: '.5rem .75rem', textAlign: 'left' }}>ID Factura</th>
                          <th style={{ border: 'var(--border)', padding: '.5rem .75rem', textAlign: 'left' }}>Estado</th>
                          <th style={{ border: 'var(--border)', padding: '.5rem .75rem', textAlign: 'left' }}>Método</th>
                          <th style={{ border: 'var(--border)', padding: '.5rem .75rem', textAlign: 'left' }}>Fecha</th>
                        </tr>
                      </thead>
                      <tbody>
                        {historialPagos.map((p) => (
                          <tr key={p.id_pago}>
                            <td style={{ border: 'var(--border)', padding: '.5rem .75rem' }}>{p.id_pago}</td>
                            <td style={{ border: 'var(--border)', padding: '.5rem .75rem' }}>{p.factura_id}</td>
                            <td style={{ border: 'var(--border)', padding: '.5rem .75rem' }}>{p.estado}</td>
                            <td style={{ border: 'var(--border)', padding: '.5rem .75rem' }}>{p.metodo_pago}</td>
                            <td style={{ border: 'var(--border)', padding: '.5rem .75rem' }}>{p.fecha_pago}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Modal confirmación antes de pasarela */}
            {mostrarModal && facturaSeleccionada && (
              <div id="overlayConfirmPago" style={{ display: 'flex', position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 999, alignItems: 'center', justifyContent: 'center' }}>
                <div className="card" style={{ maxWidth: '420px', margin: '2rem', position: 'relative', zIndex: 1000, background: '#fff' }}>
                  <div className="card-body">
                    <h3 style={{ marginBottom: '1rem' }}>Confirmar pago</h3>
                    <p id="confirmPagoTexto" style={{ fontSize: '1.3rem', marginBottom: '1rem' }}>
                      <strong>Factura:</strong> #{facturaSeleccionada.id_factura}<br />
                      <strong>Monto:</strong> ${facturaSeleccionada.monto.toLocaleString('es-CO')} COP
                    </p>
                    <p className="muted" style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>
                      Al confirmar se enviarán el ID de factura y el monto a Mercado Pago de forma segura (HTTPS).
                    </p>
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                      <button type="button" id="confirmPagoSi" className="btn" onClick={confirmarYContinuarPago}>Confirmar y continuar</button>
                      <button type="button" id="confirmPagoNo" className="btn" onClick={() => setMostrarModal(false)} style={{ background: 'var(--light-color)' }}>Cancelar</button>
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
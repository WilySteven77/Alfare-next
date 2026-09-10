'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function DevolucionPage() {
  const [activeTab, setActiveTab] = useState('request-refund');
  const [devoluciones, setDevoluciones] = useState([]);
  
  // Estado para el formulario de solicitud
  const [formData, setFormData] = useState({
    clientId: '',
    clientName: '',
    documentNumber: '',
    contactPhone: '',
    paymentId: '',
    transactionNumber: '',
    paymentDate: '',
    paymentAmount: '',
    paymentMethod: '',
    serviceType: '',
    refundReason: '',
    refundDescription: '',
    refundMethod: '',
    bankAccount: '',
    bankName: '',
    accountType: ''
  });
  const [refundResult, setRefundResult] = useState(null);

  // Estado para consulta de estado
  const [trackId, setTrackId] = useState('');
  const [trackResult, setTrackResult] = useState(null);

  const STORAGE_KEY = 'alfared_devoluciones';

  useEffect(() => {
    cargarDevolucionesLocales();
  }, []);

  const cargarDevolucionesLocales = () => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setDevoluciones(JSON.parse(saved));
      } catch (e) {
        setDevoluciones([]);
      }
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmitRefund = (e) => {
    e.preventDefault();
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    const refundId = 'DEV-' + timestamp.toString().slice(-6) + '-' + random;

    const nuevaDevolucion = {
      ...formData,
      refundId,
      estado: 'En Revisión',
      fechaSolicitud: new Date().toISOString(),
      fechaActualizacion: new Date().toISOString()
    };

    const actualizadas = [...devoluciones, nuevaDevolucion];
    setDevoluciones(actualizadas);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(actualizadas));

    setRefundResult({
      success: true,
      refundId,
      clientName: formData.clientName,
      paymentAmount: formData.paymentAmount
    });

    // Limpiar formulario
    setFormData({
      clientId: '', clientName: '', documentNumber: '', contactPhone: '',
      paymentId: '', transactionNumber: '', paymentDate: '', paymentAmount: '',
      paymentMethod: '', serviceType: '', refundReason: '', refundDescription: '',
      refundMethod: '', bankAccount: '', bankName: '', accountType: ''
    });
  };

  const handleTrackSubmit = (e) => {
    e.preventDefault();
    const idClean = trackId.trim().toUpperCase();
    const found = devoluciones.find(d => d.refundId === idClean);
    setTrackResult(found || { notFound: true, id: idClean });
  };

  const aceptarDevolucion = (refundId) => {
    const dev = devoluciones.find(d => d.refundId === refundId);
    if (!dev) return;

    if (confirm(`¿Desea aceptar y procesar la devolución ${refundId}?\n\nCliente: ${dev.clientName}\nMonto: $${Number(dev.paymentAmount).toLocaleString('es-CO')}`)) {
      const actualizadas = devoluciones.map(d => d.refundId === refundId ? { ...d, estado: 'Devuelto', fechaActualizacion: new Date().toISOString() } : d);
      setDevoluciones(actualizadas);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(actualizadas));
      alert(`Devolución ${refundId} procesada exitosamente a estado: Devuelto`);
    }
  };

  const rechazarDevolucion = (refundId) => {
    const dev = devoluciones.find(d => d.refundId === refundId);
    if (!dev) return;

    const razon = prompt(`¿Por qué razón se rechaza la devolución ${refundId}?\n\nIngrese el motivo del rechazo:`, '');
    if (razon === null || razon.trim() === '') return;

    if (confirm(`¿Confirma el rechazo de la devolución ${refundId}?\nMotivo: ${razon}`)) {
      const actualizadas = devoluciones.map(d => d.refundId === refundId ? { ...d, estado: 'Rechazada', motivoRechazo: razon, fechaActualizacion: new Date().toISOString() } : d);
      setDevoluciones(actualizadas);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(actualizadas));
      alert(`Devolución ${refundId} rechazada.`);
    }
  };

  const viewDetails = (refundId) => {
    const dev = devoluciones.find(d => d.refundId === refundId);
    if (!dev) return;

    alert(`
DETALLES DE LA DEVOLUCIÓN
════════════════════════════════════════
ID: ${dev.refundId}
Cliente: ${dev.clientName} (ID: ${dev.clientId})
Documento: ${dev.documentNumber} | Tel: ${dev.contactPhone}
Monto: $${Number(dev.paymentAmount).toLocaleString('es-CO')}
Pago ID: ${dev.paymentId} | Transacción: ${dev.transactionNumber}
Motivo: ${dev.refundReason}
Descripción: ${dev.refundDescription}
Método Reembolso: ${dev.refundMethod}
Estado: ${dev.estado}
${dev.motivoRechazo ? 'Motivo Rechazo: ' + dev.motivoRechazo : ''}
    `.trim());
  };

  return (
    <>
      <header className="header">
        <Link href="/" className="logo">AlfaRed<span> Devoluciones</span></Link>
        <nav className="navbar">
          <Link href="/">Inicio</Link>
          <Link href="/pagos">Pagos</Link>
          <Link href="/cuenta">Mi cuenta</Link>
        </nav>
        <div className="icons"></div>
      </header>

      <div className="accounting-container" style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* Header / Navegación interna */}
        <div className="accounting-header" style={{ marginBottom: '2rem', textAlign: 'center' }}>
          <h1><span className="logo">Alfa</span>Red - Sistema de Devoluciones</h1>
          <p style={{ fontSize: '1.4rem', color: '#666', marginBottom: '1.5rem' }}>Gestión de Devoluciones y Reembolsos</p>
          
          <div className="accounting-nav" style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <button 
              className={`nav-btn ${activeTab === 'request-refund' ? 'active' : ''}`} 
              onClick={() => setActiveTab('request-refund')}
              style={{ padding: '.8rem 1.5rem', cursor: 'pointer', background: activeTab === 'request-refund' ? '#3137fd' : '#eee', color: activeTab === 'request-refund' ? '#fff' : '#333', border: 'none', borderRadius: '.5rem' }}
            >
              <i className="fas fa-undo-alt"></i> Solicitar Devolución
            </button>
            <button 
              className={`nav-btn ${activeTab === 'track-refund' ? 'active' : ''}`} 
              onClick={() => setActiveTab('track-refund')}
              style={{ padding: '.8rem 1.5rem', cursor: 'pointer', background: activeTab === 'track-refund' ? '#3137fd' : '#eee', color: activeTab === 'track-refund' ? '#fff' : '#333', border: 'none', borderRadius: '.5rem' }}
            >
              <i className="fas fa-search"></i> Consultar Estado
            </button>
            <button 
              className={`nav-btn ${activeTab === 'refund-history' ? 'active' : ''}`} 
              onClick={() => setActiveTab('refund-history')}
              style={{ padding: '.8rem 1.5rem', cursor: 'pointer', background: activeTab === 'refund-history' ? '#3137fd' : '#eee', color: activeTab === 'refund-history' ? '#fff' : '#333', border: 'none', borderRadius: '.5rem' }}
            >
              <i className="fas fa-history"></i> Historial
            </button>
          </div>
        </div>

        {/* Sección 1: Solicitar Devolución */}
        {activeTab === 'request-refund' && (
          <div id="request-refund" className="section active" style={{ background: '#fff', padding: '2rem', borderRadius: '1rem', boxShadow: '0 .5rem 1rem rgba(0,0,0,.1)' }}>
            <h2><i className="fas fa-undo-alt"></i> Solicitar Devolución</h2>
            
            <form onSubmit={handleSubmitRefund} style={{ marginTop: '1.5rem' }}>
              <h4>Información del Cliente</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <label>ID del Cliente:</label>
                  <input type="text" name="clientId" value={formData.clientId} onChange={handleInputChange} required className="box" style={{ width: '100%', padding: '.8rem', border: '1px solid #ccc', borderRadius: '.4rem' }} />
                </div>
                <div>
                  <label>Nombre del Cliente:</label>
                  <input type="text" name="clientName" value={formData.clientName} onChange={handleInputChange} required className="box" style={{ width: '100%', padding: '.8rem', border: '1px solid #ccc', borderRadius: '.4rem' }} />
                </div>
                <div>
                  <label>Número de Documento:</label>
                  <input type="text" name="documentNumber" value={formData.documentNumber} onChange={handleInputChange} required className="box" style={{ width: '100%', padding: '.8rem', border: '1px solid #ccc', borderRadius: '.4rem' }} />
                </div>
                <div>
                  <label>Teléfono de Contacto:</label>
                  <input type="tel" name="contactPhone" value={formData.contactPhone} onChange={handleInputChange} required className="box" style={{ width: '100%', padding: '.8rem', border: '1px solid #ccc', borderRadius: '.4rem' }} />
                </div>
              </div>

              <h4>Información del Pago</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <label>ID del Pago:</label>
                  <input type="text" name="paymentId" value={formData.paymentId} onChange={handleInputChange} required className="box" style={{ width: '100%', padding: '.8rem', border: '1px solid #ccc', borderRadius: '.4rem' }} />
                </div>
                <div>
                  <label>Número de Transacción:</label>
                  <input type="text" name="transactionNumber" value={formData.transactionNumber} onChange={handleInputChange} required className="box" style={{ width: '100%', padding: '.8rem', border: '1px solid #ccc', borderRadius: '.4rem' }} />
                </div>
                <div>
                  <label>Fecha del Pago:</label>
                  <input type="date" name="paymentDate" value={formData.paymentDate} onChange={handleInputChange} required className="box" style={{ width: '100%', padding: '.8rem', border: '1px solid #ccc', borderRadius: '.4rem' }} />
                </div>
                <div>
                  <label>Monto a Devolver:</label>
                  <input type="number" name="paymentAmount" step="0.01" value={formData.paymentAmount} onChange={handleInputChange} required className="box" style={{ width: '100%', padding: '.8rem', border: '1px solid #ccc', borderRadius: '.4rem' }} />
                </div>
                <div>
                  <label>Método de Pago Original:</label>
                  <select name="paymentMethod" value={formData.paymentMethod} onChange={handleInputChange} required className="box" style={{ width: '100%', padding: '.8rem', border: '1px solid #ccc', borderRadius: '.4rem' }}>
                    <option value="">Seleccionar método</option>
                    <option value="tarjeta-credito">Tarjeta de Crédito</option>
                    <option value="tarjeta-debito">Tarjeta de Débito</option>
                    <option value="transferencia">Transferencia Bancaria</option>
                    <option value="efectivo">Efectivo</option>
                    <option value="mercado-pago">Mercado Pago</option>
                  </select>
                </div>
                <div>
                  <label>Tipo de Servicio:</label>
                  <select name="serviceType" value={formData.serviceType} onChange={handleInputChange} required className="box" style={{ width: '100%', padding: '.8rem', border: '1px solid #ccc', borderRadius: '.4rem' }}>
                    <option value="">Seleccionar tipo</option>
                    <option value="instalacion">Instalación</option>
                    <option value="mensualidad">Mensualidad</option>
                    <option value="mantenimiento">Mantenimiento</option>
                    <option value="equipo">Equipo</option>
                    <option value="otros">Otros</option>
                  </select>
                </div>
              </div>

              <h4>Razón de la Devolución</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <label>Motivo:</label>
                  <select name="refundReason" value={formData.refundReason} onChange={handleInputChange} required className="box" style={{ width: '100%', padding: '.8rem', border: '1px solid #ccc', borderRadius: '.4rem' }}>
                    <option value="">Seleccionar motivo</option>
                    <option value="servicio-no-recibido">Servicio no recibido</option>
                    <option value="servicio-defectuoso">Servicio defectuoso</option>
                    <option value="cobro-duplicado">Cobro duplicado</option>
                    <option value="error-en-cobro">Error en el cobro</option>
                    <option value="cancelacion">Cancelación de servicio</option>
                    <option value="insatisfacción">Insatisfacción con el servicio</option>
                    <option value="otros">Otros</option>
                  </select>
                </div>
                <div>
                  <label>Descripción Detallada:</label>
                  <textarea name="refundDescription" rows="4" value={formData.refundDescription} onChange={handleInputChange} required className="box" style={{ width: '100%', padding: '.8rem', border: '1px solid #ccc', borderRadius: '.4rem' }}></textarea>
                </div>
              </div>

              <h4>Información para el Reembolso</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <label>Método de Reembolso:</label>
                  <select name="refundMethod" value={formData.refundMethod} onChange={handleInputChange} required className="box" style={{ width: '100%', padding: '.8rem', border: '1px solid #ccc', borderRadius: '.4rem' }}>
                    <option value="">Seleccionar método</option>
                    <option value="mismo-metodo">Mismo método de pago</option>
                    <option value="transferencia">Transferencia bancaria</option>
                    <option value="tarjeta-credito">Tarjeta de crédito</option>
                    <option value="efectivo">Efectivo</option>
                  </select>
                </div>
                <div>
                  <label>Cuenta Bancaria:</label>
                  <input type="text" name="bankAccount" value={formData.bankAccount} onChange={handleInputChange} className="box" style={{ width: '100%', padding: '.8rem', border: '1px solid #ccc', borderRadius: '.4rem' }} />
                </div>
                <div>
                  <label>Nombre del Banco:</label>
                  <input type="text" name="bankName" value={formData.bankName} onChange={handleInputChange} className="box" style={{ width: '100%', padding: '.8rem', border: '1px solid #ccc', borderRadius: '.4rem' }} />
                </div>
                <div>
                  <label>Tipo de Cuenta:</label>
                  <select name="accountType" value={formData.accountType} onChange={handleInputChange} className="box" style={{ width: '100%', padding: '.8rem', border: '1px solid #ccc', borderRadius: '.4rem' }}>
                    <option value="">Seleccionar tipo</option>
                    <option value="ahorros">Ahorros</option>
                    <option value="corriente">Corriente</option>
                  </select>
                </div>
              </div>

              <button type="submit" className="btn-primary" style={{ padding: '1rem 2rem', background: '#3137fd', color: '#fff', border: 'none', borderRadius: '.5rem', cursor: 'pointer' }}>
                <i className="fas fa-paper-plane"></i> Enviar Solicitud de Devolución
              </button>
            </form>

            {refundResult && (
              <div style={{ marginTop: '2rem', background: '#e8f5e9', padding: '1.5rem', borderRadius: '.5rem', color: '#2e7d32' }}>
                <h4><i className="fas fa-check-circle"></i> Solicitud Guardada Exitosamente</h4>
                <p><strong>ID de Solicitud:</strong> {refundResult.refundId}</p>
                <p><strong>Cliente:</strong> {refundResult.clientName}</p>
                <p><strong>Monto a Devolver:</strong> ${Number(refundResult.paymentAmount).toLocaleString('es-CO')}</p>
                <p><strong>Estado:</strong> En Revisión</p>
              </div>
            )}
          </div>
        )}

        {/* Sección 2: Consultar Estado */}
        {activeTab === 'track-refund' && (
          <div id="track-refund" className="section active" style={{ background: '#fff', padding: '2rem', borderRadius: '1rem', boxShadow: '0 .5rem 1rem rgba(0,0,0,.1)' }}>
            <h2><i className="fas fa-search"></i> Consultar Estado de Devolución</h2>
            
            <form onSubmit={handleTrackSubmit} style={{ marginTop: '1.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem', maxWidth: '400px', marginBottom: '1rem' }}>
                <div>
                  <label>ID de Solicitud de Devolución:</label>
                  <input type="text" value={trackId} onChange={e => setTrackId(e.target.value)} required className="box" style={{ width: '100%', padding: '.8rem', border: '1px solid #ccc', borderRadius: '.4rem' }} placeholder="Ej: DEV-123456-789" />
                </div>
              </div>
              <button type="submit" style={{ padding: '.8rem 1.5rem', background: '#3137fd', color: '#fff', border: 'none', borderRadius: '.4rem', cursor: 'pointer' }}>Consultar Estado</button>
            </form>

            {trackResult && (
              <div style={{ marginTop: '2rem' }}>
                {trackResult.notFound ? (
                  <div style={{ background: '#ffebee', padding: '1rem', borderRadius: '.5rem', color: '#c62828' }}>
                    <p>No se encontró ninguna solicitud con el ID: <strong>{trackResult.id}</strong></p>
                  </div>
                ) : (
                  <div style={{ background: '#f5f5f5', padding: '1.5rem', borderRadius: '.5rem' }}>
                    <h4>Estado de la Solicitud {trackResult.refundId}</h4>
                    <p><strong>Cliente:</strong> {trackResult.clientName}</p>
                    <p><strong>Monto:</strong> ${Number(trackResult.paymentAmount).toLocaleString('es-CO')}</p>
                    <p><strong>Estado Actual:</strong> <span style={{ color: '#3137fd', fontWeight: 'bold' }}>{trackResult.estado}</span></p>
                    <p><strong>Fecha:</strong> {new Date(trackResult.fechaSolicitud).toLocaleDateString('es-CO')}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Sección 3: Historial */}
        {activeTab === 'refund-history' && (
          <div id="refund-history" className="section active" style={{ background: '#fff', padding: '2rem', borderRadius: '1rem', boxShadow: '0 .5rem 1rem rgba(0,0,0,.1)' }}>
            <h2><i className="fas fa-history"></i> Historial de Devoluciones</h2>
            
            <div style={{ marginTop: '1.5rem', overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '1.2rem' }}>
                <thead>
                  <tr style={{ background: '#f5f5f5' }}>
                    <th style={{ border: '1px solid #ddd', padding: '.8rem' }}>ID</th>
                    <th style={{ border: '1px solid #ddd', padding: '.8rem' }}>Cliente</th>
                    <th style={{ border: '1px solid #ddd', padding: '.8rem' }}>Monto</th>
                    <th style={{ border: '1px solid #ddd', padding: '.8rem' }}>Fecha</th>
                    <th style={{ border: '1px solid #ddd', padding: '.8rem' }}>Estado</th>
                    <th style={{ border: '1px solid #ddd', padding: '.8rem' }}>Acciones</th>
                    <th style={{ border: '1px solid #ddd', padding: '.8rem' }}>Administrar</th>
                  </tr>
                </thead>
                <tbody>
                  {devoluciones.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: '#666' }}>No hay solicitudes de devolución registradas</td>
                    </tr>
                  ) : (
                    devoluciones.map(dev => {
                      const puedeAceptar = dev.estado !== 'Devuelto' && dev.estado !== 'Rechazada' && dev.estado !== 'Completada';
                      return (
                        <tr key={dev.refundId}>
                          <td style={{ border: '1px solid #ddd', padding: '.8rem' }}>{dev.refundId}</td>
                          <td style={{ border: '1px solid #ddd', padding: '.8rem' }}>{dev.clientName}</td>
                          <td style={{ border: '1px solid #ddd', padding: '.8rem' }}>${Number(dev.paymentAmount).toLocaleString('es-CO')}</td>
                          <td style={{ border: '1px solid #ddd', padding: '.8rem' }}>{new Date(dev.fechaSolicitud).toLocaleDateString('es-CO')}</td>
                          <td style={{ border: '1px solid #ddd', padding: '.8rem' }}><strong>{dev.estado}</strong></td>
                          <td style={{ border: '1px solid #ddd', padding: '.8rem' }}>
                            <button onClick={() => viewDetails(dev.refundId)} style={{ padding: '.4rem .8rem', background: '#3137fd', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Ver</button>
                          </td>
                          <td style={{ border: '1px solid #ddd', padding: '.8rem' }}>
                            {puedeAceptar ? (
                              <div style={{ display: 'flex', gap: '.4rem' }}>
                                <button onClick={() => aceptarDevolucion(dev.refundId)} style={{ padding: '.4rem .6rem', background: '#4CAF50', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Aceptar</button>
                                <button onClick={() => rechazarDevolucion(dev.refundId)} style={{ padding: '.4rem .6rem', background: '#f44336', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Rechazar</button>
                              </div>
                            ) : (
                              <span>Finalizado</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </>
  );
}
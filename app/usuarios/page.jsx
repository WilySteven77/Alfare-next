'use client';

import { useState } from 'react';
import Link from 'next/link';
import { getFacturasByCliente, getPagosPorUsuarioPublico, createPqrs, pagarFactura } from '@/lib/alfaredApi';

export default function UsuariosPage() {
  // Estados para búsqueda de factura
  const [searchCustomerId, setSearchCustomerId] = useState('');
  const [searchContract, setSearchContract] = useState('');
  const [invoiceResult, setInvoiceResult] = useState('');
  const [facturaPendiente, setFacturaPendiente] = useState(null);

  // Estados para pago
  const [payFacturaId, setPayFacturaId] = useState('');
  const [payCustomerId, setPayCustomerId] = useState('');
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('');
  const [payResult, setPayResult] = useState('');
  const [pagando, setPagando] = useState(false);

  // Estados para historial
  const [historyCustomerId, setHistoryCustomerId] = useState('');
  const [historyResult, setHistoryResult] = useState('');

  // Estados para PQRS
  const [pqrsName, setPqrsName] = useState('');
  const [pqrsEmail, setPqrsEmail] = useState('');
  const [pqrsPhone, setPqrsPhone] = useState('');
  const [pqrsType, setPqrsType] = useState('');
  const [pqrsMessage, setPqrsMessage] = useState('');
  const [pqrsResult, setPqrsResult] = useState('');

  const handleSearchInvoice = async (e) => {
    e.preventDefault();
    if (!searchCustomerId) {
      setInvoiceResult('Ingresa un ID de cliente para buscar.');
      return;
    }
    setInvoiceResult(`Buscando factura para el ID Cliente: ${searchCustomerId}...`);
    setFacturaPendiente(null);

    try {
      const res = await getFacturasByCliente(searchCustomerId);
      if (!res) {
        setInvoiceResult('Error consultando facturas.');
        return;
      }
      if (res.success === false && res.code === 'USER_NOT_FOUND') {
        setInvoiceResult('El ID ingresado no es válido o no existe en el sistema.');
        return;
      }
      if (res.success === false && ['NO_TOKEN', 'INVALID_TOKEN', 'ACCESS_DENIED'].includes(res.code)) {
        setInvoiceResult('Debe iniciar sesión y consultar con su propio ID de usuario.');
        return;
      }
      if (res.success) {
        const data = Array.isArray(res.data) ? res.data : [];
        if (data.length === 0) {
          setInvoiceResult('No hay facturas registradas para este usuario.');
        } else {
          const pendiente = data.find((f) => String(f.estado).toUpperCase() === 'PENDIENTE') || data[0];
          setInvoiceResult(
            `Factura #${pendiente.id_factura || pendiente.id} — Estado: ${(pendiente.estado || '').toUpperCase()} — Monto: $${Number(pendiente.monto).toLocaleString('es-CO')} COP (Vence: ${pendiente.fecha_vencimiento})`
          );
          if (String(pendiente.estado).toUpperCase() === 'PENDIENTE') {
            setFacturaPendiente(pendiente);
            setPayFacturaId(String(pendiente.id_factura));
            setPayCustomerId(String(searchCustomerId));
            setPayAmount(String(pendiente.monto));
          }
        }
      } else {
        setInvoiceResult(res.error || 'No se pudieron cargar las facturas.');
      }
    } catch (err) {
      setInvoiceResult('Error de red al consultar facturas.');
    }
  };

  const handleDownloadInvoice = () => {
    if (!searchCustomerId) {
      alert('Por favor ingresa un ID de cliente para descargar la factura.');
      return;
    }
    alert(`Descargando factura del cliente #${searchCustomerId}...`);
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    if (!payFacturaId) {
      setPayResult('Ingresa el ID de la factura a pagar (búscala primero a la izquierda).');
      return;
    }
    if (!payMethod) {
      setPayResult('Selecciona un método de pago.');
      return;
    }
    setPagando(true);
    setPayResult('Procesando pago...');
    try {
      const res = await pagarFactura(Number(payFacturaId), payMethod);
      if (res && res.success) {
        const f = res.data?.factura;
        setPayResult(
          res.message ||
            `Pago exitoso. Factura #${f?.id_factura || payFacturaId} quedó ${f?.estado || 'PAGADA'}.`
        );
        setFacturaPendiente(null);
        if (payCustomerId || searchCustomerId) {
          const uid = payCustomerId || searchCustomerId;
          const facturasRes = await getFacturasByCliente(uid);
          if (facturasRes?.success && Array.isArray(facturasRes.data) && facturasRes.data[0]) {
            const f0 = facturasRes.data[0];
            setInvoiceResult(
              `Factura #${f0.id_factura} — Estado: ${(f0.estado || '').toUpperCase()} — Monto: $${Number(f0.monto).toLocaleString('es-CO')} COP`
            );
          }
        }
      } else {
        setPayResult(res?.error || 'No se pudo registrar el pago.');
      }
    } catch (_) {
      setPayResult('Error de red al registrar el pago.');
    } finally {
      setPagando(false);
    }
  };

  const handleHistorySearch = async (e) => {
    e.preventDefault();
    if (!historyCustomerId) {
      setHistoryResult('Ingresa un ID de cliente para la búsqueda.');
      return;
    }
    setHistoryResult('Consultando historial...');

    try {
      const res = await getPagosPorUsuarioPublico(historyCustomerId);
      if (!res) {
        setHistoryResult('Error consultando el historial.');
        return;
      }
      if (res.success === false && res.code === 'USER_NOT_FOUND') {
        setHistoryResult('El ID de usuario no existe en el sistema.');
        return;
      }
      if (res.success) {
        const data = Array.isArray(res.data) ? res.data : [];
        if (data.length === 0) {
          setHistoryResult('No hay pagos registrados para este usuario.');
        } else {
          const ultimo = data[data.length - 1];
          setHistoryResult(`Cliente #${historyCustomerId}: ${data.length} pago(s). Último: $${Number(ultimo.monto || 0).toLocaleString('es-CO')} COP — Estado: ${ultimo.estado || 'N/A'}`);
        }
      } else {
        setHistoryResult(res.error || 'No se pudo consultar el historial.');
      }
    } catch (err) {
      setHistoryResult('Error de red al consultar el historial.');
    }
  };

  const handlePqrsSubmit = async (e) => {
    e.preventDefault();
    if (!pqrsName || !pqrsEmail || !pqrsType || !pqrsMessage) {
      setPqrsResult('Completa todos los campos obligatorios.');
      return;
    }
    if (!searchCustomerId) {
      setPqrsResult('Necesitas un ID de cliente para enviar la PQRS.');
      return;
    }
    setPqrsResult('Enviando PQRS...');

    try {
      const res = await createPqrs(pqrsType, pqrsMessage, parseInt(searchCustomerId, 10));
      if (res && res.success) {
        setPqrsResult(`¡PQRS enviada con éxito! Radicado: ${res.data.id_pqrs || ''} • Estado: ${res.data.estado || 'inicial'}`);
      } else if (res && res.code === 'USER_NOT_FOUND') {
        setPqrsResult('El ID de cliente no existe. Verifica e intenta de nuevo.');
      } else {
        setPqrsResult(res?.error || 'No se pudo enviar la PQRS.');
      }
    } catch (err) {
      setPqrsResult('Error de red al enviar la PQRS.');
    }
  };

  const handlePqrsClear = () => {
    setPqrsName('');
    setPqrsEmail('');
    setPqrsPhone('');
    setPqrsType('');
    setPqrsMessage('');
    setPqrsResult('');
  };

  return (
    <>
      <header className="header">
        <Link href="/" className="logo">AlfaRed<span> Usuarios</span></Link>
        <nav className="navbar">
          <Link href="/">Inicio</Link>
        </nav>
        <div className="icons"></div>
      </header>

      {/* Sección de Pagos / Factura */}
      <section className="home" style={{ paddingTop: '3rem', paddingLeft: '2rem', paddingRight: '2rem' }}>
        <div className="test-section" style={{ background: '#fff', border: '1px solid #ddd', boxShadow: '0 .5rem 1rem rgba(0,0,0,.1)', padding: '2rem', borderRadius: '1rem', maxWidth: '1200px', margin: '0 auto' }}>
          <h1 className="heading" style={{ marginBottom: '1.5rem', fontSize: '2rem' }}>Mi factura</h1>
          <p style={{ fontSize: '1.5rem', color: '#666' }}>Consulte y pague su factura de Internet.</p>
        </div>
      </section>

      <section className="billing" style={{ paddingTop: '2rem', paddingLeft: '2rem', paddingRight: '2rem', paddingBottom: '3rem' }}>
        <div className="row" style={{ display: 'flex', alignItems: 'flex-start', gap: '3rem', flexWrap: 'wrap', maxWidth: '1200px', margin: '0 auto' }}>
          
          {/* Columna izquierda: Buscar factura y detalles */}
          <div className="content" style={{ flex: '1 1 41rem' }}>
            <h3>Descargue y consulte su factura</h3>
            <p style={{ fontSize: '1.4rem', color: '#666', lineHeight: '2', padding: '1rem 0' }}>
              Ingrese su ID de cliente o número de contrato para buscar su factura.
            </p>
            <form onSubmit={handleSearchInvoice} style={{ background: '#fff', padding: '2rem', border: '1px solid #ddd', boxShadow: '0 .5rem 1rem rgba(0,0,0,.1)', borderRadius: '1rem' }}>
              <div className="form-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '1.4rem', display: 'block', marginBottom: '.5rem' }}>ID Cliente</label>
                  <input 
                    type="number" 
                    className="box" 
                    placeholder="Ej: 101" 
                    value={searchCustomerId}
                    onChange={(e) => setSearchCustomerId(e.target.value)}
                    required 
                    style={{ width: '100%', padding: '1rem', border: '1px solid #ccc', borderRadius: '.5rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '1.4rem', display: 'block', marginBottom: '.5rem' }}>N° Contrato (opcional)</label>
                  <input 
                    type="text" 
                    className="box" 
                    placeholder="Ej: CN-2025-0001" 
                    value={searchContract}
                    onChange={(e) => setSearchContract(e.target.value)}
                    style={{ width: '100%', padding: '1rem', border: '1px solid #ccc', borderRadius: '.5rem' }}
                  />
                </div>
              </div>
              <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <button type="submit" className="btn" style={{ padding: '1rem 2rem', background: '#3137fd', color: '#fff', border: 'none', borderRadius: '.5rem', cursor: 'pointer' }}>Buscar</button>
                <button type="button" onClick={handleDownloadInvoice} className="btn" style={{ padding: '1rem 2rem', background: '#666', color: '#fff', border: 'none', borderRadius: '.5rem', cursor: 'pointer' }}>Descargar factura</button>
              </div>
            </form>
            <div style={{ marginTop: '1rem', fontSize: '1.4rem', color: '#333' }}>{invoiceResult}</div>
          </div>

          {/* Columna derecha: Pago e historial */}
          <div className="content" style={{ flex: '1 1 41rem' }}>
            <h3>Pagar tu factura</h3>
            <p style={{ fontSize: '1.4rem', color: '#666', lineHeight: '2', padding: '1rem 0' }}>
              Busca tu factura a la izquierda; el ID y monto se rellenan solos si hay una pendiente. El pago se registra en la base de datos.
            </p>
            <form onSubmit={handlePayment} className="payment-form" style={{ background: '#fff', padding: '2rem', border: '1px solid #ddd', boxShadow: '0 .5rem 1rem rgba(0,0,0,.1)', borderRadius: '1rem' }}>
              <div className="form-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '1.4rem', display: 'block', marginBottom: '.5rem' }}>ID Factura</label>
                  <input 
                    type="number" 
                    className="box" 
                    placeholder="Ej: 1" 
                    value={payFacturaId}
                    onChange={(e) => setPayFacturaId(e.target.value)}
                    required 
                    style={{ width: '100%', padding: '1rem', border: '1px solid #ccc', borderRadius: '.5rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '1.4rem', display: 'block', marginBottom: '.5rem' }}>ID Cliente</label>
                  <input 
                    type="number" 
                    className="box" 
                    placeholder="Ej: 101" 
                    value={payCustomerId}
                    onChange={(e) => setPayCustomerId(e.target.value)}
                    style={{ width: '100%', padding: '1rem', border: '1px solid #ccc', borderRadius: '.5rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '1.4rem', display: 'block', marginBottom: '.5rem' }}>Monto (COP)</label>
                  <input 
                    type="number" 
                    className="box" 
                    min="1" 
                    placeholder="Ej: 65000" 
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    readOnly={!!facturaPendiente}
                    style={{ width: '100%', padding: '1rem', border: '1px solid #ccc', borderRadius: '.5rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '1.4rem', display: 'block', marginBottom: '.5rem' }}>Método</label>
                  <select 
                    className="box" 
                    value={payMethod}
                    onChange={(e) => setPayMethod(e.target.value)}
                    required 
                    style={{ width: '100%', padding: '1rem', border: '1px solid #ccc', borderRadius: '.5rem' }}
                  >
                    <option value="">Selecciona método</option>
                    <option value="tarjeta_credito">Tarjeta Crédito</option>
                    <option value="tarjeta_debito">Tarjeta Débito</option>
                    <option value="paypal">PayPal</option>
                    <option value="transferencia">Transferencia</option>
                  </select>
                </div>
              </div>
              <div style={{ marginTop: '1rem' }}>
                <button type="submit" className="btn" disabled={pagando} style={{ padding: '1rem 2rem', background: '#4CAF50', color: '#fff', border: 'none', borderRadius: '.5rem', cursor: 'pointer' }}>
                  {pagando ? 'Procesando…' : 'Pagar ahora'}
                </button>
              </div>
              {payResult && <div style={{ marginTop: '1rem', fontSize: '1.4rem', color: '#333' }}>{payResult}</div>}
            </form>

            <h3 style={{ marginTop: '2rem' }}>Historial de pagos</h3>
            <form onSubmit={handleHistorySearch} className="payment-form" style={{ background: '#fff', padding: '2rem', border: '1px solid #ddd', boxShadow: '0 .5rem 1rem rgba(0,0,0,.1)', borderRadius: '1rem' }}>
              <div className="form-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '1.4rem', display: 'block', marginBottom: '.5rem' }}>ID Cliente</label>
                  <input 
                    type="number" 
                    className="box" 
                    placeholder="Ej: 101" 
                    value={historyCustomerId}
                    onChange={(e) => setHistoryCustomerId(e.target.value)}
                    required 
                    style={{ width: '100%', padding: '1rem', border: '1px solid #ccc', borderRadius: '.5rem' }}
                  />
                </div>
              </div>
              <div style={{ marginTop: '1rem' }}>
                <button type="submit" className="btn" style={{ padding: '1rem 2rem', background: '#3137fd', color: '#fff', border: 'none', borderRadius: '.5rem', cursor: 'pointer' }}>Consultar</button>
              </div>
              <div style={{ marginTop: '1rem', fontSize: '1.4rem', color: '#333' }}>{historyResult}</div>
            </form>
          </div>

        </div>
      </section>

      {/* Sección de PQRS */}
      <section className="pqrs" style={{ paddingTop: '3rem', paddingBottom: '4rem', paddingLeft: '2rem', paddingRight: '2rem', background: '#f9f9f9' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h1 className="heading" style={{ fontSize: '2rem', marginBottom: '1.5rem' }}>PQRS</h1>
          <div className="row" style={{ display: 'flex', alignItems: 'flex-start', gap: '3rem', flexWrap: 'wrap' }}>
            <div className="content" style={{ flex: '1 1 100%' }}>
              <h3>Preguntas, Quejas, Reclamos y Sugerencias</h3>
              <p style={{ fontSize: '1.5rem', color: '#666', lineHeight: '2', padding: '1rem 0' }}>
                Déjanos tu solicitud. Te contactaremos con la respuesta y seguimiento.
              </p>
              <form onSubmit={handlePqrsSubmit} className="pqrs-form" style={{ background: '#fff', padding: '2rem', border: '1px solid #ddd', boxShadow: '0 .5rem 1rem rgba(0,0,0,.1)', borderRadius: '1rem' }}>
                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: '1rem' }}>
                  <div>
                    <label style={{ fontSize: '1.4rem', display: 'block', marginBottom: '.5rem' }}>Nombre completo</label>
                    <input 
                      type="text" 
                      className="box" 
                      placeholder="Tu nombre" 
                      value={pqrsName}
                      onChange={(e) => setPqrsName(e.target.value)}
                      required 
                      style={{ width: '100%', padding: '1rem', border: '1px solid #ccc', borderRadius: '.5rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '1.4rem', display: 'block', marginBottom: '.5rem' }}>Correo</label>
                    <input 
                      type="email" 
                      className="box" 
                      placeholder="tu@correo.com" 
                      value={pqrsEmail}
                      onChange={(e) => setPqrsEmail(e.target.value)}
                      required 
                      style={{ width: '100%', padding: '1rem', border: '1px solid #ccc', borderRadius: '.5rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '1.4rem', display: 'block', marginBottom: '.5rem' }}>Celular</label>
                    <input 
                      type="tel" 
                      className="box" 
                      placeholder="300 000 0000" 
                      value={pqrsPhone}
                      onChange={(e) => setPqrsPhone(e.target.value)}
                      style={{ width: '100%', padding: '1rem', border: '1px solid #ccc', borderRadius: '.5rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '1.4rem', display: 'block', marginBottom: '.5rem' }}>Tipo</label>
                    <select 
                      className="box" 
                      value={pqrsType}
                      onChange={(e) => setPqrsType(e.target.value)}
                      required 
                      style={{ width: '100%', padding: '1rem', border: '1px solid #ccc', borderRadius: '.5rem' }}
                    >
                      <option value="">Selecciona tipo</option>
                      <option value="pregunta">Pregunta</option>
                      <option value="queja">Queja</option>
                      <option value="reclamo">Reclamo</option>
                      <option value="sugerencia">Sugerencia</option>
                    </select>
                  </div>
                </div>
                <div style={{ marginTop: '1rem' }}>
                  <label style={{ fontSize: '1.4rem', display: 'block', marginBottom: '.5rem' }}>Mensaje</label>
                  <textarea 
                    className="box" 
                    rows="6" 
                    placeholder="Cuéntanos los detalles" 
                    value={pqrsMessage}
                    onChange={(e) => setPqrsMessage(e.target.value)}
                    required 
                    style={{ width: '100%', padding: '1rem', border: '1px solid #ccc', borderRadius: '.5rem' }}
                  ></textarea>
                </div>
                <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  <button type="submit" className="btn" style={{ padding: '1rem 2rem', background: '#3137fd', color: '#fff', border: 'none', borderRadius: '.5rem', cursor: 'pointer' }}>Enviar PQRS</button>
                  <button type="button" onClick={handlePqrsClear} className="btn" style={{ padding: '1rem 2rem', background: '#666', color: '#fff', border: 'none', borderRadius: '.5rem', cursor: 'pointer' }}>Limpiar</button>
                </div>
                <div style={{ marginTop: '1rem', fontSize: '1.4rem', color: '#27ae60' }}>{pqrsResult}</div>
              </form>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
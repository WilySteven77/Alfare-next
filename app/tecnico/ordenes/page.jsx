'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiFetch, getStoredUsuario, refreshSessionFromServer } from '@/lib/alfaredApi';

const STATES = ['REGISTRADA', 'ASIGNADA', 'EN_PROCESO', 'PAUSADA', 'COMPLETADA', 'CERRADA', 'CANCELADA'];

export default function OrdenesPage() {
  const router = useRouter();
  const [orders, setOrders] = useState([]);
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [maintenance, setMaintenance] = useState({});

  const loadOrders = async () => {
    setLoading(true);
    const response = await apiFetch('/tecnico/ordenes', { __actionLabel: 'Técnico: consultar órdenes propias' });
    if (!response?.success) setError(response?.error || 'No fue posible consultar las órdenes.');
    else setOrders(response.data || []);
    setLoading(false);
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      const stored = getStoredUsuario();
      const session = stored ? await refreshSessionFromServer() : null;
      if (!mounted || !session?.success || getStoredUsuario()?.tipo?.toLowerCase() !== 'tecnico') {
        router.replace('/cuenta');
        return;
      }
      setAuthorized(true);
      await loadOrders();
    })();
    return () => { mounted = false; };
  }, [router]);

  const registerMaintenance = async (orderId) => {
    const description = maintenance[orderId]?.description || '';
    const response = await apiFetch(`/tecnico/ordenes/${orderId}/mantenimientos`, {
      method: 'POST',
      body: JSON.stringify({ descripcion: description }),
      __actionLabel: `Técnico: registrar mantenimiento de orden #${orderId}`,
    });
    if (!response?.success) { setError(response?.error || 'No fue posible registrar el mantenimiento.'); return; }
    setMessage(`Mantenimiento registrado para la orden #${orderId}.`);
    setMaintenance({ ...maintenance, [orderId]: { description: '' } });
  };

  const updateState = async (orderId, estado) => {
    const response = await apiFetch(`/tecnico/ordenes/${orderId}/estado`, {
      method: 'PATCH',
      body: JSON.stringify({ estado }),
      __actionLabel: `Técnico: actualizar estado de orden #${orderId}`,
    });
    if (!response?.success) { setError(response?.error || 'No fue posible actualizar la orden.'); return; }
    setMessage(`Orden #${orderId} actualizada.`);
    await loadOrders();
  };

  if (!authorized) return <main className="container-narrow" style={{ padding: '4rem 1rem' }}>Validando sesión técnica...</main>;

  return <>
    <header className="header"><Link href="/tecnico" className="logo">AlfaRed<span> Órdenes de trabajo</span></Link><nav className="navbar"><Link href="/tecnico">Gestión técnica</Link><Link href="/cuenta">Mi cuenta</Link></nav></header>
    <main className="container-narrow" style={{ padding: '3rem 1rem' }}>
      <h1 className="heading">Mis órdenes de trabajo</h1>
      <p className="muted">Solo se muestran órdenes asignadas al técnico autenticado.</p>
      {message && <p role="status" style={{ color: '#187a3d' }}>{message}</p>}
      {error && <p role="alert" style={{ color: '#b42318' }}>{error}</p>}
      <section className="card"><div className="card-body" style={{ overflowX: 'auto' }}>
        {loading ? <p>Cargando órdenes...</p> : orders.length === 0 ? <p>No tienes órdenes de trabajo asignadas.</p> : <table style={{ width: '100%', borderCollapse: 'collapse' }}><thead><tr>{['ID', 'Cliente', 'Estado', 'Fecha', 'Mantenimiento', 'Actualizar'].map((title) => <th key={title} style={{ textAlign: 'left', padding: '.7rem', borderBottom: '1px solid #ddd' }}>{title}</th>)}</tr></thead><tbody>{orders.map((order) => <tr key={order.id_orden}><td style={{ padding: '.7rem' }}>{order.id_orden}</td><td style={{ padding: '.7rem' }}>{order.nombre_cliente || order.cliente_id}</td><td style={{ padding: '.7rem' }}>{order.estado}</td><td style={{ padding: '.7rem' }}>{new Date(order.fecha_registro).toLocaleString()}</td><td style={{ padding: '.7rem', minWidth: '240px' }}><textarea className="box" placeholder="Descripción" value={maintenance[order.id_orden]?.description || ''} onChange={(event) => setMaintenance({ ...maintenance, [order.id_orden]: { description: event.target.value } })} /><button type="button" className="btn" onClick={() => registerMaintenance(order.id_orden)}>Registrar mantenimiento</button></td><td style={{ padding: '.7rem' }}><select className="box" value={order.estado} onChange={(event) => updateState(order.id_orden, event.target.value)}>{STATES.map((state) => <option key={state} value={state}>{state}</option>)}</select></td></tr>)}</tbody></table>}
      </div></section>
    </main>
  </>;
}

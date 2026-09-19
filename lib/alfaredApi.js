'use client';

const API_BASE = '/api/alfared';

function getApiUrlBase() {
  if (typeof window === 'undefined') {
    return API_BASE;
  }
  try {
    const o = window.location.origin;
    if (o && o !== 'null' && /^https?:\/\//i.test(o)) {
      return `${String(o).replace(/\/$/, '')}${API_BASE}`;
    }
  } catch (_) {}
  return API_BASE;
}

const getToken = () => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('alfared_token');
};

function alfaredSanitizeBodyForLog(bodyStr) {
  if (bodyStr == null || bodyStr === '') return undefined;
  try {
    const o = typeof bodyStr === 'string' ? JSON.parse(bodyStr) : bodyStr;
    if (typeof o !== 'object' || o === null) return bodyStr;
    const copy = { ...o };
    ['contrasena', 'password', 'token'].forEach((k) => {
      if (copy[k] != null && copy[k] !== '') copy[k] = '***';
    });
    return copy;
  } catch (_) {
    return '(cuerpo no JSON)';
  }
}

const apiFetch = async (endpoint, options = {}) => {
  const { __actionLabel, ...fetchOpts } = options;
  const token = getToken();
  const defaultHeaders = { 'Content-Type': 'application/json' };
  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`;
  }

  const method = (fetchOpts.method || 'GET').toUpperCase();
  const base = getApiUrlBase().replace(/\/$/, '');
  const ep = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const fullUrl = `${base}${ep}`;
  const label = __actionLabel || endpoint;

  console.info(`[AlfaRed API] → ${method} ${fullUrl}`, {
    acción: label,
    auth: token ? 'Bearer (token en cabecera)' : 'sin sesión',
    cuerpo: fetchOpts.body ? alfaredSanitizeBodyForLog(fetchOpts.body) : undefined,
  });

  const config = {
    ...fetchOpts,
    headers: { ...defaultHeaders, ...fetchOpts.headers },
  };

  try {
    const response = await fetch(fullUrl, config);
    let data;
    try {
      data = await response.json();
    } catch (_) {
      data = { success: false, error: 'Respuesta no JSON', code: 'INVALID_JSON' };
    }

    const resumen = data && typeof data === 'object' ? {
      success: data.success,
      code: data.code,
      message: data.message,
      error: data.error,
    } : data;

    console.info(`[AlfaRed API] ← ${response.status} ${method} ${fullUrl}`, {
      acción: label,
      ok: response.ok,
      respuesta: resumen,
    });

    if (!response.ok) {
      console.error('[AlfaRed API] Error HTTP:', data);
    }

    return data;
  } catch (error) {
    console.error('[AlfaRed API] Error de red:', fullUrl, error);
    return { success: false, error: 'No se pudo conectar con el servidor.', code: 'NETWORK_ERROR' };
  }
};

const refreshSessionFromServer = async () => {
  const token = getToken();
  if (!token) {
    return { success: false, skipped: true };
  }
  const res = await apiFetch('/auth/me', {
    method: 'GET',
    __actionLabel: 'Sincronizar sesión con servidor (perfil)',
  });
  if (res && res.success && res.data) {
    const u = res.data;
    localStorage.setItem(
      'alfared_usuario',
      JSON.stringify({
        id_usuario: u.id_usuario,
        email: u.email,
        tipo: u.tipo,
        nombre: u.nombre,
        apellido: u.apellido,
      })
    );
    return res;
  }
  if (res && (res.code === 'INVALID_TOKEN' || res.code === 'NO_TOKEN')) {
    logout();
  }
  return res;
};

const login = async (email, contrasena) => {
  const response = await apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, contrasena }),
    __actionLabel: 'Inicio de sesión',
  });

  if (response.success && response.data.token) {
    localStorage.setItem('alfared_token', response.data.token);
    if (response.data.usuario) {
      localStorage.setItem('alfared_usuario', JSON.stringify(response.data.usuario));
    }
    await refreshSessionFromServer();
  }

  return response;
};

const logout = () => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('alfared_token');
  localStorage.removeItem('alfared_usuario');
};

const register = async (userData) => {
  const { nombre, apellido, email, contrasena } = userData || {};
  return await apiFetch('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ nombre, apellido, email, contrasena }),
    __actionLabel: 'Registro de cuenta cliente',
  });
};

const getStoredUsuario = () => {
  if (typeof window === 'undefined') return null;
  try {
    const s = localStorage.getItem('alfared_usuario');
    return s ? JSON.parse(s) : null;
  } catch (_) {
    return null;
  }
};

const getFacturasByCliente = async (clienteId) => {
  return await apiFetch(`/facturas/${clienteId}`, {
    __actionLabel: `Facturas del usuario ${clienteId}`,
  });
};

const getPagosByUsuario = async (usuarioId) => {
  return await apiFetch(`/pagos/${usuarioId}`, {
    __actionLabel: `Pagos (JWT) usuario ${usuarioId}`,
  });
};

/** Registra el pago de una factura PENDIENTE vía procedimiento pagar_factura. */
const pagarFactura = async (factura_id, metodo_pago = 'transferencia') => {
  return await apiFetch('/pagos', {
    method: 'POST',
    body: JSON.stringify({ factura_id, metodo_pago }),
    __actionLabel: `Pagar factura #${factura_id}`,
  });
};

const getPagosPorUsuarioPublico = async (usuarioId) => {
  return await apiFetch(`/pagos-por-usuario/${usuarioId}`, {
    __actionLabel: `Historial pagos público usuario ${usuarioId}`,
  });
};

const getPqrsPorUsuarioPublico = async (usuarioId) => {
  return await apiFetch(`/pqrs/listado/${usuarioId}`, {
    __actionLabel: `PQRS listado público usuario ${usuarioId}`,
  });
};

const createPqrs = async (tipo, descripcion, solicitante_id) => {
  return await apiFetch('/pqrs', {
    method: 'POST',
    body: JSON.stringify({ tipo, descripcion, solicitante_id }),
    __actionLabel: 'Crear PQRS',
  });
};

const getPqrsTodas = async () => {
  return await apiFetch('/pqrs/todas', {
    __actionLabel: 'Gestión PQRS: listar todas',
  });
};

const tomarPqrs = async (id) => {
  return await apiFetch(`/pqrs/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ accion: 'tomar' }),
    __actionLabel: `Gestión PQRS: tomar caso #${id}`,
  });
};

const cerrarPqrs = async (id, respuesta_final) => {
  return await apiFetch(`/pqrs/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ accion: 'cerrar', respuesta_final }),
    __actionLabel: `Gestión PQRS: cerrar caso #${id}`,
  });
};

const getDashboardData = async (usuarioId) => {
  return await apiFetch(`/dashboard/${usuarioId}`, {
    __actionLabel: `Dashboard usuario ${usuarioId}`,
  });
};

const solicitudFacturaPlan = async (payload) => {
  return await apiFetch('/planes/solicitud-factura', {
    method: 'POST',
    body: JSON.stringify(payload),
    __actionLabel: 'Contratar plan — crear factura',
  });
};

const mercadoPagoPreferencia = async (factura_id) => {
  return await apiFetch('/pagos/mercadopago/preferencia', {
    method: 'POST',
    body: JSON.stringify({
      factura_id,
      frontend_base: typeof window !== 'undefined' ? window.location.origin : '',
    }),
    __actionLabel: 'Mercado Pago: checkout plan internet',
  });
};

const getUserDataFromToken = () => {
  const token = getToken();
  if (!token) return null;
  try {
    const payloadBase64 = token.split('.')[1];
    const decodedPayload = atob(payloadBase64);
    return JSON.parse(decodedPayload);
  } catch (error) {
    console.error('Error al decodificar el token:', error);
    return null;
  }
};

const mostrarMensaje = (mensaje, tipo) => {
  if (typeof window === 'undefined') return;
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${tipo}`;
  messageDiv.textContent = mensaje;
  messageDiv.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 15px;
    border-radius: 5px;
    color: white;
    z-index: 1000;
    background-color: ${tipo === 'success' ? '#4CAF50' : '#f44336'};
  `;
  document.body.appendChild(messageDiv);
  setTimeout(() => { messageDiv.remove(); }, 3000);
};

export {
  apiFetch,
  getToken,
  login,
  logout,
  register,
  getStoredUsuario,
  refreshSessionFromServer,
  getFacturasByCliente,
  getPagosByUsuario,
  pagarFactura,
  getPagosPorUsuarioPublico,
  getPqrsPorUsuarioPublico,
  getPqrsTodas,
  createPqrs,
  tomarPqrs,
  cerrarPqrs,
  getDashboardData,
  solicitudFacturaPlan,
  mercadoPagoPreferencia,
  getUserDataFromToken,
  mostrarMensaje,
  API_BASE,
};

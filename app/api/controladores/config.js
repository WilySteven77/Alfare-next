/**
 * @file config.js
 * @description Funciones de utilidad para interactuar con la API del backend de AlfaRed.
 */

/**
 * Base URL del API. Prioriza meta alfared-api-base (útil si el HTML corre en otro puerto que el backend).
 * Evita origin inválido (file://, "null") que arma URLs incorrectas.
 */
function getApiUrlBase() {
    if (typeof window === 'undefined') {
        return 'http://localhost:3000/api/alfared';
    }
    try {
        const meta = typeof document !== 'undefined' && document.querySelector('meta[name="alfared-api-base"]');
        const fromMeta = meta && meta.getAttribute('content');
        if (fromMeta && String(fromMeta).trim()) {
            return String(fromMeta).trim().replace(/\/$/, '');
        }
        const o = window.location.origin;
        if (o && o !== 'null' && /^https?:\/\//i.test(o)) {
            return `${String(o).replace(/\/$/, '')}/api/alfared`;
        }
    } catch (_) {}
    return 'http://localhost:3000/api/alfared';
}

/**
 * Obtiene el token de autenticación guardado en localStorage.
 * @returns {string|null} El token JWT o null si no existe.
 */
const getToken = () => {
    return localStorage.getItem('alfared_token');
};

/** Oculta campos sensibles en logs de depuración (Consola / correlación con pestaña Red). */
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

/**
 * Realiza una petición a la API con manejo de autenticación.
 * Cada llamada queda registrada en Consola como [AlfaRed API] y aparece en la pestaña Red del navegador.
 * @param {string} endpoint El endpoint de la API al que se llamará (ej. '/auth/login').
 * @param {object} options Opciones para la función fetch (method, headers, body). Opcional: __actionLabel (texto para el log).
 * @returns {Promise<object>} La respuesta de la API en formato JSON.
 */
const apiFetch = async (endpoint, options = {}) => {
    const { __actionLabel, ...fetchOpts } = options;
    const token = getToken();
    const defaultHeaders = {
        'Content-Type': 'application/json',
    };

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
        headers: {
            ...defaultHeaders,
            ...fetchOpts.headers,
        },
    };

    try {
        const response = await fetch(fullUrl, config);
        let data;
        try {
            data = await response.json();
        } catch (_) {
            data = { success: false, error: 'Respuesta no JSON', code: 'INVALID_JSON' };
        }

        const resumen =
            data && typeof data === 'object'
                ? {
                      success: data.success,
                      code: data.code,
                      message: data.message,
                      error: data.error,
                  }
                : data;

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

/**
 * Sincroniza localStorage con el perfil del servidor (GET /auth/me).
 * Útil si el rol o datos cambian en BD sin cerrar sesión.
 * @returns {Promise<object>}
 */
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

// =======================================================
//                FUNCIONES DE AUTENTICACIÓN
// =======================================================

/**
 * Inicia sesión de un usuario.
 * @param {string} email 
 * @param {string} contrasena 
 * @returns {Promise<object>} La respuesta de la API.
 */
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

/**
 * Cierra la sesión del usuario eliminando el token.
 */
const logout = () => {
    localStorage.removeItem('alfared_token');
    localStorage.removeItem('alfared_usuario');
};

/**
 * Registra un nuevo usuario cliente (el servidor asigna el rol; no envíes rol_id).
 * @param {object} userData { nombre, apellido, email, contrasena }
 */
const register = async (userData) => {
    const { nombre, apellido, email, contrasena } = userData || {};
    return await apiFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ nombre, apellido, email, contrasena }),
        __actionLabel: 'Registro de cuenta cliente',
    });
};

/** Datos de sesión guardados tras login (id_usuario, email, tipo). */
const getStoredUsuario = () => {
    try {
        const s = localStorage.getItem('alfared_usuario');
        return s ? JSON.parse(s) : null;
    } catch (_) {
        return null;
    }
};

// =======================================================
//                FUNCIONES DE LA APLICACIÓN
// =======================================================

/**
 * Obtiene las facturas de un cliente.
 * @param {number} clienteId El ID del cliente.
 * @returns {Promise<object>} La respuesta de la API.
 */
const getFacturasByCliente = async (clienteId) => {
    return await apiFetch(`/facturas/${clienteId}`, {
        __actionLabel: `Facturas del usuario ${clienteId}`,
    });
};

/**
 * Obtiene el historial de pagos de un usuario.
 * @param {number} usuarioId El ID del usuario.
 * @returns {Promise<object>} La respuesta de la API.
 */
const getPagosByUsuario = async (usuarioId) => {
    return await apiFetch(`/pagos/${usuarioId}`, {
        __actionLabel: `Pagos (JWT) usuario ${usuarioId}`,
    });
};

/** Historial de pagos por usuario (sin JWT; misma regla que facturas por ID). */
const getPagosPorUsuarioPublico = async (usuarioId) => {
    return await apiFetch(`/pagos-por-usuario/${usuarioId}`, {
        __actionLabel: `Historial pagos público usuario ${usuarioId}`,
    });
};

/** PQRS del solicitante (sin JWT). Usa ruta estable /pqrs/listado/:id */
const getPqrsPorUsuarioPublico = async (usuarioId) => {
    return await apiFetch(`/pqrs/listado/${usuarioId}`, {
        __actionLabel: `PQRS listado público usuario ${usuarioId}`,
    });
};

/**
 * Crea una nueva PQRS.
 * @param {string} tipo El tipo de PQRS (PETICION, QUEJA, etc.).
 * @param {string} descripcion La descripción detallada.
 * @returns {Promise<object>} La respuesta de la API.
 */
const createPqrs = async (tipo, descripcion) => {
    return await apiFetch('/pqrs', {
        method: 'POST',
        body: JSON.stringify({ tipo, descripcion }),
        __actionLabel: 'Crear PQRS (API genérica)',
    });
};

/**
 * Obtiene los datos del dashboard para un usuario.
 * @param {number} usuarioId El ID del usuario.
 * @returns {Promise<object>} La respuesta de la API.
 */
const getDashboardData = async (usuarioId) => {
    return await apiFetch(`/dashboard/${usuarioId}`, {
        __actionLabel: `Dashboard usuario ${usuarioId}`,
    });
};

/**
 * Cliente autenticado: crea factura PENDIENTE por plan de internet (previo a Mercado Pago).
 */
const solicitudFacturaPlan = async (payload) => {
    return await apiFetch('/planes/solicitud-factura', {
        method: 'POST',
        body: JSON.stringify(payload),
        __actionLabel: 'Contratar plan — crear factura',
    });
};


// Ejemplo de cómo decodificar el token para obtener datos del usuario en el frontend
const getUserDataFromToken = () => {
    const token = getToken();
    if (!token) return null;
    try {
        // El token se divide en 3 partes: header, payload, signature
        const payloadBase64 = token.split('.')[1];
        const decodedPayload = atob(payloadBase64);
        return JSON.parse(decodedPayload);
    } catch (error) {
        console.error('Error al decodificar el token:', error);
        return null;
    }
};

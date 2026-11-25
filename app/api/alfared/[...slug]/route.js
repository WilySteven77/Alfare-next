import { createHmac, timingSafeEqual } from 'node:crypto';
import { pool, query, pingDb, dbConfigMissing } from '@/lib/db';

function json(body, status = 200, headers = {}) {
  return Response.json(body, { status, headers });
}

function parseBody(req) {
  return req.json().catch(() => ({}));
}

function dbConfigError() {
  const missing = dbConfigMissing();
  if (!missing.length) return null;
  return json({
    success: false,
    error: `Faltan variables de entorno: ${missing.join(', ')}. Usa .env.dev, .env.test o .env.prod, o copia .env.example a .env.`,
    code: 'DB_CONFIG',
  }, 503);
}

function dbFail(err) {
  console.error('[AlfaRed DB]', err);
  return json({
    success: false,
    error: err.message || 'No se pudo conectar a PostgreSQL.',
    code: 'DB_ERROR',
  }, 503);
}

function normalizarRol(nombre) {
  const n = String(nombre || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (n.includes('admin')) return 'administrador';
  if (n.includes('tecnic')) return 'tecnico';
  if (n.includes('contador')) return 'contador';
  return 'cliente';
}

function usuarioPublico(row) {
  return {
    id_usuario: row.id_usuario,
    nombre: row.nombre,
    apellido: row.apellido,
    email: row.email,
    tipo: normalizarRol(row.rol_nombre || row.tipo),
  };
}

function authSecret() {
  return process.env.AUTH_SECRET || 'dev-only-change-this-secret';
}

function base64url(value) {
  return Buffer.from(value).toString('base64url');
}

function generarToken(usuario) {
  const payload = base64url(JSON.stringify({
    id_usuario: usuario.id_usuario,
    email: usuario.email,
    tipo: usuario.tipo,
    nombre: usuario.nombre,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 8,
  })).toString('base64');
  const signature = createHmac('sha256', authSecret()).update(payload).digest('base64url');
  return `alfared.${payload}.${signature}`;
}

function usuarioDesdeToken(req) {
  const authHeader = req.headers.get('authorization');
  const cookieHeader = req.headers.get('cookie') || '';
  const cookieToken = cookieHeader.split(';').map((part) => part.trim()).find((part) => part.startsWith('alfared_session='))?.split('=')[1];
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : cookieToken;
  if (!token) return null;
  try {
    const [prefix, payload, signature] = token.split('.');
    if (prefix !== 'alfared' || !payload || !signature) return null;
    const expected = createHmac('sha256', authSecret()).update(payload).digest('base64url');
    if (signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
    const user = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!user.exp || user.exp < Math.floor(Date.now() / 1000)) return null;
    return user;
  } catch (_) {
    return null;
  }
}

async function requireRole(req, roles = []) {
  const tokenUser = usuarioDesdeToken(req);
  if (!tokenUser?.id_usuario) return { error: json({ success: false, error: 'No autenticado', code: 'NO_TOKEN' }, 401) };
  const row = await getUsuarioPorId(tokenUser.id_usuario);
  if (!row || row.activo === false) return { error: json({ success: false, error: 'Sesión inválida', code: 'INVALID_TOKEN' }, 401) };
  const role = normalizarRol(row.rol_nombre);
  if (roles.length && !roles.includes(role)) return { error: json({ success: false, error: 'No autorizado', code: 'ACCESS_DENIED' }, 403) };
  return { user: { ...usuarioPublico(row), role } };
}

function sessionCookie(token) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `alfared_session=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=28800${secure}`;
}

function estadoPqrsUi(estadoDb) {
  const e = String(estadoDb || '').toUpperCase();
  if (e === 'PENDIENTE') return 'NUEVO';
  if (e === 'EN_PROCESO') return 'EN_PROCESO';
  if (e === 'CERRADA' || e === 'RESUELTA' || e === 'CERRADO') return 'CERRADO';
  return estadoDb;
}

function mapPqrs(row) {
  const estado = estadoPqrsUi(row.estado);
  const fecha = row.fecha_creacion ? new Date(row.fecha_creacion).toISOString() : null;
  return {
    id: row.id_pqrs,
    id_pqrs: row.id_pqrs,
    usuarioId: row.solicitante_id,
    usuario_id: row.solicitante_id,
    solicitante_id: row.solicitante_id,
    tipo: row.tipo,
    mensaje: row.descripcion,
    descripcion: row.descripcion,
    estado,
    estado_db: row.estado,
    fecha,
    fecha_creacion: fecha,
  };
}

function mapFactura(row) {
  return {
    id_factura: row.id_factura,
    usuario_id: row.usuario_id,
    monto: Number(row.monto),
    fecha_emision: row.fecha_emision,
    fecha_vencimiento: row.fecha_vencimiento,
    estado: row.estado,
  };
}

function mapPago(row) {
  return {
    id_pago: row.id_pago,
    factura_id: row.factura_id,
    usuario_id: row.usuario_id,
    monto: Number(row.monto),
    estado: row.estado,
    metodo_pago: row.metodo_pago,
    fecha_pago: row.fecha_pago,
  };
}

async function getUsuarioPorId(id) {
  const result = await query(
    `SELECT u.id_usuario, u.nombre, u.apellido, u.email, u.activo, r.nombre AS rol_nombre
     FROM Usuarios u
     JOIN Roles r ON r.id_rol = u.rol_id
     WHERE u.id_usuario = $1`,
    [id]
  );
  return result.rows[0] || null;
}

async function getRolClienteId() {
  const result = await query(
    `SELECT id_rol FROM Roles
     WHERE UPPER(nombre) IN ('CLIENTE', 'CLIENT', 'USUARIO')
     ORDER BY id_rol
     LIMIT 1`
  );
  return result.rows[0]?.id_rol || null;
}

async function handleRequest(req, slug) {
  const method = req.method;
  const path = (slug || []).map((s) => (typeof s === 'string' ? s.toLowerCase() : s));

  if (path[0] === 'auth' && path[1] === 'logout' && method === 'POST') {
    return json({ success: true, message: 'Sesión cerrada' }, 200, {
      'Set-Cookie': 'alfared_session=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0',
    });
  }

  const configErr = dbConfigError();
  if (configErr) return configErr;

  try {
    if (path.length === 0 || (path[0] === 'health' && method === 'GET')) {
      const info = await pingDb();
      return json({
        success: true,
        data: { service: 'AlfaRed API', version: '1.0', database: info },
        message: 'API AlfaRed conectada a PostgreSQL',
      });
    }

    if (path[0] === 'auth') {
      if (path[1] === 'login' && method === 'POST') {
        const { email, contrasena } = await parseBody(req);
        const result = await query(
          `SELECT u.id_usuario, u.nombre, u.apellido, u.email, u.contrasena, u.activo, r.nombre AS rol_nombre
           FROM Usuarios u
           JOIN Roles r ON r.id_rol = u.rol_id
           WHERE LOWER(u.email) = LOWER($1)`,
          [email]
        );
        const row = result.rows[0];
        if (!row || String(row.contrasena) !== String(contrasena)) {
          return json({ success: false, error: 'Credenciales inválidas', code: 'INVALID_CREDENTIALS' }, 401);
        }
        if (row.activo === false) {
          return json({ success: false, error: 'Usuario inactivo', code: 'USER_INACTIVE' }, 403);
        }
        await query('UPDATE Usuarios SET activo = TRUE WHERE id_usuario = $1', [row.id_usuario]);
        const usuario = usuarioPublico(row);
        const token = generarToken(usuario);
        return json({
          success: true,
          data: { token, usuario },
          message: 'Login exitoso',
        }, 200, { 'Set-Cookie': sessionCookie(token) });
      }

      if (path[1] === 'register' && method === 'POST') {
        const { nombre, apellido, email, contrasena } = await parseBody(req);
        if (!nombre || !email || !contrasena) {
          return json({ success: false, error: 'Faltan campos requeridos', code: 'VALIDATION_ERROR' }, 400);
        }
        const existe = await query('SELECT 1 FROM Usuarios WHERE LOWER(email) = LOWER($1)', [email]);
        if (existe.rowCount) {
          return json({ success: false, error: 'El correo ya está registrado', code: 'EMAIL_EXISTS' }, 409);
        }
        const rolId = await getRolClienteId();
        if (!rolId) {
          return json({ success: false, error: 'No existe el rol CLIENTE en la base de datos.', code: 'ROLE_MISSING' }, 500);
        }
        const inserted = await query(
          `INSERT INTO Usuarios (nombre, apellido, email, contrasena, rol_id)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING id_usuario, nombre, apellido, email`,
          [nombre, apellido || '', email, contrasena, rolId]
        );
        const usuario = { ...inserted.rows[0], tipo: 'cliente' };
        return json({ success: true, data: { usuario }, message: 'Usuario registrado exitosamente' }, 201);
      }

      if (path[1] === 'me' && method === 'GET') {
        const tokenUser = usuarioDesdeToken(req);
        if (!tokenUser?.id_usuario) {
          return json({ success: false, error: 'No se proporcionó token', code: 'NO_TOKEN' }, 401);
        }
        const row = await getUsuarioPorId(tokenUser.id_usuario);
        if (!row) {
          return json({ success: false, error: 'Token inválido', code: 'INVALID_TOKEN' }, 401);
        }
        return json({ success: true, data: usuarioPublico(row), message: 'Sesión válida' });
      }

      if (path[1] === 'logout' && method === 'POST') {
        return json({ success: true, message: 'Sesión cerrada' }, 200, {
          'Set-Cookie': 'alfared_session=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0',
        });
      }
    }

    if (path[0] === 'tecnico' && path[1] === 'clientes') {
      const auth = await requireRole(req, ['tecnico']);
      if (auth.error) return auth.error;

      const serviceTypes = ['INTERNET', 'TELEVISION', 'TECNOLOGIA', 'ELECTRICO'];
      const mapCliente = (row) => ({
        id_cliente: row.id_cliente,
        nombre_completo: row.nombre_completo,
        cedula: row.cedula,
        email: row.email,
        telefono: row.telefono,
        direccion: row.direccion,
        tipo_servicio: row.tipo_servicio,
        observaciones: row.observaciones,
        activo: row.activo,
        fecha_registro: row.fecha_registro,
      });

      if (path.length === 2 && method === 'GET') {
        const search = String(new URL(req.url).searchParams.get('search') || '').trim();
        const like = `%${search}%`;
        const result = await query(
          `SELECT id_cliente, nombre_completo, cedula, email, telefono, direccion,
                  tipo_servicio, observaciones, activo, fecha_registro
           FROM ClientesServicio
           WHERE activo = TRUE
             AND ($1 = '' OR nombre_completo ILIKE $2 OR cedula ILIKE $2 OR email ILIKE $2 OR telefono ILIKE $2)
           ORDER BY nombre_completo ASC, id_cliente ASC
           LIMIT 200`,
          [search, like]
        );
        return json({ success: true, data: result.rows.map(mapCliente), message: 'Usuarios de servicio cargados' });
      }

      if (path.length === 2 && method === 'POST') {
        const body = await parseBody(req);
        const { nombre_completo, cedula, email, telefono, direccion, tipo_servicio, observaciones } = body;
        if (![nombre_completo, cedula, email, telefono, direccion, tipo_servicio].every((value) => String(value || '').trim())) {
          return json({ success: false, error: 'Nombre, cédula, email, teléfono, dirección y tipo de servicio son obligatorios', code: 'VALIDATION_ERROR' }, 400);
        }
        const normalizedType = String(tipo_servicio).toUpperCase();
        if (!serviceTypes.includes(normalizedType)) return json({ success: false, error: 'Tipo de servicio inválido', code: 'INVALID_SERVICE_TYPE' }, 400);
        try {
          const result = await query(
            `INSERT INTO ClientesServicio
              (nombre_completo, cedula, email, telefono, direccion, tipo_servicio, observaciones, creado_por)
             VALUES ($1, $2, LOWER($3), $4, $5, $6, $7, $8)
             RETURNING id_cliente, nombre_completo, cedula, email, telefono, direccion,
                       tipo_servicio, observaciones, activo, fecha_registro`,
            [String(nombre_completo).trim(), String(cedula).trim(), String(email).trim(), String(telefono).trim(), String(direccion).trim(), normalizedType, observaciones ? String(observaciones).trim() : null, auth.user.id_usuario]
          );
          return json({ success: true, data: mapCliente(result.rows[0]), message: 'Usuario de servicio creado' }, 201);
        } catch (err) {
          if (err.code === '23505') return json({ success: false, error: 'La cédula o el email ya están registrados', code: 'DUPLICATE_CLIENT' }, 409);
          throw err;
        }
      }

      const clientId = Number(path[2]);
      if (!Number.isInteger(clientId) || clientId < 1) return json({ success: false, error: 'ID de usuario inválido', code: 'INVALID_ID' }, 400);

      if (path.length === 3 && method === 'PATCH') {
        const body = await parseBody(req);
        const { nombre_completo, cedula, email, telefono, direccion, tipo_servicio, observaciones } = body;
        if (![nombre_completo, cedula, email, telefono, direccion, tipo_servicio].every((value) => String(value || '').trim())) return json({ success: false, error: 'Todos los campos obligatorios deben estar completos', code: 'VALIDATION_ERROR' }, 400);
        const normalizedType = String(tipo_servicio).toUpperCase();
        if (!serviceTypes.includes(normalizedType)) return json({ success: false, error: 'Tipo de servicio inválido', code: 'INVALID_SERVICE_TYPE' }, 400);
        try {
          const result = await query(
            `UPDATE ClientesServicio
             SET nombre_completo = $1, cedula = $2, email = LOWER($3), telefono = $4,
                 direccion = $5, tipo_servicio = $6, observaciones = $7,
                 fecha_actualizacion = CURRENT_TIMESTAMP
             WHERE id_cliente = $8 AND activo = TRUE
             RETURNING id_cliente, nombre_completo, cedula, email, telefono, direccion,
                       tipo_servicio, observaciones, activo, fecha_registro`,
            [String(nombre_completo).trim(), String(cedula).trim(), String(email).trim(), String(telefono).trim(), String(direccion).trim(), normalizedType, observaciones ? String(observaciones).trim() : null, clientId]
          );
          if (!result.rows[0]) return json({ success: false, error: 'Usuario de servicio no encontrado', code: 'NOT_FOUND' }, 404);
          return json({ success: true, data: mapCliente(result.rows[0]), message: 'Usuario de servicio actualizado' });
        } catch (err) {
          if (err.code === '23505') return json({ success: false, error: 'La cédula o el email ya están registrados', code: 'DUPLICATE_CLIENT' }, 409);
          throw err;
        }
      }

      if (path.length === 3 && method === 'DELETE') {
        const result = await query(
          `UPDATE ClientesServicio SET activo = FALSE, fecha_actualizacion = CURRENT_TIMESTAMP
           WHERE id_cliente = $1 AND activo = TRUE RETURNING id_cliente`,
          [clientId]
        );
        if (!result.rows[0]) return json({ success: false, error: 'Usuario de servicio no encontrado', code: 'NOT_FOUND' }, 404);
        return json({ success: true, data: result.rows[0], message: 'Usuario retirado del listado operativo' });
      }
    }

    if (path[0] === 'tecnico' && path[1] === 'incidencias') {
      const auth = await requireRole(req, ['tecnico']);
      if (auth.error) return auth.error;
      const validTypes = ['INSTALACION', 'SERVICIO', 'DANO'];
      const validPriorities = ['ALTA', 'MEDIA', 'BAJA'];
      const mapIncident = (row) => ({
        id_incidencia: row.id_incidencia,
        cliente_id: row.cliente_id,
        nombre_cliente: row.nombre_cliente,
        titular: row.titular,
        tipo: row.tipo,
        prioridad: row.prioridad,
        descripcion: row.descripcion,
        ubicacion: row.ubicacion,
        estado: row.estado,
        fecha_registro: row.fecha_registro,
        fecha_atencion: row.fecha_atencion,
      });

      if (path.length === 2 && method === 'GET') {
        const requestedType = String(new URL(req.url).searchParams.get('tipo') || 'TODAS').toUpperCase();
        if (requestedType !== 'TODAS' && !validTypes.includes(requestedType)) return json({ success: false, error: 'Tipo de incidencia inválido', code: 'INVALID_INCIDENT_TYPE' }, 400);
        const result = await query(
          `SELECT id_incidencia, cliente_id, nombre_cliente, titular, tipo, prioridad,
                  descripcion, ubicacion, estado, fecha_registro, fecha_atencion
           FROM Incidencias
           WHERE estado = 'PENDIENTE'
             AND ($1 = 'TODAS' OR tipo = $1)
           ORDER BY CASE prioridad WHEN 'ALTA' THEN 1 WHEN 'MEDIA' THEN 2 WHEN 'BAJA' THEN 3 END,
                    fecha_registro ASC, id_incidencia ASC`,
          [requestedType]
        );
        return json({ success: true, data: result.rows.map(mapIncident), message: 'Incidencias pendientes cargadas' });
      }

      if (path.length === 2 && method === 'POST') {
        const body = await parseBody(req);
        const { cliente_id, titular, tipo, prioridad, descripcion, ubicacion } = body;
        const clientId = Number(cliente_id);
        const normalizedType = String(tipo || '').toUpperCase();
        const normalizedPriority = String(prioridad || '').toUpperCase();
        if (!Number.isInteger(clientId) || clientId < 1 || !String(titular || '').trim() || !String(descripcion || '').trim() || !String(ubicacion || '').trim()) return json({ success: false, error: 'Cliente, titular, descripción y ubicación son obligatorios', code: 'VALIDATION_ERROR' }, 400);
        if (!validTypes.includes(normalizedType)) return json({ success: false, error: 'Tipo de incidencia inválido', code: 'INVALID_INCIDENT_TYPE' }, 400);
        if (!validPriorities.includes(normalizedPriority)) return json({ success: false, error: 'Prioridad inválida', code: 'INVALID_PRIORITY' }, 400);
        const result = await query(
          `INSERT INTO Incidencias (cliente_id, nombre_cliente, titular, tipo, prioridad, descripcion, ubicacion)
           SELECT $1, nombre_completo, $2, $3, $4, $5, $6
           FROM ClientesServicio WHERE id_cliente = $1 AND activo = TRUE
           RETURNING id_incidencia, cliente_id, nombre_cliente, titular, tipo, prioridad,
                     descripcion, ubicacion, estado, fecha_registro, fecha_atencion`,
          [clientId, String(titular).trim(), normalizedType, normalizedPriority, String(descripcion).trim(), String(ubicacion).trim()]
        );
        if (!result.rows[0]) return json({ success: false, error: 'Usuario de servicio no encontrado o inactivo', code: 'CLIENT_NOT_FOUND' }, 404);
        return json({ success: true, data: mapIncident(result.rows[0]), message: 'Incidencia registrada' }, 201);
      }

      if (path[2] === 'next' && path.length === 3 && method === 'POST') {
        const body = await parseBody(req);
        const type = String(body.tipo || '').toUpperCase();
        if (!validTypes.includes(type)) return json({ success: false, error: 'Tipo de incidencia inválido', code: 'INVALID_INCIDENT_TYPE' }, 400);
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          const pending = await client.query(
            `SELECT id_incidencia
             FROM Incidencias
             WHERE tipo = $1 AND estado = 'PENDIENTE'
             ORDER BY CASE prioridad WHEN 'ALTA' THEN 1 WHEN 'MEDIA' THEN 2 WHEN 'BAJA' THEN 3 END,
                      fecha_registro ASC, id_incidencia ASC
             FOR UPDATE SKIP LOCKED LIMIT 1`,
            [type]
          );
          if (!pending.rows[0]) {
            await client.query('ROLLBACK');
            return json({ success: false, error: 'No hay incidencias pendientes en esta cola', code: 'QUEUE_EMPTY' }, 404);
          }
          const updated = await client.query(
            `UPDATE Incidencias
             SET estado = 'ATENDIDA', atendida_por = $1, fecha_atencion = CURRENT_TIMESTAMP, fecha_actualizacion = CURRENT_TIMESTAMP
             WHERE id_incidencia = $2
             RETURNING id_incidencia, cliente_id, nombre_cliente, titular, tipo, prioridad,
                       descripcion, ubicacion, estado, fecha_registro, fecha_atencion`,
            [auth.user.id_usuario, pending.rows[0].id_incidencia]
          );
          await client.query('COMMIT');
          return json({ success: true, data: mapIncident(updated.rows[0]), message: 'Incidencia atendida' });
        } catch (err) {
          await client.query('ROLLBACK');
          throw err;
        } finally {
          client.release();
        }
      }
    }

    if (path[0] === 'tecnico' && path[1] === 'ordenes') {
      const auth = await requireRole(req, ['tecnico']);
      if (auth.error) return auth.error;
      const validStates = ['REGISTRADA', 'ASIGNADA', 'EN_PROCESO', 'PAUSADA', 'COMPLETADA', 'CERRADA', 'CANCELADA'];
      const mapOrder = (row) => ({
        id_orden: row.id_orden,
        incidencia_id: row.incidencia_id,
        cliente_id: row.cliente_id,
        nombre_cliente: row.nombre_cliente,
        tecnico_id: row.tecnico_id,
        estado: row.estado,
        fecha_registro: row.fecha_registro,
        fecha_actualizacion: row.fecha_actualizacion,
        fecha_cierre: row.fecha_cierre,
      });

      if (path.length === 2 && method === 'GET') {
        const result = await query(
          `SELECT o.id_orden, o.incidencia_id, o.cliente_id, c.nombre_completo AS nombre_cliente,
                  o.tecnico_id, o.estado, o.fecha_registro, o.fecha_actualizacion, o.fecha_cierre
           FROM OrdenesTrabajo o
           JOIN ClientesServicio c ON c.id_cliente = o.cliente_id
           WHERE o.tecnico_id = $1
           ORDER BY o.fecha_registro DESC, o.id_orden DESC`,
          [auth.user.id_usuario]
        );
        return json({ success: true, data: result.rows.map(mapOrder), message: 'Órdenes del técnico cargadas' });
      }

      const orderId = Number(path[2]);
      if (!Number.isInteger(orderId) || orderId < 1) return json({ success: false, error: 'ID de orden inválido', code: 'INVALID_ID' }, 400);

      if (path.length === 4 && path[3] === 'mantenimientos' && method === 'POST') {
        const { descripcion } = await parseBody(req);
        if (!String(descripcion || '').trim()) return json({ success: false, error: 'La descripción del mantenimiento es obligatoria', code: 'VALIDATION_ERROR' }, 400);
        const result = await query(
          `INSERT INTO Mantenimientos (orden_id, tecnico_id, descripcion, estado)
           SELECT id_orden, $1, $2, 'REGISTRADA'
           FROM OrdenesTrabajo
           WHERE id_orden = $3 AND tecnico_id = $1
           RETURNING id_mantenimiento, orden_id, tecnico_id, descripcion, estado, fecha_registro`,
          [auth.user.id_usuario, String(descripcion).trim(), orderId]
        );
        if (!result.rows[0]) return json({ success: false, error: 'Orden no encontrada o no pertenece al técnico', code: 'ORDER_NOT_FOUND' }, 404);
        return json({ success: true, data: result.rows[0], message: 'Mantenimiento registrado' }, 201);
      }

      if (path.length === 4 && path[3] === 'estado' && method === 'PATCH') {
        const { estado, comentario } = await parseBody(req);
        const nextState = String(estado || '').toUpperCase();
        if (!validStates.includes(nextState)) return json({ success: false, error: 'Estado de orden inválido', code: 'INVALID_ORDER_STATE' }, 400);
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          const current = await client.query('SELECT * FROM OrdenesTrabajo WHERE id_orden = $1 AND tecnico_id = $2 FOR UPDATE', [orderId, auth.user.id_usuario]);
          if (!current.rows[0]) {
            await client.query('ROLLBACK');
            return json({ success: false, error: 'Orden no encontrada', code: 'ORDER_NOT_FOUND' }, 404);
          }
          const previousState = current.rows[0].estado;
          const updated = await client.query(
            `UPDATE OrdenesTrabajo
             SET estado = $1, fecha_actualizacion = CURRENT_TIMESTAMP,
                 fecha_cierre = CASE WHEN $1 IN ('COMPLETADA','CERRADA') THEN CURRENT_TIMESTAMP ELSE fecha_cierre END
             WHERE id_orden = $2 AND tecnico_id = $3
             RETURNING *`,
            [nextState, orderId, auth.user.id_usuario]
          );
          await client.query(
            `INSERT INTO HistorialOrdenes (orden_id, estado_anterior, estado_nuevo, cambiado_por, comentario)
             VALUES ($1, $2, $3, $4, $5)`,
            [orderId, previousState, nextState, auth.user.id_usuario, comentario ? String(comentario).trim() : null]
          );
          await client.query(
            `INSERT INTO NotificarUsuario (usuario_id, mensaje, tipo_notificacion)
             SELECT cs.usuario_id, $1, 'ORDEN_ACTUALIZADA'
             FROM OrdenesTrabajo o JOIN ClientesServicio cs ON cs.id_cliente = o.cliente_id
             WHERE o.id_orden = $2 AND cs.usuario_id IS NOT NULL`,
            [`La orden #${orderId} cambió a ${nextState}`, orderId]
          );
          await client.query('COMMIT');
          return json({ success: true, data: mapOrder(updated.rows[0]), message: 'Estado de orden actualizado' });
        } catch (err) {
          await client.query('ROLLBACK');
          throw err;
        } finally {
          client.release();
        }
      }
    }

    if (path[0] === 'facturas' && path[1] && method === 'GET') {
      const clienteId = Number(path[1]);
      const user = await getUsuarioPorId(clienteId);
      if (!user) {
        return json({ success: false, error: 'Usuario no encontrado', code: 'USER_NOT_FOUND' }, 404);
      }
      const facturas = await query(
        `SELECT id_factura, usuario_id, monto, fecha_emision, fecha_vencimiento, estado
         FROM Facturas WHERE usuario_id = $1 ORDER BY fecha_emision DESC`,
        [clienteId]
      );
      return json({ success: true, data: facturas.rows.map(mapFactura), message: `Facturas del usuario ${clienteId}` });
    }

    if (path[0] === 'pagos' && path[1] === 'mercadopago' && path[2] === 'preferencia' && method === 'POST') {
      const { factura_id } = await parseBody(req);
      const factura = await query('SELECT * FROM Facturas WHERE id_factura = $1', [factura_id]);
      if (!factura.rows[0]) {
        return json({ success: false, error: 'Factura no encontrada', code: 'FACTURA_NOT_FOUND' }, 404);
      }
      const f = mapFactura(factura.rows[0]);
      return json({
        success: true,
        data: { init_point: 'https://www.mercadopago.com.co/checkout/mock', factura_id: f.id_factura, monto: f.monto },
        message: 'Preferencia de Mercado Pago creada',
      });
    }

    if (path[0] === 'pagos' && path[1] && method === 'GET') {
      const usuarioId = Number(path[1]);
      const user = await getUsuarioPorId(usuarioId);
      if (!user) {
        return json({ success: false, error: 'Usuario no encontrado', code: 'USER_NOT_FOUND' }, 404);
      }
      const pagos = await query(
        `SELECT p.id_pago, p.factura_id, f.usuario_id, p.monto, p.estado, p.metodo_pago, p.fecha_pago
         FROM Pagos p
         JOIN Facturas f ON f.id_factura = p.factura_id
         WHERE f.usuario_id = $1
         ORDER BY p.fecha_pago DESC`,
        [usuarioId]
      );
      return json({ success: true, data: pagos.rows.map(mapPago), message: `Pagos del usuario ${usuarioId}` });
    }

    if (path[0] === 'pagos-por-usuario' && path[1] && method === 'GET') {
      const usuarioId = Number(path[1]);
      const user = await getUsuarioPorId(usuarioId);
      if (!user) {
        return json({ success: false, error: 'Usuario no encontrado', code: 'USER_NOT_FOUND' }, 404);
      }
      const pagos = await query(
        `SELECT p.id_pago, p.factura_id, f.usuario_id, p.monto, p.estado, p.metodo_pago, p.fecha_pago
         FROM Pagos p
         JOIN Facturas f ON f.id_factura = p.factura_id
         WHERE f.usuario_id = $1
         ORDER BY p.fecha_pago DESC`,
        [usuarioId]
      );
      return json({ success: true, data: pagos.rows.map(mapPago), message: `Historial de pagos del usuario ${usuarioId}` });
    }

    if (path[0] === 'pqrs') {
      if (path.length === 1 && method === 'POST') {
        const { tipo, descripcion, solicitante_id } = await parseBody(req);
        if (!tipo || !descripcion || !solicitante_id) {
          return json({ success: false, error: 'Faltan campos', code: 'VALIDATION_ERROR' }, 400);
        }
        const user = await getUsuarioPorId(solicitante_id);
        if (!user) {
          return json({ success: false, error: 'Usuario no encontrado', code: 'USER_NOT_FOUND' }, 404);
        }
        const inserted = await query(
          `INSERT INTO PQRS (tipo, descripcion, solicitante_id, estado)
           VALUES ($1, $2, $3, 'PENDIENTE')
           RETURNING *`,
          [String(tipo).toUpperCase(), descripcion, solicitante_id]
        );
        return json({ success: true, data: mapPqrs(inserted.rows[0]), message: 'PQRS registrada exitosamente' }, 201);
      }

      if (path.length === 1 && method === 'GET') {
        const rows = await query('SELECT * FROM PQRS ORDER BY fecha_creacion DESC');
        return json({ success: true, data: rows.rows.map(mapPqrs), message: 'Listado completo de PQRS' });
      }

      if (path[1] === 'listado' && path[2] && method === 'GET') {
        const usuarioId = Number(path[2]);
        const user = await getUsuarioPorId(usuarioId);
        if (!user) {
          return json({ success: false, error: 'Usuario no encontrado', code: 'USER_NOT_FOUND' }, 404);
        }
        const rows = await query(
          'SELECT * FROM PQRS WHERE solicitante_id = $1 ORDER BY fecha_creacion DESC',
          [usuarioId]
        );
        return json({ success: true, data: rows.rows.map(mapPqrs), message: `PQRS del usuario ${usuarioId}` });
      }

      if (path[1] === 'todas' && method === 'GET') {
        const auth = await requireRole(req, ['administrador', 'contador', 'tecnico']);
        if (auth.error) return auth.error;
        const rows = await query('SELECT * FROM PQRS ORDER BY fecha_creacion DESC');
        return json({ success: true, data: rows.rows.map(mapPqrs), message: 'Todas las PQRS' });
      }

      if (path[1] && path.length === 2 && (method === 'PATCH' || method === 'PUT')) {
        const auth = await requireRole(req, ['administrador', 'contador', 'tecnico']);
        if (auth.error) return auth.error;
        const id = Number(path[1]);
        const existing = await query('SELECT * FROM PQRS WHERE id_pqrs = $1', [id]);
        if (!existing.rows[0]) {
          return json({ success: false, error: 'PQRS no encontrada', code: 'NOT_FOUND' }, 404);
        }
        const { accion, respuesta_final } = await parseBody(req);
        const tokenUser = auth.user;
        if (accion === 'tomar') {
          await query(
            `UPDATE PQRS SET estado = 'EN_PROCESO', analista_id = COALESCE($2, analista_id)
             WHERE id_pqrs = $1`,
            [id, tokenUser?.id_usuario || null]
          );
        } else if (accion === 'cerrar') {
          await query(
            `UPDATE PQRS SET estado = 'CERRADA' WHERE id_pqrs = $1`,
            [id]
          );
          if (tokenUser?.id_usuario) {
            await query(
              `INSERT INTO GestionarPQRS (pqrs_id, gestor_id, accion_realizada, observaciones)
               VALUES ($1, $2, 'CERRAR', $3)`,
              [id, tokenUser.id_usuario, respuesta_final || '']
            );
          }
        }
        const updated = await query('SELECT * FROM PQRS WHERE id_pqrs = $1', [id]);
        return json({
          success: true,
          data: mapPqrs(updated.rows[0]),
          message: `PQRS ${accion === 'tomar' ? 'tomada' : 'cerrada'}`,
        });
      }
    }

    if (path[0] === 'dashboard' && path[1] && method === 'GET') {
      const usuarioId = Number(path[1]);
      const user = await getUsuarioPorId(usuarioId);
      if (!user) {
        return json({ success: false, error: 'Usuario no encontrado', code: 'USER_NOT_FOUND' }, 404);
      }
      const facturas = await query('SELECT monto, estado FROM Facturas WHERE usuario_id = $1', [usuarioId]);
      const pagos = await query(
        `SELECT p.id_pago FROM Pagos p
         JOIN Facturas f ON f.id_factura = p.factura_id
         WHERE f.usuario_id = $1`,
        [usuarioId]
      );
      const saldoPendiente = facturas.rows
        .filter((f) => f.estado === 'PENDIENTE')
        .reduce((s, f) => s + Number(f.monto), 0);
      return json({
        success: true,
        data: {
          usuario: normalizarRol(user.rol_nombre),
          totalFacturas: facturas.rowCount,
          totalPagos: pagos.rowCount,
          saldoPendiente,
        },
        message: `Dashboard del usuario ${usuarioId}`,
      });
    }

    if (path[0] === 'planes' && path[1] === 'solicitud-factura' && method === 'POST') {
      const { plan_key, nombre, apellido, email, telefono } = await parseBody(req);
      if (!plan_key || !nombre || !apellido || !email || !telefono) {
        return json({ success: false, error: 'Faltan campos requeridos', code: 'VALIDATION_ERROR' }, 400);
      }
      const planPrecios = { solo: 50000, tv: 65000, diferente: 0 };
      const monto = planPrecios[plan_key] ?? 0;
      const tokenUser = usuarioDesdeToken(req);
      let usuarioId = tokenUser?.id_usuario;
      if (!usuarioId) {
        const found = await query('SELECT id_usuario FROM Usuarios WHERE LOWER(email) = LOWER($1)', [email]);
        usuarioId = found.rows[0]?.id_usuario;
      }
      if (!usuarioId) {
        return json({ success: false, error: 'No hay un usuario asociado para crear la factura.', code: 'USER_NOT_FOUND' }, 404);
      }
      const vencimiento = new Date();
      vencimiento.setDate(vencimiento.getDate() + 30);
      const fechaVenc = vencimiento.toISOString().slice(0, 10);
      const inserted = await query(
        `INSERT INTO Facturas (fecha_vencimiento, monto, estado, metodo_pago_preferido, usuario_id)
         VALUES ($1, $2, 'PENDIENTE', $3, $4)
         RETURNING *`,
        [fechaVenc, monto, plan_key, usuarioId]
      );
      return json({
        success: true,
        data: { factura: { ...mapFactura(inserted.rows[0]), plan_key, concepto: `Plan ${plan_key}` } },
        message: 'Factura creada, procede al pago',
      }, 201);
    }

    return json({ success: false, error: 'Endpoint no encontrado', code: 'NOT_FOUND' }, 404);
  } catch (err) {
    return dbFail(err);
  }
}

function segmentsFrom(req) {
  const url = new URL(req.url);
  return url.pathname.split('/').filter((s) => s && s !== 'api' && s !== 'alfared');
}

export async function GET(req) {
  return handleRequest(req, segmentsFrom(req));
}

export async function POST(req) {
  return handleRequest(req, segmentsFrom(req));
}

export async function PATCH(req) {
  return handleRequest(req, segmentsFrom(req));
}

export async function DELETE(req) {
  return handleRequest(req, segmentsFrom(req));
}

export async function PUT(req) {
  return handleRequest(req, segmentsFrom(req));
}

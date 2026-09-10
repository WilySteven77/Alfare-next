import { query, pingDb, dbConfigMissing } from '@/lib/db';

function json(body, status = 200) {
  return Response.json(body, { status });
}

function parseBody(req) {
  return req.json().catch(() => ({}));
}

function dbConfigError() {
  const missing = dbConfigMissing();
  if (!missing.length) return null;
  return json({
    success: false,
    error: `Faltan variables de entorno: ${missing.join(', ')}. Copia env.example a .env y completa tus datos de PostgreSQL.`,
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

function generarToken(usuario) {
  const payload = Buffer.from(JSON.stringify({
    id_usuario: usuario.id_usuario,
    email: usuario.email,
    tipo: usuario.tipo,
    nombre: usuario.nombre,
  })).toString('base64');
  return `demo-token-${payload}`;
}

function usuarioDesdeToken(req) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  const prefix = 'demo-token-';
  if (!token.startsWith(prefix)) return null;
  try {
    return JSON.parse(Buffer.from(token.slice(prefix.length), 'base64').toString('utf8'));
  } catch (_) {
    return null;
  }
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
  const configErr = dbConfigError();
  if (configErr) return configErr;

  const method = req.method;
  const path = slug || [];

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
        return json({
          success: true,
          data: { token: generarToken(usuario), usuario },
          message: 'Login exitoso',
        });
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
        const rows = await query('SELECT * FROM PQRS ORDER BY fecha_creacion DESC');
        return json({ success: true, data: rows.rows.map(mapPqrs), message: 'Todas las PQRS' });
      }

      if (path[1] && path.length === 2 && (method === 'PATCH' || method === 'PUT')) {
        const id = Number(path[1]);
        const existing = await query('SELECT * FROM PQRS WHERE id_pqrs = $1', [id]);
        if (!existing.rows[0]) {
          return json({ success: false, error: 'PQRS no encontrada', code: 'NOT_FOUND' }, 404);
        }
        const { accion, respuesta_final } = await parseBody(req);
        const tokenUser = usuarioDesdeToken(req);
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

export async function PUT(req) {
  return handleRequest(req, segmentsFrom(req));
}

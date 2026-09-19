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

function mapOrdenServicio(row) {
  return {
    id_orden: row.id_orden,
    cliente_nombre: row.cliente_nombre,
    cliente_cedula: row.cliente_cedula,
    cliente_email: row.cliente_email,
    cliente_telefono: row.cliente_telefono,
    cliente_direccion: row.cliente_direccion,
    tipo_servicio: row.tipo_servicio,
    observaciones: row.observaciones,
    estado: row.estado,
    cliente_id: row.cliente_id,
    tecnico_id: row.tecnico_id,
    tecnico_nombre: row.tecnico_nombre || null,
    fecha_programada: row.fecha_programada,
    fecha_creacion: row.fecha_creacion,
    fecha_cierre: row.fecha_cierre,
    notas_cierre: row.notas_cierre,
  };
}

const TIPOS_ORDEN = new Set([
  'INSTALACION',
  'REPORTE_DANO',
  'MANTENIMIENTO',
  'INTERNET',
  'TELEVISION',
  'TECNOLOGIA',
  'ELECTRICO',
]);

const ESTADOS_ORDEN = new Set(['PENDIENTE', 'EN_CURSO', 'CERRADA', 'CANCELADA']);

let ordenesTablaLista = false;

async function ensureOrdenesServicioTable() {
  if (ordenesTablaLista) return;
  await query(`
    CREATE TABLE IF NOT EXISTS OrdenesServicio (
      id_orden SERIAL PRIMARY KEY,
      cliente_nombre VARCHAR(150) NOT NULL,
      cliente_cedula VARCHAR(30) NOT NULL,
      cliente_email VARCHAR(150),
      cliente_telefono VARCHAR(40) NOT NULL,
      cliente_direccion VARCHAR(255) NOT NULL,
      tipo_servicio VARCHAR(50) NOT NULL
        CHECK (tipo_servicio IN (
          'INSTALACION','REPORTE_DANO','MANTENIMIENTO',
          'INTERNET','TELEVISION','TECNOLOGIA','ELECTRICO'
        )),
      observaciones TEXT,
      estado VARCHAR(30) NOT NULL DEFAULT 'PENDIENTE'
        CHECK (estado IN ('PENDIENTE', 'EN_CURSO', 'CERRADA', 'CANCELADA')),
      cliente_id INT REFERENCES Usuarios(id_usuario) ON DELETE SET NULL,
      tecnico_id INT REFERENCES Usuarios(id_usuario) ON DELETE SET NULL,
      fecha_programada DATE,
      fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      fecha_cierre TIMESTAMP,
      notas_cierre TEXT
    )
  `);
  await query('CREATE INDEX IF NOT EXISTS idx_ordenes_estado ON OrdenesServicio(estado)');
  await query('CREATE INDEX IF NOT EXISTS idx_ordenes_tecnico ON OrdenesServicio(tecnico_id)');
  await query('CREATE INDEX IF NOT EXISTS idx_ordenes_cedula ON OrdenesServicio(cliente_cedula)');
  ordenesTablaLista = true;
}

async function getOrdenById(id) {
  const result = await query(
    `SELECT o.*,
            TRIM(CONCAT(COALESCE(t.nombre, ''), ' ', COALESCE(t.apellido, ''))) AS tecnico_nombre
     FROM OrdenesServicio o
     LEFT JOIN Usuarios t ON t.id_usuario = o.tecnico_id
     WHERE o.id_orden = $1`,
    [id]
  );
  return result.rows[0] || null;
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

    // Pago real: invoca el procedimiento pagar_factura (inserta Pagos + marca Factura PAGADA)
    if (path[0] === 'pagos' && path.length === 1 && method === 'POST') {
      const body = await parseBody(req);
      const facturaId = Number(body.factura_id);
      const metodoPago = String(body.metodo_pago || 'transferencia').trim().slice(0, 50);

      if (!facturaId || Number.isNaN(facturaId)) {
        return json({ success: false, error: 'factura_id es obligatorio', code: 'VALIDATION_ERROR' }, 400);
      }
      if (!metodoPago) {
        return json({ success: false, error: 'metodo_pago es obligatorio', code: 'VALIDATION_ERROR' }, 400);
      }

      const facturaRes = await query('SELECT * FROM Facturas WHERE id_factura = $1', [facturaId]);
      const facturaRow = facturaRes.rows[0];
      if (!facturaRow) {
        return json({ success: false, error: 'Factura no encontrada', code: 'FACTURA_NOT_FOUND' }, 404);
      }
      if (String(facturaRow.estado).toUpperCase() !== 'PENDIENTE') {
        return json({
          success: false,
          error: `La factura ya está en estado ${facturaRow.estado}. Solo se pueden pagar facturas PENDIENTE.`,
          code: 'FACTURA_NO_PENDIENTE',
        }, 409);
      }

      const monto = Number(facturaRow.monto);
      await query('CALL pagar_factura($1::int, $2::numeric, $3::varchar)', [
        facturaId,
        monto,
        metodoPago,
      ]);

      const pagoRes = await query(
        `SELECT p.id_pago, p.factura_id, f.usuario_id, p.monto, p.estado, p.metodo_pago, p.fecha_pago
         FROM Pagos p
         JOIN Facturas f ON f.id_factura = p.factura_id
         WHERE p.factura_id = $1
         ORDER BY p.fecha_pago DESC
         LIMIT 1`,
        [facturaId]
      );
      const pagoRow = pagoRes.rows[0];

      if (pagoRow) {
        await query(
          `INSERT INTO PortalPagos (pago_id, usuario_id, resultado, mensaje)
           VALUES ($1, $2, 'OK', $3)`,
          [pagoRow.id_pago, facturaRow.usuario_id, `Pago ${metodoPago} registrado`]
        );
      }

      const facturaActualizada = await query(
        `SELECT id_factura, usuario_id, monto, fecha_emision, fecha_vencimiento, estado
         FROM Facturas WHERE id_factura = $1`,
        [facturaId]
      );

      return json({
        success: true,
        data: {
          pago: pagoRow ? mapPago(pagoRow) : null,
          factura: mapFactura(facturaActualizada.rows[0]),
        },
        message: 'Pago registrado correctamente. La factura quedó PAGADA.',
      }, 201);
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

    if (path[0] === 'ordenes-servicio') {
      await ensureOrdenesServicioTable();

      if (path.length === 1 && method === 'GET') {
        const url = new URL(req.url);
        const estado = String(url.searchParams.get('estado') || '').toUpperCase();
        const q = String(url.searchParams.get('q') || '').trim();
        const tecnicoId = url.searchParams.get('tecnico_id');
        const params = [];
        const where = [];

        if (estado && ESTADOS_ORDEN.has(estado)) {
          params.push(estado);
          where.push(`o.estado = $${params.length}`);
        }
        if (tecnicoId) {
          params.push(Number(tecnicoId));
          where.push(`o.tecnico_id = $${params.length}`);
        }
        if (q) {
          params.push(`%${q.toLowerCase()}%`);
          where.push(`(
            LOWER(o.cliente_nombre) LIKE $${params.length}
            OR LOWER(o.cliente_cedula) LIKE $${params.length}
            OR LOWER(COALESCE(o.cliente_email, '')) LIKE $${params.length}
            OR LOWER(o.cliente_telefono) LIKE $${params.length}
            OR LOWER(o.cliente_direccion) LIKE $${params.length}
          )`);
        }

        const sql = `
          SELECT o.*,
                 TRIM(CONCAT(COALESCE(t.nombre, ''), ' ', COALESCE(t.apellido, ''))) AS tecnico_nombre
          FROM OrdenesServicio o
          LEFT JOIN Usuarios t ON t.id_usuario = o.tecnico_id
          ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
          ORDER BY
            CASE o.estado
              WHEN 'PENDIENTE' THEN 1
              WHEN 'EN_CURSO' THEN 2
              WHEN 'CERRADA' THEN 3
              ELSE 4
            END,
            o.fecha_creacion DESC`;
        const rows = await query(sql, params);
        return json({
          success: true,
          data: rows.rows.map(mapOrdenServicio),
          message: `Órdenes de servicio: ${rows.rowCount}`,
        });
      }

      if (path.length === 1 && method === 'POST') {
        const body = await parseBody(req);
        const cliente_nombre = String(body.cliente_nombre || '').trim();
        const cliente_cedula = String(body.cliente_cedula || '').trim();
        const cliente_email = String(body.cliente_email || '').trim() || null;
        const cliente_telefono = String(body.cliente_telefono || '').trim();
        const cliente_direccion = String(body.cliente_direccion || '').trim();
        const tipo_servicio = String(body.tipo_servicio || '').trim().toUpperCase();
        const observaciones = String(body.observaciones || '').trim() || null;
        const fecha_programada = body.fecha_programada || null;
        const cliente_id = body.cliente_id ? Number(body.cliente_id) : null;

        if (!cliente_nombre || !cliente_cedula || !cliente_telefono || !cliente_direccion || !tipo_servicio) {
          return json({ success: false, error: 'Faltan campos obligatorios', code: 'VALIDATION_ERROR' }, 400);
        }
        if (!TIPOS_ORDEN.has(tipo_servicio)) {
          return json({ success: false, error: 'tipo_servicio inválido', code: 'VALIDATION_ERROR' }, 400);
        }
        if (cliente_id) {
          const cli = await getUsuarioPorId(cliente_id);
          if (!cli) {
            return json({ success: false, error: 'cliente_id no existe', code: 'USER_NOT_FOUND' }, 404);
          }
        }

        const tokenUser = usuarioDesdeToken(req);
        let tecnico_id = body.tecnico_id ? Number(body.tecnico_id) : null;
        if (!tecnico_id && tokenUser?.tipo === 'tecnico') {
          tecnico_id = tokenUser.id_usuario;
        }

        const inserted = await query(
          `INSERT INTO OrdenesServicio (
             cliente_nombre, cliente_cedula, cliente_email, cliente_telefono, cliente_direccion,
             tipo_servicio, observaciones, estado, cliente_id, tecnico_id, fecha_programada
           ) VALUES ($1,$2,$3,$4,$5,$6,$7,'PENDIENTE',$8,$9,$10)
           RETURNING id_orden`,
          [
            cliente_nombre,
            cliente_cedula,
            cliente_email,
            cliente_telefono,
            cliente_direccion,
            tipo_servicio,
            observaciones,
            cliente_id,
            tecnico_id,
            fecha_programada,
          ]
        );
        const orden = await getOrdenById(inserted.rows[0].id_orden);
        return json({
          success: true,
          data: mapOrdenServicio(orden),
          message: 'Orden de servicio creada',
        }, 201);
      }

      if (path[1] && path.length === 2 && method === 'GET') {
        const id = Number(path[1]);
        const orden = await getOrdenById(id);
        if (!orden) {
          return json({ success: false, error: 'Orden no encontrada', code: 'NOT_FOUND' }, 404);
        }
        return json({ success: true, data: mapOrdenServicio(orden), message: `Orden #${id}` });
      }

      if (path[1] && path.length === 2 && (method === 'PATCH' || method === 'PUT')) {
        const id = Number(path[1]);
        const existing = await getOrdenById(id);
        if (!existing) {
          return json({ success: false, error: 'Orden no encontrada', code: 'NOT_FOUND' }, 404);
        }

        const body = await parseBody(req);
        const tokenUser = usuarioDesdeToken(req);
        const accion = String(body.accion || '').toLowerCase();

        if (accion === 'tomar' || accion === 'iniciar') {
          if (String(existing.estado).toUpperCase() === 'CERRADA' || String(existing.estado).toUpperCase() === 'CANCELADA') {
            return json({
              success: false,
              error: `No se puede iniciar una orden en estado ${existing.estado}`,
              code: 'INVALID_STATE',
            }, 409);
          }
          const tecnicoId = body.tecnico_id
            ? Number(body.tecnico_id)
            : (tokenUser?.id_usuario || existing.tecnico_id);
          await query(
            `UPDATE OrdenesServicio
             SET estado = 'EN_CURSO', tecnico_id = COALESCE($2, tecnico_id)
             WHERE id_orden = $1`,
            [id, tecnicoId || null]
          );
        } else if (accion === 'cerrar') {
          if (String(existing.estado).toUpperCase() === 'CANCELADA') {
            return json({
              success: false,
              error: 'No se puede cerrar una orden cancelada',
              code: 'INVALID_STATE',
            }, 409);
          }
          await query(
            `UPDATE OrdenesServicio
             SET estado = 'CERRADA',
                 fecha_cierre = CURRENT_TIMESTAMP,
                 notas_cierre = COALESCE($2, notas_cierre),
                 tecnico_id = COALESCE($3, tecnico_id)
             WHERE id_orden = $1`,
            [id, body.notas_cierre || null, tokenUser?.id_usuario || null]
          );
        } else if (accion === 'cancelar') {
          if (String(existing.estado).toUpperCase() === 'CERRADA') {
            return json({
              success: false,
              error: 'No se puede cancelar una orden ya cerrada',
              code: 'INVALID_STATE',
            }, 409);
          }
          await query(
            `UPDATE OrdenesServicio
             SET estado = 'CANCELADA',
                 fecha_cierre = CURRENT_TIMESTAMP,
                 notas_cierre = COALESCE($2, notas_cierre)
             WHERE id_orden = $1`,
            [id, body.notas_cierre || 'Cancelada']
          );
        } else if (accion === 'reabrir') {
          await query(
            `UPDATE OrdenesServicio
             SET estado = 'PENDIENTE', fecha_cierre = NULL, notas_cierre = NULL
             WHERE id_orden = $1`,
            [id]
          );
        } else {
          const tipo = body.tipo_servicio
            ? String(body.tipo_servicio).trim().toUpperCase()
            : existing.tipo_servicio;
          if (!TIPOS_ORDEN.has(tipo)) {
            return json({ success: false, error: 'tipo_servicio inválido', code: 'VALIDATION_ERROR' }, 400);
          }
          const estado = body.estado
            ? String(body.estado).trim().toUpperCase()
            : existing.estado;
          if (!ESTADOS_ORDEN.has(estado)) {
            return json({ success: false, error: 'estado inválido', code: 'VALIDATION_ERROR' }, 400);
          }

          await query(
            `UPDATE OrdenesServicio SET
               cliente_nombre = COALESCE($2, cliente_nombre),
               cliente_cedula = COALESCE($3, cliente_cedula),
               cliente_email = COALESCE($4, cliente_email),
               cliente_telefono = COALESCE($5, cliente_telefono),
               cliente_direccion = COALESCE($6, cliente_direccion),
               tipo_servicio = $7,
               observaciones = COALESCE($8, observaciones),
               estado = $9,
               fecha_programada = COALESCE($10, fecha_programada),
               tecnico_id = COALESCE($11, tecnico_id),
               notas_cierre = COALESCE($12, notas_cierre),
               fecha_cierre = CASE
                 WHEN $9 IN ('CERRADA', 'CANCELADA') THEN COALESCE(fecha_cierre, CURRENT_TIMESTAMP)
                 WHEN $9 IN ('PENDIENTE', 'EN_CURSO') THEN NULL
                 ELSE fecha_cierre
               END
             WHERE id_orden = $1`,
            [
              id,
              body.cliente_nombre != null ? String(body.cliente_nombre).trim() : null,
              body.cliente_cedula != null ? String(body.cliente_cedula).trim() : null,
              body.cliente_email != null ? String(body.cliente_email).trim() : null,
              body.cliente_telefono != null ? String(body.cliente_telefono).trim() : null,
              body.cliente_direccion != null ? String(body.cliente_direccion).trim() : null,
              tipo,
              body.observaciones != null ? String(body.observaciones).trim() : null,
              estado,
              body.fecha_programada || null,
              body.tecnico_id != null ? Number(body.tecnico_id) : null,
              body.notas_cierre != null ? String(body.notas_cierre).trim() : null,
            ]
          );
        }

        const updated = await getOrdenById(id);
        return json({
          success: true,
          data: mapOrdenServicio(updated),
          message: accion ? `Orden ${accion}` : 'Orden actualizada',
        });
      }

      if (path[1] && path.length === 2 && method === 'DELETE') {
        const id = Number(path[1]);
        const existing = await getOrdenById(id);
        if (!existing) {
          return json({ success: false, error: 'Orden no encontrada', code: 'NOT_FOUND' }, 404);
        }
        await query('DELETE FROM OrdenesServicio WHERE id_orden = $1', [id]);
        return json({
          success: true,
          data: { id_orden: id },
          message: `Orden #${id} eliminada`,
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

export async function DELETE(req) {
  return handleRequest(req, segmentsFrom(req));
}

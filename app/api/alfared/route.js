import crypto from 'crypto';

const SECRET = process.env.AUTH_SECRET || 'secreto-temporal-para-build';

/**
 * 1. Crea la firma HMAC-SHA256 para el payload
 */
function firmar(payload) {
  return crypto.createHmac('sha256', SECRET).update(payload).digest('base64url');
}

/**
 * 2. Genera un token firmado para el usuario (expira en 8 horas)
 */
function generarToken(usuario) {
  const ahora = Math.floor(Date.now() / 1000);
  const payloadData = {
    id_usuario: usuario.id_usuario,
    iat: ahora,                    // Emitido en
    exp: ahora + 8 * 3600,         // Expira en 8h
  };

  const payload = Buffer.from(JSON.stringify(payloadData)).toString('base64url');
  return `${payload}.${firmar(payload)}`;
}

/**
 * 3. Valida el token de la petición HTTP y extrae el payload si es válido
 */
function usuarioDesdeToken(req) {
  const auth = req.headers.get('authorization') || '';
  if (!auth.startsWith('Bearer ')) return null;
  
  const token = auth.slice(7);
  const partes = token.split('.');
  if (partes.length !== 2) return null;
  
  const [payload, sig] = partes;
  if (!payload || !sig) return null;

  // Validación de firma segura
  try {
    const esperado = Buffer.from(firmar(payload));
    const recibido = Buffer.from(sig);
    if (esperado.length !== recibido.length || !crypto.timingSafeEqual(esperado, recibido)) {
      return null;
    }
  } catch {
    return null;
  }

  // Validación de estructura y expiración
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));

    if (
      !data ||
      typeof data !== 'object' ||
      typeof data.id_usuario === 'undefined' ||
      typeof data.exp !== 'number' ||
      typeof data.iat !== 'number'
    ) {
      return null;
    }

    const ahora = Math.floor(Date.now() / 1000);
    if (data.exp < ahora) return null; // Expirado
    if (data.iat > ahora + 60) return null; // Emitido en el "futuro"

    return data;
  } catch {
    return null;
  }
}

/**
 * 4. Middleware de seguridad: Exige que el usuario esté autenticado y sea 'TECNICO'
 */
async function requireTecnico(req, query, json) {
  const sesion = usuarioDesdeToken(req);
  if (!sesion) {
    return { error: json({ success: false, error: 'No autenticado' }, 401) };
  }

  const r = await query(
    `SELECT u.id_usuario, u.activo, r.nombre AS rol
       FROM Usuarios u JOIN Roles r ON r.id_rol = u.rol_id
      WHERE u.id_usuario = $1`,
    [sesion.id_usuario]
  );
  
  const u = r.rows[0];
  if (!u || !u.activo || u.rol.toUpperCase() !== 'TECNICO') {
    return { error: json({ success: false, error: 'Solo técnicos' }, 403) };
  }
  
  return { usuario: u };
}

export { generarToken, usuarioDesdeToken, requireTecnico };
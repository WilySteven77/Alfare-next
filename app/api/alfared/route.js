import { pingDb, dbConfigMissing } from '@/lib/db';

export async function GET() {
  const missing = dbConfigMissing();
  if (missing.length) {
    return Response.json({
      success: false,
      error: `Faltan variables de entorno: ${missing.join(', ')}. Copia .env.example a .env.`,
      code: 'DB_CONFIG',
    }, { status: 503 });
  }
  try {
    const info = await pingDb();
    return Response.json({
      success: true,
      data: { service: 'AlfaRed API', version: '1.0', database: info },
      message: 'API AlfaRed conectada a PostgreSQL',
    });
  } catch (err) {
    return Response.json({
      success: false,
      error: err.message || 'No se pudo conectar a PostgreSQL.',
      code: 'DB_ERROR',
    }, { status: 503 });
  }
}

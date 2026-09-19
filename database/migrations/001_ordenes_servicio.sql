-- Migración: órdenes de servicio para el portal técnico
-- Uso (psql o cliente SQL):
--   \i database/migrations/001_ordenes_servicio.sql
-- O ejecuta este archivo contra la base Alfared (esquema alfared).

SET search_path = alfared;

CREATE TABLE IF NOT EXISTS OrdenesServicio (
    id_orden SERIAL PRIMARY KEY,
    cliente_nombre VARCHAR(150) NOT NULL,
    cliente_cedula VARCHAR(30) NOT NULL,
    cliente_email VARCHAR(150),
    cliente_telefono VARCHAR(40) NOT NULL,
    cliente_direccion VARCHAR(255) NOT NULL,
    tipo_servicio VARCHAR(50) NOT NULL
        CHECK (tipo_servicio IN (
            'INSTALACION',
            'REPORTE_DANO',
            'MANTENIMIENTO',
            'INTERNET',
            'TELEVISION',
            'TECNOLOGIA',
            'ELECTRICO'
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
);

CREATE INDEX IF NOT EXISTS idx_ordenes_estado ON OrdenesServicio(estado);
CREATE INDEX IF NOT EXISTS idx_ordenes_tecnico ON OrdenesServicio(tecnico_id);
CREATE INDEX IF NOT EXISTS idx_ordenes_cedula ON OrdenesServicio(cliente_cedula);

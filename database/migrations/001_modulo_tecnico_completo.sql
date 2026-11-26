-- Migración única del módulo técnico AlfaRed.
-- Ejecutar sobre la base existente Alfared; NO crea otra base de datos.
-- Orden incluido: clientes, incidencias, órdenes, mantenimientos e historial.

BEGIN;

SET search_path = alfared, public;

CREATE TABLE IF NOT EXISTS ClientesServicio (
    id_cliente SERIAL PRIMARY KEY,
    nombre_completo VARCHAR(150) NOT NULL,
    cedula VARCHAR(30) NOT NULL UNIQUE,
    email VARCHAR(150) NOT NULL,
    telefono VARCHAR(30) NOT NULL,
    direccion VARCHAR(250) NOT NULL,
    tipo_servicio VARCHAR(20) NOT NULL
        CHECK (tipo_servicio IN ('INTERNET','TELEVISION','TECNOLOGIA','ELECTRICO')),
    observaciones TEXT,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    usuario_id INT REFERENCES Usuarios(id_usuario) ON DELETE SET NULL,
    creado_por INT NOT NULL REFERENCES Usuarios(id_usuario) ON DELETE RESTRICT,
    fecha_registro TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_clientes_servicio_email_lower
    ON ClientesServicio (LOWER(email));
CREATE INDEX IF NOT EXISTS idx_clientes_servicio_nombre
    ON ClientesServicio (LOWER(nombre_completo));
CREATE INDEX IF NOT EXISTS idx_clientes_servicio_telefono
    ON ClientesServicio (telefono);

CREATE TABLE IF NOT EXISTS Incidencias (
    id_incidencia BIGSERIAL PRIMARY KEY,
    cliente_id INT NOT NULL REFERENCES ClientesServicio(id_cliente) ON DELETE RESTRICT,
    nombre_cliente VARCHAR(150) NOT NULL,
    titular VARCHAR(150) NOT NULL,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('INSTALACION','SERVICIO','DANO')),
    prioridad VARCHAR(10) NOT NULL DEFAULT 'MEDIA' CHECK (prioridad IN ('ALTA','MEDIA','BAJA')),
    descripcion TEXT NOT NULL,
    ubicacion VARCHAR(250) NOT NULL,
    estado VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE' CHECK (estado IN ('PENDIENTE','ATENDIDA','CERRADA')),
    atendida_por INT REFERENCES Usuarios(id_usuario) ON DELETE SET NULL,
    fecha_registro TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_atencion TIMESTAMP,
    fecha_actualizacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_incidencias_cola
    ON Incidencias (tipo, prioridad, fecha_registro, id_incidencia);

CREATE TABLE IF NOT EXISTS OrdenesTrabajo (
    id_orden BIGSERIAL PRIMARY KEY,
    incidencia_id BIGINT REFERENCES Incidencias(id_incidencia) ON DELETE SET NULL,
    cliente_id INT NOT NULL REFERENCES ClientesServicio(id_cliente) ON DELETE RESTRICT,
    tecnico_id INT NOT NULL REFERENCES Usuarios(id_usuario) ON DELETE RESTRICT,
    estado VARCHAR(20) NOT NULL DEFAULT 'REGISTRADA'
        CHECK (estado IN ('REGISTRADA','ASIGNADA','EN_PROCESO','PAUSADA','COMPLETADA','CERRADA','CANCELADA')),
    fecha_registro TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_cierre TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ordenes_tecnico_estado
    ON OrdenesTrabajo (tecnico_id, estado, fecha_registro DESC);

CREATE TABLE IF NOT EXISTS Mantenimientos (
    id_mantenimiento BIGSERIAL PRIMARY KEY,
    orden_id BIGINT NOT NULL REFERENCES OrdenesTrabajo(id_orden) ON DELETE RESTRICT,
    tecnico_id INT NOT NULL REFERENCES Usuarios(id_usuario) ON DELETE RESTRICT,
    descripcion TEXT NOT NULL,
    estado VARCHAR(20) NOT NULL DEFAULT 'REGISTRADA'
        CHECK (estado IN ('REGISTRADA','EN_PROCESO','COMPLETADA','CANCELADA')),
    fecha_registro TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS HistorialOrdenes (
    id_historial BIGSERIAL PRIMARY KEY,
    orden_id BIGINT NOT NULL REFERENCES OrdenesTrabajo(id_orden) ON DELETE CASCADE,
    estado_anterior VARCHAR(20),
    estado_nuevo VARCHAR(20) NOT NULL,
    cambiado_por INT NOT NULL REFERENCES Usuarios(id_usuario) ON DELETE RESTRICT,
    fecha_cambio TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    comentario TEXT
);

COMMIT;

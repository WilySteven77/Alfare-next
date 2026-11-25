CREATE SCHEMA IF NOT EXISTS alfared;
SET search_path = alfared, public;

CREATE TABLE IF NOT EXISTS alfared.clientesservicio (
    id_cliente SERIAL PRIMARY KEY,
    nombre_completo VARCHAR(150) NOT NULL,
    cedula VARCHAR(30) NOT NULL UNIQUE,
    email VARCHAR(150) NOT NULL,
    telefono VARCHAR(30) NOT NULL,
    direccion VARCHAR(250) NOT NULL,
    tipo_servicio VARCHAR(20) NOT NULL DEFAULT 'INTERNET',
    observaciones TEXT,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    usuario_id INT,
    creado_por INT,
    fecha_registro TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS alfared.incidencias (
    id_incidencia BIGSERIAL PRIMARY KEY,
    cliente_id INT NOT NULL REFERENCES alfared.clientesservicio(id_cliente) ON DELETE RESTRICT,
    nombre_cliente VARCHAR(150) NOT NULL,
    titular VARCHAR(150) NOT NULL,
    tipo VARCHAR(20) NOT NULL DEFAULT 'SERVICIO',
    prioridad VARCHAR(10) NOT NULL DEFAULT 'MEDIA',
    descripcion TEXT NOT NULL,
    ubicacion VARCHAR(250) NOT NULL,
    estado VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE',
    atendida_por INT,
    fecha_registro TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_atencion TIMESTAMP,
    fecha_actualizacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS alfared.ordenestrabajo (
    id_orden BIGSERIAL PRIMARY KEY,
    incidencia_id BIGINT REFERENCES alfared.incidencias(id_incidencia) ON DELETE SET NULL,
    cliente_id INT NOT NULL REFERENCES alfared.clientesservicio(id_cliente) ON DELETE RESTRICT,
    tecnico_id INT,
    estado VARCHAR(20) NOT NULL DEFAULT 'REGISTRADA',
    fecha_registro TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_cierre TIMESTAMP
);

CREATE TABLE IF NOT EXISTS alfared.mantenimientos (
    id_mantenimiento BIGSERIAL PRIMARY KEY,
    orden_id BIGINT REFERENCES alfared.ordenestrabajo(id_orden) ON DELETE RESTRICT,
    tecnico_id INT,
    descripcion TEXT NOT NULL,
    estado VARCHAR(20) NOT NULL DEFAULT 'REGISTRADA',
    fecha_registro TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS alfared.historialordenes (
    id_historial BIGSERIAL PRIMARY KEY,
    orden_id BIGINT REFERENCES alfared.ordenestrabajo(id_orden) ON DELETE CASCADE,
    estado_anterior VARCHAR(20),
    estado_nuevo VARCHAR(20) NOT NULL,
    cambiado_por INT,
    fecha_cambio TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    comentario TEXT
);

-- Vistas en el esquema public para garantizar compatibilidad total
CREATE OR REPLACE VIEW public.clientesservicio AS SELECT * FROM alfared.clientesservicio;
CREATE OR REPLACE VIEW public.incidencias AS SELECT * FROM alfared.incidencias;
CREATE OR REPLACE VIEW public.ordenestrabajo AS SELECT * FROM alfared.ordenestrabajo;
CREATE OR REPLACE VIEW public.mantenimientos AS SELECT * FROM alfared.mantenimientos;
CREATE OR REPLACE VIEW public.historialordenes AS SELECT * FROM alfared.historialordenes;

-- Configurar search_path del rol y de la base de datos
ALTER ROLE postgres SET search_path TO alfared, public;
ALTER DATABASE "Alfared" SET search_path TO alfared, public;

-- Permisos
GRANT ALL ON ALL TABLES IN SCHEMA alfared TO postgres;
GRANT ALL ON ALL SEQUENCES IN SCHEMA alfared TO postgres;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres;

-- Insertar cliente de prueba si no existe
INSERT INTO alfared.clientesservicio (nombre_completo, cedula, email, telefono, direccion, tipo_servicio)
VALUES ('Cliente Demo AlfaRed', '1061000001', 'cliente.demo@alfared.local', '3001234567', 'Calle 5 # 10-20', 'INTERNET')
ON CONFLICT (cedula) DO NOTHING;

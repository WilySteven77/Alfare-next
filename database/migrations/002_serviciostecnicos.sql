-- =====================================================================
-- 003_modulo_tecnico.sql
-- Módulo técnico AlfaRed (HU-18 a HU-28)
--   * UsuariosServicio : CRUD de usuarios de servicio      (HU-18..22)
--   * Incidencias      : colas por tipo y prioridad        (HU-23..25)
--   * OrdenesTrabajo   : órdenes y mantenimientos          (HU-26..28)
-- Ejecutar sobre la base existente (no recrea nada).
-- =====================================================================
BEGIN;

-- ---------------------------------------------------------------------
-- 1. Usuarios de servicio (NO son las cuentas de login de "Usuarios")
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS alfared.UsuariosServicio (
    id_usuario_servicio SERIAL PRIMARY KEY,
    nombre_completo     VARCHAR(150) NOT NULL,
    cedula              VARCHAR(20)  NOT NULL UNIQUE,
    email               VARCHAR(150) NOT NULL,
    telefono            VARCHAR(20)  NOT NULL,
    direccion           VARCHAR(200) NOT NULL,
    tipo_servicio       VARCHAR(25)  NOT NULL
        CHECK (tipo_servicio IN ('INTERNET', 'TELEVISION', 'TECNOLOGIA', 'SERVICIOS_ELECTRICOS')),
    observaciones       TEXT,
    activo              BOOLEAN      NOT NULL DEFAULT TRUE,
    fecha_registro      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Correo único sin distinguir mayúsculas (HU-21 criterio 4)
CREATE UNIQUE INDEX IF NOT EXISTS uq_usuariosservicio_email
    ON alfared.UsuariosServicio (LOWER(email));

-- ---------------------------------------------------------------------
-- 2. Incidencias: una cola independiente por tipo (HU-23, 24, 25)
--    prioridad_orden permite ordenar ALTA > MEDIA > BAJA con índice
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS alfared.Incidencias (
    id_incidencia   SERIAL PRIMARY KEY,
    nombre_cliente  VARCHAR(150) NOT NULL,
    titular         VARCHAR(150) NOT NULL,
    tipo            VARCHAR(15)  NOT NULL
        CHECK (tipo IN ('INSTALACION', 'SERVICIO', 'DANO')),
    prioridad       VARCHAR(10)  NOT NULL DEFAULT 'MEDIA'
        CHECK (prioridad IN ('ALTA', 'MEDIA', 'BAJA')),
    prioridad_orden SMALLINT GENERATED ALWAYS AS (
        CASE prioridad WHEN 'ALTA' THEN 1 WHEN 'MEDIA' THEN 2 ELSE 3 END
    ) STORED,
    descripcion     TEXT         NOT NULL,
    ubicacion       VARCHAR(200) NOT NULL,
    estado          VARCHAR(15)  NOT NULL DEFAULT 'PENDIENTE'
        CHECK (estado IN ('PENDIENTE', 'ATENDIDA')),
    pqrs_id         INT REFERENCES alfared.PQRS(id_pqrs)        ON DELETE SET NULL,
    registrada_por  INT REFERENCES alfared.Usuarios(id_usuario) ON DELETE SET NULL,
    atendida_por    INT REFERENCES alfared.Usuarios(id_usuario) ON DELETE SET NULL,
    fecha_registro  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_atencion  TIMESTAMP
);

-- Índice parcial: solo las pendientes, en el mismo orden de la cola
CREATE INDEX IF NOT EXISTS idx_incidencias_cola
    ON alfared.Incidencias (tipo, prioridad_orden, fecha_registro, id_incidencia)
    WHERE estado = 'PENDIENTE';

-- ---------------------------------------------------------------------
-- 3. Órdenes de trabajo y mantenimientos (HU-26, 27, 28)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION alfared.validar_tecnico_activo()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
          FROM alfared.Usuarios u
          JOIN alfared.Roles r ON r.id_rol = u.rol_id
         WHERE u.id_usuario = NEW.tecnico_id
           AND u.activo = TRUE
           AND UPPER(r.nombre) = 'TECNICO'
    ) THEN
        RAISE EXCEPTION 'El usuario % no es un técnico activo', NEW.tecnico_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS alfared.OrdenesTrabajo (
    id_orden            SERIAL PRIMARY KEY,
    tecnico_id          INT NOT NULL
        REFERENCES alfared.Usuarios(id_usuario) ON DELETE RESTRICT,
    incidencia_id       INT
        REFERENCES alfared.Incidencias(id_incidencia) ON DELETE SET NULL,
    tipo                VARCHAR(20) NOT NULL DEFAULT 'MANTENIMIENTO'
        CHECK (tipo IN ('MANTENIMIENTO', 'INSTALACION', 'REPARACION')),
    descripcion         TEXT        NOT NULL,
    estado              VARCHAR(15) NOT NULL DEFAULT 'REGISTRADA'
        CHECK (estado IN ('REGISTRADA', 'EN_PROCESO', 'COMPLETADA', 'CANCELADA')),
    fecha_registro      TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DROP TRIGGER IF EXISTS trg_ordenes_tecnico ON alfared.OrdenesTrabajo;
CREATE TRIGGER trg_ordenes_tecnico
BEFORE INSERT OR UPDATE OF tecnico_id ON alfared.OrdenesTrabajo
FOR EACH ROW EXECUTE FUNCTION alfared.validar_tecnico_activo();

CREATE INDEX IF NOT EXISTS idx_ordenes_tecnico
    ON alfared.OrdenesTrabajo (tecnico_id, estado, fecha_registro DESC);

-- ---------------------------------------------------------------------
-- 4. Datos de prueba (SOLO DESARROLLO: borra este bloque en producción)
-- ---------------------------------------------------------------------
INSERT INTO alfared.UsuariosServicio
    (nombre_completo, cedula, email, telefono, direccion, tipo_servicio)
VALUES
    ('Maria Lopez',  '1061000001', 'maria.lopez@correo.test',  '3001112233', 'Cra 5 # 10-20, Popayán', 'INTERNET'),
    ('Carlos Ruiz',  '1061000002', 'carlos.ruiz@correo.test',  '3004445566', 'Calle 3 # 7-15, Popayán', 'TELEVISION')
ON CONFLICT DO NOTHING;

INSERT INTO alfared.Incidencias (nombre_cliente, titular, tipo, prioridad, descripcion, ubicacion)
SELECT v.*
  FROM (VALUES
    ('Maria Lopez', 'Maria Lopez', 'DANO',        'ALTA',  'Sin internet desde ayer, luz del módem en rojo', 'Cra 5 # 10-20'),
    ('Carlos Ruiz', 'Ana Ruiz',    'INSTALACION', 'MEDIA', 'Instalación nueva de televisión',               'Calle 3 # 7-15'),
    ('Luis Mora',   'Luis Mora',   'SERVICIO',    'BAJA',  'Solicita retiro del servicio de internet',      'Barrio Bolívar'),
    ('Pedro Diaz',  'Pedro Diaz',  'DANO',        'MEDIA', 'Cable de acometida dañado por lluvia',          'Calle 8 # 2-40')
  ) AS v(nombre_cliente, titular, tipo, prioridad, descripcion, ubicacion)
 WHERE NOT EXISTS (SELECT 1 FROM alfared.Incidencias);

-- ---------------------------------------------------------------------
-- 5. La tabla Servicios de la migración 002 queda reemplazada por
--    Incidencias. Si solo tiene datos de prueba, puedes eliminarla:
-- ---------------------------------------------------------------------
-- DROP TABLE IF EXISTS alfared.Servicios;

COMMIT;
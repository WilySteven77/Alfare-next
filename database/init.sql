-- =========================================================
-- ESQUEMA PRINCIPAL
-- =========================================================
CREATE SCHEMA IF NOT EXISTS alfared;
SET search_path = alfared;

-- =========================================================
-- TABLAS DE SEGURIDAD (Roles, Permisos, Usuarios)
-- =========================================================
CREATE TABLE IF NOT EXISTS Roles (
    id_rol SERIAL PRIMARY KEY,
    nombre VARCHAR(50) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS Permisos (
    id_permiso SERIAL PRIMARY KEY,
    nombre VARCHAR(100) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS Roles_Permisos (
    rol_id INT NOT NULL,
    permiso_id INT NOT NULL,
    PRIMARY KEY (rol_id, permiso_id),
    FOREIGN KEY (rol_id) REFERENCES Roles(id_rol) ON DELETE CASCADE,
    FOREIGN KEY (permiso_id) REFERENCES Permisos(id_permiso) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS Usuarios (
    id_usuario SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    contrasena VARCHAR(255) NOT NULL,
    rol_id INT NOT NULL REFERENCES Roles(id_rol) ON DELETE RESTRICT,
    activo BOOLEAN DEFAULT TRUE,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ultimo_acceso TIMESTAMP
);

-- =========================================================
-- DOCUMENTOS Y TRANSACCIONES
-- =========================================================
CREATE TABLE IF NOT EXISTS Documentos (
    id_documento SERIAL PRIMARY KEY,
    tipo VARCHAR(50) NOT NULL,
    contenido TEXT,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    contador_id INT,
    CONSTRAINT fk_documentos_contador FOREIGN KEY (contador_id)
        REFERENCES Usuarios(id_usuario) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS Transacciones (
    id_transaccion SERIAL PRIMARY KEY,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    monto NUMERIC(15,2) NOT NULL CHECK (monto >= 0),
    tipo VARCHAR(50) NOT NULL,
    estado VARCHAR(50) DEFAULT 'PENDIENTE',
    contador_id INT,
    CONSTRAINT fk_transacciones_contador FOREIGN KEY (contador_id)
        REFERENCES Usuarios(id_usuario) ON DELETE SET NULL
);

-- =========================================================
-- PQRS Y GESTIÓN DE CLIENTE
-- =========================================================
CREATE TABLE IF NOT EXISTS PQRS (
    id_pqrs SERIAL PRIMARY KEY,
    tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('PETICION','QUEJA','RECLAMO','SUGERENCIA')),
    descripcion TEXT NOT NULL,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    estado VARCHAR(50) DEFAULT 'PENDIENTE' 
        CHECK (estado IN ('PENDIENTE','EN_PROCESO','RESUELTA','CERRADA')),
    solicitante_id INT NOT NULL REFERENCES Usuarios(id_usuario) ON DELETE CASCADE,
    analista_id INT REFERENCES Usuarios(id_usuario) ON DELETE SET NULL,
    jefe_id INT REFERENCES Usuarios(id_usuario) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS AnalizarPQRS (
    id_analizarpqrs SERIAL PRIMARY KEY,
    pqrs_id INT NOT NULL REFERENCES PQRS(id_pqrs) ON DELETE CASCADE,
    analista_id INT NOT NULL REFERENCES Usuarios(id_usuario) ON DELETE CASCADE,
    jefe_id INT REFERENCES Usuarios(id_usuario) ON DELETE SET NULL,
    fecha_analisis TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    clasificacion VARCHAR(100),
    acciones_determinadas TEXT,
    informacion_adicional_solicitada TEXT,
    antecedentes TEXT
);

CREATE TABLE IF NOT EXISTS GestionarPQRS (
    id_gestionarpqrs SERIAL PRIMARY KEY,
    pqrs_id INT NOT NULL REFERENCES PQRS(id_pqrs) ON DELETE CASCADE,
    gestor_id INT NOT NULL REFERENCES Usuarios(id_usuario) ON DELETE CASCADE,
    fecha_gestion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    accion_realizada VARCHAR(100),
    observaciones TEXT
);

CREATE TABLE IF NOT EXISTS Satisfaccion (
    id_satisfaccion SERIAL PRIMARY KEY,
    nivel INT NOT NULL CHECK (nivel BETWEEN 1 AND 5),
    comentario TEXT,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    usuario_id INT NOT NULL REFERENCES Usuarios(id_usuario) ON DELETE CASCADE
);

-- =========================================================
-- FACTURAS Y PAGOS
-- =========================================================
CREATE TABLE IF NOT EXISTS Facturas (
    id_factura SERIAL PRIMARY KEY,
    fecha_emision TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_vencimiento DATE NOT NULL,
    monto NUMERIC(15,2) NOT NULL CHECK (monto >= 0),
    estado VARCHAR(50) DEFAULT 'PENDIENTE' 
        CHECK (estado IN ('PENDIENTE','PAGADA','ANULADA')),
    estado_revision VARCHAR(50) DEFAULT 'NO_REVISADA',
    metodo_pago_preferido VARCHAR(50),
    usuario_id INT NOT NULL REFERENCES Usuarios(id_usuario) ON DELETE RESTRICT,
    CHECK (fecha_vencimiento >= DATE(fecha_emision))
);

CREATE TABLE IF NOT EXISTS Pagos (
    id_pago SERIAL PRIMARY KEY,
    monto NUMERIC(15,2) NOT NULL CHECK (monto >= 0),
    fecha_pago TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metodo_pago VARCHAR(50) NOT NULL,
    estado VARCHAR(50) DEFAULT 'COMPLETADO' 
        CHECK (estado IN ('PENDIENTE','COMPLETADO','FALLIDO')),
    factura_id INT NOT NULL REFERENCES Facturas(id_factura) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS PortalPagos (
    id_portal SERIAL PRIMARY KEY,
    pago_id INT NOT NULL REFERENCES Pagos(id_pago) ON DELETE CASCADE,
    usuario_id INT NOT NULL REFERENCES Usuarios(id_usuario) ON DELETE CASCADE,
    fecha_procesamiento TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resultado VARCHAR(50),
    mensaje TEXT
);

CREATE TABLE IF NOT EXISTS EntidadBancaria (
    id_entidad SERIAL PRIMARY KEY,
    pago_id INT NOT NULL REFERENCES Pagos(id_pago) ON DELETE CASCADE,
    codigo_banco VARCHAR(10),
    referencia_banco VARCHAR(100),
    fecha_validacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resultado_validacion VARCHAR(50),
    mensaje_banco TEXT
);

-- =========================================================
-- NOTIFICACIONES Y ATENCIÓN AL CLIENTE
-- =========================================================
CREATE TABLE IF NOT EXISTS NotificarUsuario (
    id_notificacion SERIAL PRIMARY KEY,
    usuario_id INT NOT NULL REFERENCES Usuarios(id_usuario) ON DELETE CASCADE,
    mensaje TEXT NOT NULL,
    tipo_notificacion VARCHAR(50),
    fecha_envio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    enviado BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS AtencionCliente (
    id_atencion SERIAL PRIMARY KEY,
    cliente_id INT NOT NULL REFERENCES Usuarios(id_usuario) ON DELETE CASCADE,
    tipo_atencion VARCHAR(100) NOT NULL,
    descripcion TEXT,
    fecha_atencion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================
-- RELACIONES DE CONTADOR (Histórico)
-- =========================================================
CREATE TABLE IF NOT EXISTS Contador_Documento (
    id_contador_documento SERIAL PRIMARY KEY,
    contador_id INT NOT NULL REFERENCES Usuarios(id_usuario) ON DELETE CASCADE,
    documento_id INT NOT NULL REFERENCES Documentos(id_documento) ON DELETE CASCADE,
    fecha_asignacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS Contador_Transaccion (
    id_contador_transaccion SERIAL PRIMARY KEY,
    contador_id INT NOT NULL REFERENCES Usuarios(id_usuario) ON DELETE CASCADE,
    transaccion_id INT NOT NULL REFERENCES Transacciones(id_transaccion) ON DELETE CASCADE,
    fecha_asignacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================
-- TRIGGERS
-- =========================================================

-- (1) Validar rol de CONTADOR
CREATE OR REPLACE FUNCTION validar_contador_rol() RETURNS TRIGGER AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM Usuarios u
        JOIN Roles r ON r.id_rol = u.rol_id
        WHERE u.id_usuario = NEW.contador_id
          AND UPPER(r.nombre) = 'CONTADOR'
    ) THEN
        RAISE EXCEPTION 'El usuario % no tiene rol CONTADOR', NEW.contador_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Documentos y Transacciones directo
CREATE TRIGGER trg_validar_contador_documento_directo
BEFORE INSERT OR UPDATE ON Documentos
FOR EACH ROW
WHEN (NEW.contador_id IS NOT NULL)
EXECUTE FUNCTION validar_contador_rol();

CREATE TRIGGER trg_validar_contador_transaccion_directo
BEFORE INSERT OR UPDATE ON Transacciones
FOR EACH ROW
WHEN (NEW.contador_id IS NOT NULL)
EXECUTE FUNCTION validar_contador_rol();

-- (2) Sincronización automática hacia histórico
CREATE OR REPLACE FUNCTION sync_contador_documento() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.contador_id IS NOT NULL THEN
        INSERT INTO Contador_Documento (documento_id, contador_id, fecha_asignacion)
        VALUES (NEW.id_documento, NEW.contador_id, CURRENT_TIMESTAMP);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_contador_documento
AFTER INSERT OR UPDATE ON Documentos
FOR EACH ROW
WHEN (NEW.contador_id IS NOT NULL)
EXECUTE FUNCTION sync_contador_documento();

CREATE OR REPLACE FUNCTION sync_contador_transaccion() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.contador_id IS NOT NULL THEN
        INSERT INTO Contador_Transaccion (transaccion_id, contador_id, fecha_asignacion)
        VALUES (NEW.id_transaccion, NEW.contador_id, CURRENT_TIMESTAMP);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_contador_transaccion
AFTER INSERT OR UPDATE ON Transacciones
FOR EACH ROW
WHEN (NEW.contador_id IS NOT NULL)
EXECUTE FUNCTION sync_contador_transaccion();

-- (3) Actualizar último acceso en Usuarios
CREATE OR REPLACE FUNCTION actualizar_ultimo_acceso() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.activo = TRUE THEN
        NEW.ultimo_acceso = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_actualizar_ultimo_acceso
BEFORE UPDATE ON Usuarios
FOR EACH ROW EXECUTE FUNCTION actualizar_ultimo_acceso();

-- =========================================================
-- PROCEDIMIENTOS ALMACENADOS
-- =========================================================
CREATE OR REPLACE PROCEDURE registrar_usuario(
    p_nombre VARCHAR,
    p_apellido VARCHAR,
    p_email VARCHAR,
    p_contrasena VARCHAR,
    p_rol_id INT
)
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO Usuarios(nombre, apellido, email, contrasena, rol_id)
    VALUES (p_nombre, p_apellido, p_email, p_contrasena, p_rol_id);
END;
$$;

CREATE OR REPLACE PROCEDURE pagar_factura(
    p_factura_id INT,
    p_monto NUMERIC,
    p_metodo_pago VARCHAR
)
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO Pagos(monto, metodo_pago, factura_id, estado)
    VALUES (p_monto, p_metodo_pago, p_factura_id, 'COMPLETADO');

    UPDATE Facturas
    SET estado = 'PAGADA'
    WHERE id_factura = p_factura_id;
END;
$$;

-- =========================================================
-- ÍNDICE
-- =========================================================
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON Usuarios(email);

-- ==================================================
-- LOGS EN EL ESQUEMA ALFARED
-- ==================================================
CREATE TABLE IF NOT EXISTS alfared.auditoria (
    id SERIAL PRIMARY KEY,
    tabla TEXT,
    operacion TEXT,
    usuario TEXT,
    fecha TIMESTAMP DEFAULT NOW(),
    datos JSON
);

-- ==================================================
-- FUNCIÓN DE TRIGGER PARA AUDITORÍA
-- ==================================================
CREATE OR REPLACE FUNCTION alfared.log_cambios()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'DELETE') THEN
        INSERT INTO alfared.auditoria(tabla, operacion, usuario, datos)
        VALUES (TG_TABLE_NAME, TG_OP, CURRENT_USER, row_to_json(OLD));
        RETURN OLD;
    ELSE
        INSERT INTO alfared.auditoria(tabla, operacion, usuario, datos)
        VALUES (TG_TABLE_NAME, TG_OP, CURRENT_USER, row_to_json(NEW));
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ==================================================
-- TRIGGERS DE AUDITORÍA EN TABLAS DEL ESQUEMA
-- (puedes agregar o quitar según quieras auditar)
-- ==================================================

-- Seguridad
CREATE TRIGGER roles_auditoria
AFTER INSERT OR UPDATE OR DELETE ON alfared.Roles
FOR EACH ROW EXECUTE FUNCTION alfared.log_cambios();

CREATE TRIGGER permisos_auditoria
AFTER INSERT OR UPDATE OR DELETE ON alfared.Permisos
FOR EACH ROW EXECUTE FUNCTION alfared.log_cambios();

CREATE TRIGGER usuarios_auditoria
AFTER INSERT OR UPDATE OR DELETE ON alfared.Usuarios
FOR EACH ROW EXECUTE FUNCTION alfared.log_cambios();

-- Documentos y Transacciones
CREATE TRIGGER documentos_auditoria
AFTER INSERT OR UPDATE OR DELETE ON alfared.Documentos
FOR EACH ROW EXECUTE FUNCTION alfared.log_cambios();

CREATE TRIGGER transacciones_auditoria
AFTER INSERT OR UPDATE OR DELETE ON alfared.Transacciones
FOR EACH ROW EXECUTE FUNCTION alfared.log_cambios();

-- PQRS y Gestión
CREATE TRIGGER pqrs_auditoria
AFTER INSERT OR UPDATE OR DELETE ON alfared.PQRS
FOR EACH ROW EXECUTE FUNCTION alfared.log_cambios();

CREATE TRIGGER analizarpqrs_auditoria
AFTER INSERT OR UPDATE OR DELETE ON alfared.AnalizarPQRS
FOR EACH ROW EXECUTE FUNCTION alfared.log_cambios();

CREATE TRIGGER gestionarpqrs_auditoria
AFTER INSERT OR UPDATE OR DELETE ON alfared.GestionarPQRS
FOR EACH ROW EXECUTE FUNCTION alfared.log_cambios();

CREATE TRIGGER satisfaccion_auditoria
AFTER INSERT OR UPDATE OR DELETE ON alfared.Satisfaccion
FOR EACH ROW EXECUTE FUNCTION alfared.log_cambios();

-- Facturas y Pagos
CREATE TRIGGER facturas_auditoria
AFTER INSERT OR UPDATE OR DELETE ON alfared.Facturas
FOR EACH ROW EXECUTE FUNCTION alfared.log_cambios();

CREATE TRIGGER pagos_auditoria
AFTER INSERT OR UPDATE OR DELETE ON alfared.Pagos
FOR EACH ROW EXECUTE FUNCTION alfared.log_cambios();

CREATE TRIGGER portalpagos_auditoria
AFTER INSERT OR UPDATE OR DELETE ON alfared.PortalPagos
FOR EACH ROW EXECUTE FUNCTION alfared.log_cambios();

CREATE TRIGGER entidadbancaria_auditoria
AFTER INSERT OR UPDATE OR DELETE ON alfared.EntidadBancaria
FOR EACH ROW EXECUTE FUNCTION alfared.log_cambios();

-- Notificaciones y Atención
CREATE TRIGGER notificarusuario_auditoria
AFTER INSERT OR UPDATE OR DELETE ON alfared.NotificarUsuario
FOR EACH ROW EXECUTE FUNCTION alfared.log_cambios();

CREATE TRIGGER atencioncliente_auditoria
AFTER INSERT OR UPDATE OR DELETE ON alfared.AtencionCliente
FOR EACH ROW EXECUTE FUNCTION alfared.log_cambios();

-- Histórico de Contadores
CREATE TRIGGER contador_documento_auditoria
AFTER INSERT OR UPDATE OR DELETE ON alfared.Contador_Documento
FOR EACH ROW EXECUTE FUNCTION alfared.log_cambios();

CREATE TRIGGER contador_transaccion_auditoria
AFTER INSERT OR UPDATE OR DELETE ON alfared.Contador_Transaccion
FOR EACH ROW EXECUTE FUNCTION alfared.log_cambios();

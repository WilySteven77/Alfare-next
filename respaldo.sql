--
-- PostgreSQL database dump
--

\restrict dYlFDbPBcRZlvQ8JpbcKw6YLaIiwhmxGuQhBmMiw1I0aktLNPXDZ32896I4rzp3

-- Dumped from database version 16.15
-- Dumped by pg_dump version 16.15

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: alfared; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA alfared;


ALTER SCHEMA alfared OWNER TO postgres;

--
-- Name: actualizar_ultimo_acceso(); Type: FUNCTION; Schema: alfared; Owner: postgres
--

CREATE FUNCTION alfared.actualizar_ultimo_acceso() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF NEW.activo = TRUE THEN
        NEW.ultimo_acceso = NOW();
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION alfared.actualizar_ultimo_acceso() OWNER TO postgres;

--
-- Name: log_cambios(); Type: FUNCTION; Schema: alfared; Owner: postgres
--

CREATE FUNCTION alfared.log_cambios() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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
$$;


ALTER FUNCTION alfared.log_cambios() OWNER TO postgres;

--
-- Name: pagar_factura(integer, numeric, character varying); Type: PROCEDURE; Schema: alfared; Owner: postgres
--

CREATE PROCEDURE alfared.pagar_factura(IN p_factura_id integer, IN p_monto numeric, IN p_metodo_pago character varying)
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


ALTER PROCEDURE alfared.pagar_factura(IN p_factura_id integer, IN p_monto numeric, IN p_metodo_pago character varying) OWNER TO postgres;

--
-- Name: registrar_usuario(character varying, character varying, character varying, character varying, integer); Type: PROCEDURE; Schema: alfared; Owner: postgres
--

CREATE PROCEDURE alfared.registrar_usuario(IN p_nombre character varying, IN p_apellido character varying, IN p_email character varying, IN p_contrasena character varying, IN p_rol_id integer)
    LANGUAGE plpgsql
    AS $$
BEGIN
    INSERT INTO Usuarios(nombre, apellido, email, contrasena, rol_id)
    VALUES (p_nombre, p_apellido, p_email, p_contrasena, p_rol_id);
END;
$$;


ALTER PROCEDURE alfared.registrar_usuario(IN p_nombre character varying, IN p_apellido character varying, IN p_email character varying, IN p_contrasena character varying, IN p_rol_id integer) OWNER TO postgres;

--
-- Name: sync_contador_documento(); Type: FUNCTION; Schema: alfared; Owner: postgres
--

CREATE FUNCTION alfared.sync_contador_documento() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF NEW.contador_id IS NOT NULL THEN
        INSERT INTO Contador_Documento (documento_id, contador_id, fecha_asignacion)
        VALUES (NEW.id_documento, NEW.contador_id, CURRENT_TIMESTAMP);
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION alfared.sync_contador_documento() OWNER TO postgres;

--
-- Name: sync_contador_transaccion(); Type: FUNCTION; Schema: alfared; Owner: postgres
--

CREATE FUNCTION alfared.sync_contador_transaccion() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF NEW.contador_id IS NOT NULL THEN
        INSERT INTO Contador_Transaccion (transaccion_id, contador_id, fecha_asignacion)
        VALUES (NEW.id_transaccion, NEW.contador_id, CURRENT_TIMESTAMP);
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION alfared.sync_contador_transaccion() OWNER TO postgres;

--
-- Name: validar_contador_rol(); Type: FUNCTION; Schema: alfared; Owner: postgres
--

CREATE FUNCTION alfared.validar_contador_rol() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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
$$;


ALTER FUNCTION alfared.validar_contador_rol() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: analizarpqrs; Type: TABLE; Schema: alfared; Owner: postgres
--

CREATE TABLE alfared.analizarpqrs (
    id_analizarpqrs integer NOT NULL,
    pqrs_id integer NOT NULL,
    analista_id integer NOT NULL,
    jefe_id integer,
    fecha_analisis timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    clasificacion character varying(100),
    acciones_determinadas text,
    informacion_adicional_solicitada text,
    antecedentes text
);


ALTER TABLE alfared.analizarpqrs OWNER TO postgres;

--
-- Name: analizarpqrs_id_analizarpqrs_seq; Type: SEQUENCE; Schema: alfared; Owner: postgres
--

CREATE SEQUENCE alfared.analizarpqrs_id_analizarpqrs_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE alfared.analizarpqrs_id_analizarpqrs_seq OWNER TO postgres;

--
-- Name: analizarpqrs_id_analizarpqrs_seq; Type: SEQUENCE OWNED BY; Schema: alfared; Owner: postgres
--

ALTER SEQUENCE alfared.analizarpqrs_id_analizarpqrs_seq OWNED BY alfared.analizarpqrs.id_analizarpqrs;


--
-- Name: atencioncliente; Type: TABLE; Schema: alfared; Owner: postgres
--

CREATE TABLE alfared.atencioncliente (
    id_atencion integer NOT NULL,
    cliente_id integer NOT NULL,
    tipo_atencion character varying(100) NOT NULL,
    descripcion text,
    fecha_atencion timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE alfared.atencioncliente OWNER TO postgres;

--
-- Name: atencioncliente_id_atencion_seq; Type: SEQUENCE; Schema: alfared; Owner: postgres
--

CREATE SEQUENCE alfared.atencioncliente_id_atencion_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE alfared.atencioncliente_id_atencion_seq OWNER TO postgres;

--
-- Name: atencioncliente_id_atencion_seq; Type: SEQUENCE OWNED BY; Schema: alfared; Owner: postgres
--

ALTER SEQUENCE alfared.atencioncliente_id_atencion_seq OWNED BY alfared.atencioncliente.id_atencion;


--
-- Name: auditoria; Type: TABLE; Schema: alfared; Owner: postgres
--

CREATE TABLE alfared.auditoria (
    id integer NOT NULL,
    tabla text,
    operacion text,
    usuario text,
    fecha timestamp without time zone DEFAULT now(),
    datos json
);


ALTER TABLE alfared.auditoria OWNER TO postgres;

--
-- Name: auditoria_id_seq; Type: SEQUENCE; Schema: alfared; Owner: postgres
--

CREATE SEQUENCE alfared.auditoria_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE alfared.auditoria_id_seq OWNER TO postgres;

--
-- Name: auditoria_id_seq; Type: SEQUENCE OWNED BY; Schema: alfared; Owner: postgres
--

ALTER SEQUENCE alfared.auditoria_id_seq OWNED BY alfared.auditoria.id;


--
-- Name: contador_documento; Type: TABLE; Schema: alfared; Owner: postgres
--

CREATE TABLE alfared.contador_documento (
    id_contador_documento integer NOT NULL,
    contador_id integer NOT NULL,
    documento_id integer NOT NULL,
    fecha_asignacion timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE alfared.contador_documento OWNER TO postgres;

--
-- Name: contador_documento_id_contador_documento_seq; Type: SEQUENCE; Schema: alfared; Owner: postgres
--

CREATE SEQUENCE alfared.contador_documento_id_contador_documento_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE alfared.contador_documento_id_contador_documento_seq OWNER TO postgres;

--
-- Name: contador_documento_id_contador_documento_seq; Type: SEQUENCE OWNED BY; Schema: alfared; Owner: postgres
--

ALTER SEQUENCE alfared.contador_documento_id_contador_documento_seq OWNED BY alfared.contador_documento.id_contador_documento;


--
-- Name: contador_transaccion; Type: TABLE; Schema: alfared; Owner: postgres
--

CREATE TABLE alfared.contador_transaccion (
    id_contador_transaccion integer NOT NULL,
    contador_id integer NOT NULL,
    transaccion_id integer NOT NULL,
    fecha_asignacion timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE alfared.contador_transaccion OWNER TO postgres;

--
-- Name: contador_transaccion_id_contador_transaccion_seq; Type: SEQUENCE; Schema: alfared; Owner: postgres
--

CREATE SEQUENCE alfared.contador_transaccion_id_contador_transaccion_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE alfared.contador_transaccion_id_contador_transaccion_seq OWNER TO postgres;

--
-- Name: contador_transaccion_id_contador_transaccion_seq; Type: SEQUENCE OWNED BY; Schema: alfared; Owner: postgres
--

ALTER SEQUENCE alfared.contador_transaccion_id_contador_transaccion_seq OWNED BY alfared.contador_transaccion.id_contador_transaccion;


--
-- Name: documentos; Type: TABLE; Schema: alfared; Owner: postgres
--

CREATE TABLE alfared.documentos (
    id_documento integer NOT NULL,
    tipo character varying(50) NOT NULL,
    contenido text,
    fecha_creacion timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    contador_id integer
);


ALTER TABLE alfared.documentos OWNER TO postgres;

--
-- Name: documentos_id_documento_seq; Type: SEQUENCE; Schema: alfared; Owner: postgres
--

CREATE SEQUENCE alfared.documentos_id_documento_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE alfared.documentos_id_documento_seq OWNER TO postgres;

--
-- Name: documentos_id_documento_seq; Type: SEQUENCE OWNED BY; Schema: alfared; Owner: postgres
--

ALTER SEQUENCE alfared.documentos_id_documento_seq OWNED BY alfared.documentos.id_documento;


--
-- Name: entidadbancaria; Type: TABLE; Schema: alfared; Owner: postgres
--

CREATE TABLE alfared.entidadbancaria (
    id_entidad integer NOT NULL,
    pago_id integer NOT NULL,
    codigo_banco character varying(10),
    referencia_banco character varying(100),
    fecha_validacion timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    resultado_validacion character varying(50),
    mensaje_banco text
);


ALTER TABLE alfared.entidadbancaria OWNER TO postgres;

--
-- Name: entidadbancaria_id_entidad_seq; Type: SEQUENCE; Schema: alfared; Owner: postgres
--

CREATE SEQUENCE alfared.entidadbancaria_id_entidad_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE alfared.entidadbancaria_id_entidad_seq OWNER TO postgres;

--
-- Name: entidadbancaria_id_entidad_seq; Type: SEQUENCE OWNED BY; Schema: alfared; Owner: postgres
--

ALTER SEQUENCE alfared.entidadbancaria_id_entidad_seq OWNED BY alfared.entidadbancaria.id_entidad;


--
-- Name: facturas; Type: TABLE; Schema: alfared; Owner: postgres
--

CREATE TABLE alfared.facturas (
    id_factura integer NOT NULL,
    fecha_emision timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    fecha_vencimiento date NOT NULL,
    monto numeric(15,2) NOT NULL,
    estado character varying(50) DEFAULT 'PENDIENTE'::character varying,
    estado_revision character varying(50) DEFAULT 'NO_REVISADA'::character varying,
    metodo_pago_preferido character varying(50),
    usuario_id integer NOT NULL,
    CONSTRAINT facturas_check CHECK ((fecha_vencimiento >= date(fecha_emision))),
    CONSTRAINT facturas_estado_check CHECK (((estado)::text = ANY ((ARRAY['PENDIENTE'::character varying, 'PAGADA'::character varying, 'ANULADA'::character varying])::text[]))),
    CONSTRAINT facturas_monto_check CHECK ((monto >= (0)::numeric))
);


ALTER TABLE alfared.facturas OWNER TO postgres;

--
-- Name: facturas_id_factura_seq; Type: SEQUENCE; Schema: alfared; Owner: postgres
--

CREATE SEQUENCE alfared.facturas_id_factura_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE alfared.facturas_id_factura_seq OWNER TO postgres;

--
-- Name: facturas_id_factura_seq; Type: SEQUENCE OWNED BY; Schema: alfared; Owner: postgres
--

ALTER SEQUENCE alfared.facturas_id_factura_seq OWNED BY alfared.facturas.id_factura;


--
-- Name: gestionarpqrs; Type: TABLE; Schema: alfared; Owner: postgres
--

CREATE TABLE alfared.gestionarpqrs (
    id_gestionarpqrs integer NOT NULL,
    pqrs_id integer NOT NULL,
    gestor_id integer NOT NULL,
    fecha_gestion timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    accion_realizada character varying(100),
    observaciones text
);


ALTER TABLE alfared.gestionarpqrs OWNER TO postgres;

--
-- Name: gestionarpqrs_id_gestionarpqrs_seq; Type: SEQUENCE; Schema: alfared; Owner: postgres
--

CREATE SEQUENCE alfared.gestionarpqrs_id_gestionarpqrs_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE alfared.gestionarpqrs_id_gestionarpqrs_seq OWNER TO postgres;

--
-- Name: gestionarpqrs_id_gestionarpqrs_seq; Type: SEQUENCE OWNED BY; Schema: alfared; Owner: postgres
--

ALTER SEQUENCE alfared.gestionarpqrs_id_gestionarpqrs_seq OWNED BY alfared.gestionarpqrs.id_gestionarpqrs;


--
-- Name: notificarusuario; Type: TABLE; Schema: alfared; Owner: postgres
--

CREATE TABLE alfared.notificarusuario (
    id_notificacion integer NOT NULL,
    usuario_id integer NOT NULL,
    mensaje text NOT NULL,
    tipo_notificacion character varying(50),
    fecha_envio timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    enviado boolean DEFAULT false
);


ALTER TABLE alfared.notificarusuario OWNER TO postgres;

--
-- Name: notificarusuario_id_notificacion_seq; Type: SEQUENCE; Schema: alfared; Owner: postgres
--

CREATE SEQUENCE alfared.notificarusuario_id_notificacion_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE alfared.notificarusuario_id_notificacion_seq OWNER TO postgres;

--
-- Name: notificarusuario_id_notificacion_seq; Type: SEQUENCE OWNED BY; Schema: alfared; Owner: postgres
--

ALTER SEQUENCE alfared.notificarusuario_id_notificacion_seq OWNED BY alfared.notificarusuario.id_notificacion;


--
-- Name: pagos; Type: TABLE; Schema: alfared; Owner: postgres
--

CREATE TABLE alfared.pagos (
    id_pago integer NOT NULL,
    monto numeric(15,2) NOT NULL,
    fecha_pago timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    metodo_pago character varying(50) NOT NULL,
    estado character varying(50) DEFAULT 'COMPLETADO'::character varying,
    factura_id integer NOT NULL,
    CONSTRAINT pagos_estado_check CHECK (((estado)::text = ANY ((ARRAY['PENDIENTE'::character varying, 'COMPLETADO'::character varying, 'FALLIDO'::character varying])::text[]))),
    CONSTRAINT pagos_monto_check CHECK ((monto >= (0)::numeric))
);


ALTER TABLE alfared.pagos OWNER TO postgres;

--
-- Name: pagos_id_pago_seq; Type: SEQUENCE; Schema: alfared; Owner: postgres
--

CREATE SEQUENCE alfared.pagos_id_pago_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE alfared.pagos_id_pago_seq OWNER TO postgres;

--
-- Name: pagos_id_pago_seq; Type: SEQUENCE OWNED BY; Schema: alfared; Owner: postgres
--

ALTER SEQUENCE alfared.pagos_id_pago_seq OWNED BY alfared.pagos.id_pago;


--
-- Name: permisos; Type: TABLE; Schema: alfared; Owner: postgres
--

CREATE TABLE alfared.permisos (
    id_permiso integer NOT NULL,
    nombre character varying(100) NOT NULL
);


ALTER TABLE alfared.permisos OWNER TO postgres;

--
-- Name: permisos_id_permiso_seq; Type: SEQUENCE; Schema: alfared; Owner: postgres
--

CREATE SEQUENCE alfared.permisos_id_permiso_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE alfared.permisos_id_permiso_seq OWNER TO postgres;

--
-- Name: permisos_id_permiso_seq; Type: SEQUENCE OWNED BY; Schema: alfared; Owner: postgres
--

ALTER SEQUENCE alfared.permisos_id_permiso_seq OWNED BY alfared.permisos.id_permiso;


--
-- Name: portalpagos; Type: TABLE; Schema: alfared; Owner: postgres
--

CREATE TABLE alfared.portalpagos (
    id_portal integer NOT NULL,
    pago_id integer NOT NULL,
    usuario_id integer NOT NULL,
    fecha_procesamiento timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    resultado character varying(50),
    mensaje text
);


ALTER TABLE alfared.portalpagos OWNER TO postgres;

--
-- Name: portalpagos_id_portal_seq; Type: SEQUENCE; Schema: alfared; Owner: postgres
--

CREATE SEQUENCE alfared.portalpagos_id_portal_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE alfared.portalpagos_id_portal_seq OWNER TO postgres;

--
-- Name: portalpagos_id_portal_seq; Type: SEQUENCE OWNED BY; Schema: alfared; Owner: postgres
--

ALTER SEQUENCE alfared.portalpagos_id_portal_seq OWNED BY alfared.portalpagos.id_portal;


--
-- Name: pqrs; Type: TABLE; Schema: alfared; Owner: postgres
--

CREATE TABLE alfared.pqrs (
    id_pqrs integer NOT NULL,
    tipo character varying(50) NOT NULL,
    descripcion text NOT NULL,
    fecha_creacion timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    estado character varying(50) DEFAULT 'PENDIENTE'::character varying,
    solicitante_id integer NOT NULL,
    analista_id integer,
    jefe_id integer,
    CONSTRAINT pqrs_estado_check CHECK (((estado)::text = ANY ((ARRAY['PENDIENTE'::character varying, 'EN_PROCESO'::character varying, 'RESUELTA'::character varying, 'CERRADA'::character varying])::text[]))),
    CONSTRAINT pqrs_tipo_check CHECK (((tipo)::text = ANY ((ARRAY['PETICION'::character varying, 'QUEJA'::character varying, 'RECLAMO'::character varying, 'SUGERENCIA'::character varying])::text[])))
);


ALTER TABLE alfared.pqrs OWNER TO postgres;

--
-- Name: pqrs_id_pqrs_seq; Type: SEQUENCE; Schema: alfared; Owner: postgres
--

CREATE SEQUENCE alfared.pqrs_id_pqrs_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE alfared.pqrs_id_pqrs_seq OWNER TO postgres;

--
-- Name: pqrs_id_pqrs_seq; Type: SEQUENCE OWNED BY; Schema: alfared; Owner: postgres
--

ALTER SEQUENCE alfared.pqrs_id_pqrs_seq OWNED BY alfared.pqrs.id_pqrs;


--
-- Name: roles; Type: TABLE; Schema: alfared; Owner: postgres
--

CREATE TABLE alfared.roles (
    id_rol integer NOT NULL,
    nombre character varying(50) NOT NULL
);


ALTER TABLE alfared.roles OWNER TO postgres;

--
-- Name: roles_id_rol_seq; Type: SEQUENCE; Schema: alfared; Owner: postgres
--

CREATE SEQUENCE alfared.roles_id_rol_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE alfared.roles_id_rol_seq OWNER TO postgres;

--
-- Name: roles_id_rol_seq; Type: SEQUENCE OWNED BY; Schema: alfared; Owner: postgres
--

ALTER SEQUENCE alfared.roles_id_rol_seq OWNED BY alfared.roles.id_rol;


--
-- Name: roles_permisos; Type: TABLE; Schema: alfared; Owner: postgres
--

CREATE TABLE alfared.roles_permisos (
    rol_id integer NOT NULL,
    permiso_id integer NOT NULL
);


ALTER TABLE alfared.roles_permisos OWNER TO postgres;

--
-- Name: satisfaccion; Type: TABLE; Schema: alfared; Owner: postgres
--

CREATE TABLE alfared.satisfaccion (
    id_satisfaccion integer NOT NULL,
    nivel integer NOT NULL,
    comentario text,
    fecha_registro timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    usuario_id integer NOT NULL,
    CONSTRAINT satisfaccion_nivel_check CHECK (((nivel >= 1) AND (nivel <= 5)))
);


ALTER TABLE alfared.satisfaccion OWNER TO postgres;

--
-- Name: satisfaccion_id_satisfaccion_seq; Type: SEQUENCE; Schema: alfared; Owner: postgres
--

CREATE SEQUENCE alfared.satisfaccion_id_satisfaccion_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE alfared.satisfaccion_id_satisfaccion_seq OWNER TO postgres;

--
-- Name: satisfaccion_id_satisfaccion_seq; Type: SEQUENCE OWNED BY; Schema: alfared; Owner: postgres
--

ALTER SEQUENCE alfared.satisfaccion_id_satisfaccion_seq OWNED BY alfared.satisfaccion.id_satisfaccion;


--
-- Name: transacciones; Type: TABLE; Schema: alfared; Owner: postgres
--

CREATE TABLE alfared.transacciones (
    id_transaccion integer NOT NULL,
    fecha timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    monto numeric(15,2) NOT NULL,
    tipo character varying(50) NOT NULL,
    estado character varying(50) DEFAULT 'PENDIENTE'::character varying,
    contador_id integer,
    CONSTRAINT transacciones_monto_check CHECK ((monto >= (0)::numeric))
);


ALTER TABLE alfared.transacciones OWNER TO postgres;

--
-- Name: transacciones_id_transaccion_seq; Type: SEQUENCE; Schema: alfared; Owner: postgres
--

CREATE SEQUENCE alfared.transacciones_id_transaccion_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE alfared.transacciones_id_transaccion_seq OWNER TO postgres;

--
-- Name: transacciones_id_transaccion_seq; Type: SEQUENCE OWNED BY; Schema: alfared; Owner: postgres
--

ALTER SEQUENCE alfared.transacciones_id_transaccion_seq OWNED BY alfared.transacciones.id_transaccion;


--
-- Name: usuarios; Type: TABLE; Schema: alfared; Owner: postgres
--

CREATE TABLE alfared.usuarios (
    id_usuario integer NOT NULL,
    nombre character varying(100) NOT NULL,
    apellido character varying(100) NOT NULL,
    email character varying(150) NOT NULL,
    contrasena character varying(255) NOT NULL,
    rol_id integer NOT NULL,
    activo boolean DEFAULT true,
    fecha_registro timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    ultimo_acceso timestamp without time zone
);


ALTER TABLE alfared.usuarios OWNER TO postgres;

--
-- Name: usuarios_id_usuario_seq; Type: SEQUENCE; Schema: alfared; Owner: postgres
--

CREATE SEQUENCE alfared.usuarios_id_usuario_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE alfared.usuarios_id_usuario_seq OWNER TO postgres;

--
-- Name: usuarios_id_usuario_seq; Type: SEQUENCE OWNED BY; Schema: alfared; Owner: postgres
--

ALTER SEQUENCE alfared.usuarios_id_usuario_seq OWNED BY alfared.usuarios.id_usuario;


--
-- Name: analizarpqrs id_analizarpqrs; Type: DEFAULT; Schema: alfared; Owner: postgres
--

ALTER TABLE ONLY alfared.analizarpqrs ALTER COLUMN id_analizarpqrs SET DEFAULT nextval('alfared.analizarpqrs_id_analizarpqrs_seq'::regclass);


--
-- Name: atencioncliente id_atencion; Type: DEFAULT; Schema: alfared; Owner: postgres
--

ALTER TABLE ONLY alfared.atencioncliente ALTER COLUMN id_atencion SET DEFAULT nextval('alfared.atencioncliente_id_atencion_seq'::regclass);


--
-- Name: auditoria id; Type: DEFAULT; Schema: alfared; Owner: postgres
--

ALTER TABLE ONLY alfared.auditoria ALTER COLUMN id SET DEFAULT nextval('alfared.auditoria_id_seq'::regclass);


--
-- Name: contador_documento id_contador_documento; Type: DEFAULT; Schema: alfared; Owner: postgres
--

ALTER TABLE ONLY alfared.contador_documento ALTER COLUMN id_contador_documento SET DEFAULT nextval('alfared.contador_documento_id_contador_documento_seq'::regclass);


--
-- Name: contador_transaccion id_contador_transaccion; Type: DEFAULT; Schema: alfared; Owner: postgres
--

ALTER TABLE ONLY alfared.contador_transaccion ALTER COLUMN id_contador_transaccion SET DEFAULT nextval('alfared.contador_transaccion_id_contador_transaccion_seq'::regclass);


--
-- Name: documentos id_documento; Type: DEFAULT; Schema: alfared; Owner: postgres
--

ALTER TABLE ONLY alfared.documentos ALTER COLUMN id_documento SET DEFAULT nextval('alfared.documentos_id_documento_seq'::regclass);


--
-- Name: entidadbancaria id_entidad; Type: DEFAULT; Schema: alfared; Owner: postgres
--

ALTER TABLE ONLY alfared.entidadbancaria ALTER COLUMN id_entidad SET DEFAULT nextval('alfared.entidadbancaria_id_entidad_seq'::regclass);


--
-- Name: facturas id_factura; Type: DEFAULT; Schema: alfared; Owner: postgres
--

ALTER TABLE ONLY alfared.facturas ALTER COLUMN id_factura SET DEFAULT nextval('alfared.facturas_id_factura_seq'::regclass);


--
-- Name: gestionarpqrs id_gestionarpqrs; Type: DEFAULT; Schema: alfared; Owner: postgres
--

ALTER TABLE ONLY alfared.gestionarpqrs ALTER COLUMN id_gestionarpqrs SET DEFAULT nextval('alfared.gestionarpqrs_id_gestionarpqrs_seq'::regclass);


--
-- Name: notificarusuario id_notificacion; Type: DEFAULT; Schema: alfared; Owner: postgres
--

ALTER TABLE ONLY alfared.notificarusuario ALTER COLUMN id_notificacion SET DEFAULT nextval('alfared.notificarusuario_id_notificacion_seq'::regclass);


--
-- Name: pagos id_pago; Type: DEFAULT; Schema: alfared; Owner: postgres
--

ALTER TABLE ONLY alfared.pagos ALTER COLUMN id_pago SET DEFAULT nextval('alfared.pagos_id_pago_seq'::regclass);


--
-- Name: permisos id_permiso; Type: DEFAULT; Schema: alfared; Owner: postgres
--

ALTER TABLE ONLY alfared.permisos ALTER COLUMN id_permiso SET DEFAULT nextval('alfared.permisos_id_permiso_seq'::regclass);


--
-- Name: portalpagos id_portal; Type: DEFAULT; Schema: alfared; Owner: postgres
--

ALTER TABLE ONLY alfared.portalpagos ALTER COLUMN id_portal SET DEFAULT nextval('alfared.portalpagos_id_portal_seq'::regclass);


--
-- Name: pqrs id_pqrs; Type: DEFAULT; Schema: alfared; Owner: postgres
--

ALTER TABLE ONLY alfared.pqrs ALTER COLUMN id_pqrs SET DEFAULT nextval('alfared.pqrs_id_pqrs_seq'::regclass);


--
-- Name: roles id_rol; Type: DEFAULT; Schema: alfared; Owner: postgres
--

ALTER TABLE ONLY alfared.roles ALTER COLUMN id_rol SET DEFAULT nextval('alfared.roles_id_rol_seq'::regclass);


--
-- Name: satisfaccion id_satisfaccion; Type: DEFAULT; Schema: alfared; Owner: postgres
--

ALTER TABLE ONLY alfared.satisfaccion ALTER COLUMN id_satisfaccion SET DEFAULT nextval('alfared.satisfaccion_id_satisfaccion_seq'::regclass);


--
-- Name: transacciones id_transaccion; Type: DEFAULT; Schema: alfared; Owner: postgres
--

ALTER TABLE ONLY alfared.transacciones ALTER COLUMN id_transaccion SET DEFAULT nextval('alfared.transacciones_id_transaccion_seq'::regclass);


--
-- Name: usuarios id_usuario; Type: DEFAULT; Schema: alfared; Owner: postgres
--

ALTER TABLE ONLY alfared.usuarios ALTER COLUMN id_usuario SET DEFAULT nextval('alfared.usuarios_id_usuario_seq'::regclass);


--
-- Data for Name: analizarpqrs; Type: TABLE DATA; Schema: alfared; Owner: postgres
--

COPY alfared.analizarpqrs (id_analizarpqrs, pqrs_id, analista_id, jefe_id, fecha_analisis, clasificacion, acciones_determinadas, informacion_adicional_solicitada, antecedentes) FROM stdin;
\.


--
-- Data for Name: atencioncliente; Type: TABLE DATA; Schema: alfared; Owner: postgres
--

COPY alfared.atencioncliente (id_atencion, cliente_id, tipo_atencion, descripcion, fecha_atencion) FROM stdin;
\.


--
-- Data for Name: auditoria; Type: TABLE DATA; Schema: alfared; Owner: postgres
--

COPY alfared.auditoria (id, tabla, operacion, usuario, fecha, datos) FROM stdin;
1	usuarios	UPDATE	postgres	2026-09-30 21:33:21.263525	{"id_usuario":2,"nombre":"Tecnico","apellido":"Demo","email":"tecnico.demo@alfared.local","contrasena":"alfared2024","rol_id":2,"activo":true,"fecha_registro":"2026-09-30T21:14:11.604333","ultimo_acceso":"2026-09-30T21:33:21.263525"}
\.


--
-- Data for Name: contador_documento; Type: TABLE DATA; Schema: alfared; Owner: postgres
--

COPY alfared.contador_documento (id_contador_documento, contador_id, documento_id, fecha_asignacion) FROM stdin;
\.


--
-- Data for Name: contador_transaccion; Type: TABLE DATA; Schema: alfared; Owner: postgres
--

COPY alfared.contador_transaccion (id_contador_transaccion, contador_id, transaccion_id, fecha_asignacion) FROM stdin;
\.


--
-- Data for Name: documentos; Type: TABLE DATA; Schema: alfared; Owner: postgres
--

COPY alfared.documentos (id_documento, tipo, contenido, fecha_creacion, contador_id) FROM stdin;
\.


--
-- Data for Name: entidadbancaria; Type: TABLE DATA; Schema: alfared; Owner: postgres
--

COPY alfared.entidadbancaria (id_entidad, pago_id, codigo_banco, referencia_banco, fecha_validacion, resultado_validacion, mensaje_banco) FROM stdin;
\.


--
-- Data for Name: facturas; Type: TABLE DATA; Schema: alfared; Owner: postgres
--

COPY alfared.facturas (id_factura, fecha_emision, fecha_vencimiento, monto, estado, estado_revision, metodo_pago_preferido, usuario_id) FROM stdin;
\.


--
-- Data for Name: gestionarpqrs; Type: TABLE DATA; Schema: alfared; Owner: postgres
--

COPY alfared.gestionarpqrs (id_gestionarpqrs, pqrs_id, gestor_id, fecha_gestion, accion_realizada, observaciones) FROM stdin;
\.


--
-- Data for Name: notificarusuario; Type: TABLE DATA; Schema: alfared; Owner: postgres
--

COPY alfared.notificarusuario (id_notificacion, usuario_id, mensaje, tipo_notificacion, fecha_envio, enviado) FROM stdin;
\.


--
-- Data for Name: pagos; Type: TABLE DATA; Schema: alfared; Owner: postgres
--

COPY alfared.pagos (id_pago, monto, fecha_pago, metodo_pago, estado, factura_id) FROM stdin;
\.


--
-- Data for Name: permisos; Type: TABLE DATA; Schema: alfared; Owner: postgres
--

COPY alfared.permisos (id_permiso, nombre) FROM stdin;
\.


--
-- Data for Name: portalpagos; Type: TABLE DATA; Schema: alfared; Owner: postgres
--

COPY alfared.portalpagos (id_portal, pago_id, usuario_id, fecha_procesamiento, resultado, mensaje) FROM stdin;
\.


--
-- Data for Name: pqrs; Type: TABLE DATA; Schema: alfared; Owner: postgres
--

COPY alfared.pqrs (id_pqrs, tipo, descripcion, fecha_creacion, estado, solicitante_id, analista_id, jefe_id) FROM stdin;
\.


--
-- Data for Name: roles; Type: TABLE DATA; Schema: alfared; Owner: postgres
--

COPY alfared.roles (id_rol, nombre) FROM stdin;
1	ADMINISTRADOR
2	TECNICO
3	CONTADOR
4	CLIENTE
\.


--
-- Data for Name: roles_permisos; Type: TABLE DATA; Schema: alfared; Owner: postgres
--

COPY alfared.roles_permisos (rol_id, permiso_id) FROM stdin;
\.


--
-- Data for Name: satisfaccion; Type: TABLE DATA; Schema: alfared; Owner: postgres
--

COPY alfared.satisfaccion (id_satisfaccion, nivel, comentario, fecha_registro, usuario_id) FROM stdin;
\.


--
-- Data for Name: transacciones; Type: TABLE DATA; Schema: alfared; Owner: postgres
--

COPY alfared.transacciones (id_transaccion, fecha, monto, tipo, estado, contador_id) FROM stdin;
\.


--
-- Data for Name: usuarios; Type: TABLE DATA; Schema: alfared; Owner: postgres
--

COPY alfared.usuarios (id_usuario, nombre, apellido, email, contrasena, rol_id, activo, fecha_registro, ultimo_acceso) FROM stdin;
1	Admin	Demo	admin.demo@alfared.local	alfared2024	1	t	2026-09-30 21:14:11.598802	\N
3	Contador	Demo	contador.demo@alfared.local	alfared2024	3	t	2026-09-30 21:14:11.606424	\N
2	Tecnico	Demo	tecnico.demo@alfared.local	alfared2024	2	t	2026-09-30 21:14:11.604333	2026-09-30 21:33:21.263525
\.


--
-- Name: analizarpqrs_id_analizarpqrs_seq; Type: SEQUENCE SET; Schema: alfared; Owner: postgres
--

SELECT pg_catalog.setval('alfared.analizarpqrs_id_analizarpqrs_seq', 1, false);


--
-- Name: atencioncliente_id_atencion_seq; Type: SEQUENCE SET; Schema: alfared; Owner: postgres
--

SELECT pg_catalog.setval('alfared.atencioncliente_id_atencion_seq', 1, false);


--
-- Name: auditoria_id_seq; Type: SEQUENCE SET; Schema: alfared; Owner: postgres
--

SELECT pg_catalog.setval('alfared.auditoria_id_seq', 1, true);


--
-- Name: contador_documento_id_contador_documento_seq; Type: SEQUENCE SET; Schema: alfared; Owner: postgres
--

SELECT pg_catalog.setval('alfared.contador_documento_id_contador_documento_seq', 1, false);


--
-- Name: contador_transaccion_id_contador_transaccion_seq; Type: SEQUENCE SET; Schema: alfared; Owner: postgres
--

SELECT pg_catalog.setval('alfared.contador_transaccion_id_contador_transaccion_seq', 1, false);


--
-- Name: documentos_id_documento_seq; Type: SEQUENCE SET; Schema: alfared; Owner: postgres
--

SELECT pg_catalog.setval('alfared.documentos_id_documento_seq', 1, false);


--
-- Name: entidadbancaria_id_entidad_seq; Type: SEQUENCE SET; Schema: alfared; Owner: postgres
--

SELECT pg_catalog.setval('alfared.entidadbancaria_id_entidad_seq', 1, false);


--
-- Name: facturas_id_factura_seq; Type: SEQUENCE SET; Schema: alfared; Owner: postgres
--

SELECT pg_catalog.setval('alfared.facturas_id_factura_seq', 1, false);


--
-- Name: gestionarpqrs_id_gestionarpqrs_seq; Type: SEQUENCE SET; Schema: alfared; Owner: postgres
--

SELECT pg_catalog.setval('alfared.gestionarpqrs_id_gestionarpqrs_seq', 1, false);


--
-- Name: notificarusuario_id_notificacion_seq; Type: SEQUENCE SET; Schema: alfared; Owner: postgres
--

SELECT pg_catalog.setval('alfared.notificarusuario_id_notificacion_seq', 1, false);


--
-- Name: pagos_id_pago_seq; Type: SEQUENCE SET; Schema: alfared; Owner: postgres
--

SELECT pg_catalog.setval('alfared.pagos_id_pago_seq', 1, false);


--
-- Name: permisos_id_permiso_seq; Type: SEQUENCE SET; Schema: alfared; Owner: postgres
--

SELECT pg_catalog.setval('alfared.permisos_id_permiso_seq', 1, false);


--
-- Name: portalpagos_id_portal_seq; Type: SEQUENCE SET; Schema: alfared; Owner: postgres
--

SELECT pg_catalog.setval('alfared.portalpagos_id_portal_seq', 1, false);


--
-- Name: pqrs_id_pqrs_seq; Type: SEQUENCE SET; Schema: alfared; Owner: postgres
--

SELECT pg_catalog.setval('alfared.pqrs_id_pqrs_seq', 1, false);


--
-- Name: roles_id_rol_seq; Type: SEQUENCE SET; Schema: alfared; Owner: postgres
--

SELECT pg_catalog.setval('alfared.roles_id_rol_seq', 4, true);


--
-- Name: satisfaccion_id_satisfaccion_seq; Type: SEQUENCE SET; Schema: alfared; Owner: postgres
--

SELECT pg_catalog.setval('alfared.satisfaccion_id_satisfaccion_seq', 1, false);


--
-- Name: transacciones_id_transaccion_seq; Type: SEQUENCE SET; Schema: alfared; Owner: postgres
--

SELECT pg_catalog.setval('alfared.transacciones_id_transaccion_seq', 1, false);


--
-- Name: usuarios_id_usuario_seq; Type: SEQUENCE SET; Schema: alfared; Owner: postgres
--

SELECT pg_catalog.setval('alfared.usuarios_id_usuario_seq', 3, true);


--
-- Name: analizarpqrs analizarpqrs_pkey; Type: CONSTRAINT; Schema: alfared; Owner: postgres
--

ALTER TABLE ONLY alfared.analizarpqrs
    ADD CONSTRAINT analizarpqrs_pkey PRIMARY KEY (id_analizarpqrs);


--
-- Name: atencioncliente atencioncliente_pkey; Type: CONSTRAINT; Schema: alfared; Owner: postgres
--

ALTER TABLE ONLY alfared.atencioncliente
    ADD CONSTRAINT atencioncliente_pkey PRIMARY KEY (id_atencion);


--
-- Name: auditoria auditoria_pkey; Type: CONSTRAINT; Schema: alfared; Owner: postgres
--

ALTER TABLE ONLY alfared.auditoria
    ADD CONSTRAINT auditoria_pkey PRIMARY KEY (id);


--
-- Name: contador_documento contador_documento_pkey; Type: CONSTRAINT; Schema: alfared; Owner: postgres
--

ALTER TABLE ONLY alfared.contador_documento
    ADD CONSTRAINT contador_documento_pkey PRIMARY KEY (id_contador_documento);


--
-- Name: contador_transaccion contador_transaccion_pkey; Type: CONSTRAINT; Schema: alfared; Owner: postgres
--

ALTER TABLE ONLY alfared.contador_transaccion
    ADD CONSTRAINT contador_transaccion_pkey PRIMARY KEY (id_contador_transaccion);


--
-- Name: documentos documentos_pkey; Type: CONSTRAINT; Schema: alfared; Owner: postgres
--

ALTER TABLE ONLY alfared.documentos
    ADD CONSTRAINT documentos_pkey PRIMARY KEY (id_documento);


--
-- Name: entidadbancaria entidadbancaria_pkey; Type: CONSTRAINT; Schema: alfared; Owner: postgres
--

ALTER TABLE ONLY alfared.entidadbancaria
    ADD CONSTRAINT entidadbancaria_pkey PRIMARY KEY (id_entidad);


--
-- Name: facturas facturas_pkey; Type: CONSTRAINT; Schema: alfared; Owner: postgres
--

ALTER TABLE ONLY alfared.facturas
    ADD CONSTRAINT facturas_pkey PRIMARY KEY (id_factura);


--
-- Name: gestionarpqrs gestionarpqrs_pkey; Type: CONSTRAINT; Schema: alfared; Owner: postgres
--

ALTER TABLE ONLY alfared.gestionarpqrs
    ADD CONSTRAINT gestionarpqrs_pkey PRIMARY KEY (id_gestionarpqrs);


--
-- Name: notificarusuario notificarusuario_pkey; Type: CONSTRAINT; Schema: alfared; Owner: postgres
--

ALTER TABLE ONLY alfared.notificarusuario
    ADD CONSTRAINT notificarusuario_pkey PRIMARY KEY (id_notificacion);


--
-- Name: pagos pagos_pkey; Type: CONSTRAINT; Schema: alfared; Owner: postgres
--

ALTER TABLE ONLY alfared.pagos
    ADD CONSTRAINT pagos_pkey PRIMARY KEY (id_pago);


--
-- Name: permisos permisos_nombre_key; Type: CONSTRAINT; Schema: alfared; Owner: postgres
--

ALTER TABLE ONLY alfared.permisos
    ADD CONSTRAINT permisos_nombre_key UNIQUE (nombre);


--
-- Name: permisos permisos_pkey; Type: CONSTRAINT; Schema: alfared; Owner: postgres
--

ALTER TABLE ONLY alfared.permisos
    ADD CONSTRAINT permisos_pkey PRIMARY KEY (id_permiso);


--
-- Name: portalpagos portalpagos_pkey; Type: CONSTRAINT; Schema: alfared; Owner: postgres
--

ALTER TABLE ONLY alfared.portalpagos
    ADD CONSTRAINT portalpagos_pkey PRIMARY KEY (id_portal);


--
-- Name: pqrs pqrs_pkey; Type: CONSTRAINT; Schema: alfared; Owner: postgres
--

ALTER TABLE ONLY alfared.pqrs
    ADD CONSTRAINT pqrs_pkey PRIMARY KEY (id_pqrs);


--
-- Name: roles roles_nombre_key; Type: CONSTRAINT; Schema: alfared; Owner: postgres
--

ALTER TABLE ONLY alfared.roles
    ADD CONSTRAINT roles_nombre_key UNIQUE (nombre);


--
-- Name: roles_permisos roles_permisos_pkey; Type: CONSTRAINT; Schema: alfared; Owner: postgres
--

ALTER TABLE ONLY alfared.roles_permisos
    ADD CONSTRAINT roles_permisos_pkey PRIMARY KEY (rol_id, permiso_id);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: alfared; Owner: postgres
--

ALTER TABLE ONLY alfared.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id_rol);


--
-- Name: satisfaccion satisfaccion_pkey; Type: CONSTRAINT; Schema: alfared; Owner: postgres
--

ALTER TABLE ONLY alfared.satisfaccion
    ADD CONSTRAINT satisfaccion_pkey PRIMARY KEY (id_satisfaccion);


--
-- Name: transacciones transacciones_pkey; Type: CONSTRAINT; Schema: alfared; Owner: postgres
--

ALTER TABLE ONLY alfared.transacciones
    ADD CONSTRAINT transacciones_pkey PRIMARY KEY (id_transaccion);


--
-- Name: usuarios usuarios_email_key; Type: CONSTRAINT; Schema: alfared; Owner: postgres
--

ALTER TABLE ONLY alfared.usuarios
    ADD CONSTRAINT usuarios_email_key UNIQUE (email);


--
-- Name: usuarios usuarios_pkey; Type: CONSTRAINT; Schema: alfared; Owner: postgres
--

ALTER TABLE ONLY alfared.usuarios
    ADD CONSTRAINT usuarios_pkey PRIMARY KEY (id_usuario);


--
-- Name: idx_usuarios_email; Type: INDEX; Schema: alfared; Owner: postgres
--

CREATE INDEX idx_usuarios_email ON alfared.usuarios USING btree (email);


--
-- Name: analizarpqrs analizarpqrs_auditoria; Type: TRIGGER; Schema: alfared; Owner: postgres
--

CREATE TRIGGER analizarpqrs_auditoria AFTER INSERT OR DELETE OR UPDATE ON alfared.analizarpqrs FOR EACH ROW EXECUTE FUNCTION alfared.log_cambios();


--
-- Name: atencioncliente atencioncliente_auditoria; Type: TRIGGER; Schema: alfared; Owner: postgres
--

CREATE TRIGGER atencioncliente_auditoria AFTER INSERT OR DELETE OR UPDATE ON alfared.atencioncliente FOR EACH ROW EXECUTE FUNCTION alfared.log_cambios();


--
-- Name: contador_documento contador_documento_auditoria; Type: TRIGGER; Schema: alfared; Owner: postgres
--

CREATE TRIGGER contador_documento_auditoria AFTER INSERT OR DELETE OR UPDATE ON alfared.contador_documento FOR EACH ROW EXECUTE FUNCTION alfared.log_cambios();


--
-- Name: contador_transaccion contador_transaccion_auditoria; Type: TRIGGER; Schema: alfared; Owner: postgres
--

CREATE TRIGGER contador_transaccion_auditoria AFTER INSERT OR DELETE OR UPDATE ON alfared.contador_transaccion FOR EACH ROW EXECUTE FUNCTION alfared.log_cambios();


--
-- Name: documentos documentos_auditoria; Type: TRIGGER; Schema: alfared; Owner: postgres
--

CREATE TRIGGER documentos_auditoria AFTER INSERT OR DELETE OR UPDATE ON alfared.documentos FOR EACH ROW EXECUTE FUNCTION alfared.log_cambios();


--
-- Name: entidadbancaria entidadbancaria_auditoria; Type: TRIGGER; Schema: alfared; Owner: postgres
--

CREATE TRIGGER entidadbancaria_auditoria AFTER INSERT OR DELETE OR UPDATE ON alfared.entidadbancaria FOR EACH ROW EXECUTE FUNCTION alfared.log_cambios();


--
-- Name: facturas facturas_auditoria; Type: TRIGGER; Schema: alfared; Owner: postgres
--

CREATE TRIGGER facturas_auditoria AFTER INSERT OR DELETE OR UPDATE ON alfared.facturas FOR EACH ROW EXECUTE FUNCTION alfared.log_cambios();


--
-- Name: gestionarpqrs gestionarpqrs_auditoria; Type: TRIGGER; Schema: alfared; Owner: postgres
--

CREATE TRIGGER gestionarpqrs_auditoria AFTER INSERT OR DELETE OR UPDATE ON alfared.gestionarpqrs FOR EACH ROW EXECUTE FUNCTION alfared.log_cambios();


--
-- Name: notificarusuario notificarusuario_auditoria; Type: TRIGGER; Schema: alfared; Owner: postgres
--

CREATE TRIGGER notificarusuario_auditoria AFTER INSERT OR DELETE OR UPDATE ON alfared.notificarusuario FOR EACH ROW EXECUTE FUNCTION alfared.log_cambios();


--
-- Name: pagos pagos_auditoria; Type: TRIGGER; Schema: alfared; Owner: postgres
--

CREATE TRIGGER pagos_auditoria AFTER INSERT OR DELETE OR UPDATE ON alfared.pagos FOR EACH ROW EXECUTE FUNCTION alfared.log_cambios();


--
-- Name: permisos permisos_auditoria; Type: TRIGGER; Schema: alfared; Owner: postgres
--

CREATE TRIGGER permisos_auditoria AFTER INSERT OR DELETE OR UPDATE ON alfared.permisos FOR EACH ROW EXECUTE FUNCTION alfared.log_cambios();


--
-- Name: portalpagos portalpagos_auditoria; Type: TRIGGER; Schema: alfared; Owner: postgres
--

CREATE TRIGGER portalpagos_auditoria AFTER INSERT OR DELETE OR UPDATE ON alfared.portalpagos FOR EACH ROW EXECUTE FUNCTION alfared.log_cambios();


--
-- Name: pqrs pqrs_auditoria; Type: TRIGGER; Schema: alfared; Owner: postgres
--

CREATE TRIGGER pqrs_auditoria AFTER INSERT OR DELETE OR UPDATE ON alfared.pqrs FOR EACH ROW EXECUTE FUNCTION alfared.log_cambios();


--
-- Name: roles roles_auditoria; Type: TRIGGER; Schema: alfared; Owner: postgres
--

CREATE TRIGGER roles_auditoria AFTER INSERT OR DELETE OR UPDATE ON alfared.roles FOR EACH ROW EXECUTE FUNCTION alfared.log_cambios();


--
-- Name: satisfaccion satisfaccion_auditoria; Type: TRIGGER; Schema: alfared; Owner: postgres
--

CREATE TRIGGER satisfaccion_auditoria AFTER INSERT OR DELETE OR UPDATE ON alfared.satisfaccion FOR EACH ROW EXECUTE FUNCTION alfared.log_cambios();


--
-- Name: transacciones transacciones_auditoria; Type: TRIGGER; Schema: alfared; Owner: postgres
--

CREATE TRIGGER transacciones_auditoria AFTER INSERT OR DELETE OR UPDATE ON alfared.transacciones FOR EACH ROW EXECUTE FUNCTION alfared.log_cambios();


--
-- Name: usuarios trg_actualizar_ultimo_acceso; Type: TRIGGER; Schema: alfared; Owner: postgres
--

CREATE TRIGGER trg_actualizar_ultimo_acceso BEFORE UPDATE ON alfared.usuarios FOR EACH ROW EXECUTE FUNCTION alfared.actualizar_ultimo_acceso();


--
-- Name: documentos trg_sync_contador_documento; Type: TRIGGER; Schema: alfared; Owner: postgres
--

CREATE TRIGGER trg_sync_contador_documento AFTER INSERT OR UPDATE ON alfared.documentos FOR EACH ROW WHEN ((new.contador_id IS NOT NULL)) EXECUTE FUNCTION alfared.sync_contador_documento();


--
-- Name: transacciones trg_sync_contador_transaccion; Type: TRIGGER; Schema: alfared; Owner: postgres
--

CREATE TRIGGER trg_sync_contador_transaccion AFTER INSERT OR UPDATE ON alfared.transacciones FOR EACH ROW WHEN ((new.contador_id IS NOT NULL)) EXECUTE FUNCTION alfared.sync_contador_transaccion();


--
-- Name: documentos trg_validar_contador_documento_directo; Type: TRIGGER; Schema: alfared; Owner: postgres
--

CREATE TRIGGER trg_validar_contador_documento_directo BEFORE INSERT OR UPDATE ON alfared.documentos FOR EACH ROW WHEN ((new.contador_id IS NOT NULL)) EXECUTE FUNCTION alfared.validar_contador_rol();


--
-- Name: transacciones trg_validar_contador_transaccion_directo; Type: TRIGGER; Schema: alfared; Owner: postgres
--

CREATE TRIGGER trg_validar_contador_transaccion_directo BEFORE INSERT OR UPDATE ON alfared.transacciones FOR EACH ROW WHEN ((new.contador_id IS NOT NULL)) EXECUTE FUNCTION alfared.validar_contador_rol();


--
-- Name: usuarios usuarios_auditoria; Type: TRIGGER; Schema: alfared; Owner: postgres
--

CREATE TRIGGER usuarios_auditoria AFTER INSERT OR DELETE OR UPDATE ON alfared.usuarios FOR EACH ROW EXECUTE FUNCTION alfared.log_cambios();


--
-- Name: analizarpqrs analizarpqrs_analista_id_fkey; Type: FK CONSTRAINT; Schema: alfared; Owner: postgres
--

ALTER TABLE ONLY alfared.analizarpqrs
    ADD CONSTRAINT analizarpqrs_analista_id_fkey FOREIGN KEY (analista_id) REFERENCES alfared.usuarios(id_usuario) ON DELETE CASCADE;


--
-- Name: analizarpqrs analizarpqrs_jefe_id_fkey; Type: FK CONSTRAINT; Schema: alfared; Owner: postgres
--

ALTER TABLE ONLY alfared.analizarpqrs
    ADD CONSTRAINT analizarpqrs_jefe_id_fkey FOREIGN KEY (jefe_id) REFERENCES alfared.usuarios(id_usuario) ON DELETE SET NULL;


--
-- Name: analizarpqrs analizarpqrs_pqrs_id_fkey; Type: FK CONSTRAINT; Schema: alfared; Owner: postgres
--

ALTER TABLE ONLY alfared.analizarpqrs
    ADD CONSTRAINT analizarpqrs_pqrs_id_fkey FOREIGN KEY (pqrs_id) REFERENCES alfared.pqrs(id_pqrs) ON DELETE CASCADE;


--
-- Name: atencioncliente atencioncliente_cliente_id_fkey; Type: FK CONSTRAINT; Schema: alfared; Owner: postgres
--

ALTER TABLE ONLY alfared.atencioncliente
    ADD CONSTRAINT atencioncliente_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES alfared.usuarios(id_usuario) ON DELETE CASCADE;


--
-- Name: contador_documento contador_documento_contador_id_fkey; Type: FK CONSTRAINT; Schema: alfared; Owner: postgres
--

ALTER TABLE ONLY alfared.contador_documento
    ADD CONSTRAINT contador_documento_contador_id_fkey FOREIGN KEY (contador_id) REFERENCES alfared.usuarios(id_usuario) ON DELETE CASCADE;


--
-- Name: contador_documento contador_documento_documento_id_fkey; Type: FK CONSTRAINT; Schema: alfared; Owner: postgres
--

ALTER TABLE ONLY alfared.contador_documento
    ADD CONSTRAINT contador_documento_documento_id_fkey FOREIGN KEY (documento_id) REFERENCES alfared.documentos(id_documento) ON DELETE CASCADE;


--
-- Name: contador_transaccion contador_transaccion_contador_id_fkey; Type: FK CONSTRAINT; Schema: alfared; Owner: postgres
--

ALTER TABLE ONLY alfared.contador_transaccion
    ADD CONSTRAINT contador_transaccion_contador_id_fkey FOREIGN KEY (contador_id) REFERENCES alfared.usuarios(id_usuario) ON DELETE CASCADE;


--
-- Name: contador_transaccion contador_transaccion_transaccion_id_fkey; Type: FK CONSTRAINT; Schema: alfared; Owner: postgres
--

ALTER TABLE ONLY alfared.contador_transaccion
    ADD CONSTRAINT contador_transaccion_transaccion_id_fkey FOREIGN KEY (transaccion_id) REFERENCES alfared.transacciones(id_transaccion) ON DELETE CASCADE;


--
-- Name: entidadbancaria entidadbancaria_pago_id_fkey; Type: FK CONSTRAINT; Schema: alfared; Owner: postgres
--

ALTER TABLE ONLY alfared.entidadbancaria
    ADD CONSTRAINT entidadbancaria_pago_id_fkey FOREIGN KEY (pago_id) REFERENCES alfared.pagos(id_pago) ON DELETE CASCADE;


--
-- Name: facturas facturas_usuario_id_fkey; Type: FK CONSTRAINT; Schema: alfared; Owner: postgres
--

ALTER TABLE ONLY alfared.facturas
    ADD CONSTRAINT facturas_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES alfared.usuarios(id_usuario) ON DELETE RESTRICT;


--
-- Name: documentos fk_documentos_contador; Type: FK CONSTRAINT; Schema: alfared; Owner: postgres
--

ALTER TABLE ONLY alfared.documentos
    ADD CONSTRAINT fk_documentos_contador FOREIGN KEY (contador_id) REFERENCES alfared.usuarios(id_usuario) ON DELETE SET NULL;


--
-- Name: transacciones fk_transacciones_contador; Type: FK CONSTRAINT; Schema: alfared; Owner: postgres
--

ALTER TABLE ONLY alfared.transacciones
    ADD CONSTRAINT fk_transacciones_contador FOREIGN KEY (contador_id) REFERENCES alfared.usuarios(id_usuario) ON DELETE SET NULL;


--
-- Name: gestionarpqrs gestionarpqrs_gestor_id_fkey; Type: FK CONSTRAINT; Schema: alfared; Owner: postgres
--

ALTER TABLE ONLY alfared.gestionarpqrs
    ADD CONSTRAINT gestionarpqrs_gestor_id_fkey FOREIGN KEY (gestor_id) REFERENCES alfared.usuarios(id_usuario) ON DELETE CASCADE;


--
-- Name: gestionarpqrs gestionarpqrs_pqrs_id_fkey; Type: FK CONSTRAINT; Schema: alfared; Owner: postgres
--

ALTER TABLE ONLY alfared.gestionarpqrs
    ADD CONSTRAINT gestionarpqrs_pqrs_id_fkey FOREIGN KEY (pqrs_id) REFERENCES alfared.pqrs(id_pqrs) ON DELETE CASCADE;


--
-- Name: notificarusuario notificarusuario_usuario_id_fkey; Type: FK CONSTRAINT; Schema: alfared; Owner: postgres
--

ALTER TABLE ONLY alfared.notificarusuario
    ADD CONSTRAINT notificarusuario_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES alfared.usuarios(id_usuario) ON DELETE CASCADE;


--
-- Name: pagos pagos_factura_id_fkey; Type: FK CONSTRAINT; Schema: alfared; Owner: postgres
--

ALTER TABLE ONLY alfared.pagos
    ADD CONSTRAINT pagos_factura_id_fkey FOREIGN KEY (factura_id) REFERENCES alfared.facturas(id_factura) ON DELETE RESTRICT;


--
-- Name: portalpagos portalpagos_pago_id_fkey; Type: FK CONSTRAINT; Schema: alfared; Owner: postgres
--

ALTER TABLE ONLY alfared.portalpagos
    ADD CONSTRAINT portalpagos_pago_id_fkey FOREIGN KEY (pago_id) REFERENCES alfared.pagos(id_pago) ON DELETE CASCADE;


--
-- Name: portalpagos portalpagos_usuario_id_fkey; Type: FK CONSTRAINT; Schema: alfared; Owner: postgres
--

ALTER TABLE ONLY alfared.portalpagos
    ADD CONSTRAINT portalpagos_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES alfared.usuarios(id_usuario) ON DELETE CASCADE;


--
-- Name: pqrs pqrs_analista_id_fkey; Type: FK CONSTRAINT; Schema: alfared; Owner: postgres
--

ALTER TABLE ONLY alfared.pqrs
    ADD CONSTRAINT pqrs_analista_id_fkey FOREIGN KEY (analista_id) REFERENCES alfared.usuarios(id_usuario) ON DELETE SET NULL;


--
-- Name: pqrs pqrs_jefe_id_fkey; Type: FK CONSTRAINT; Schema: alfared; Owner: postgres
--

ALTER TABLE ONLY alfared.pqrs
    ADD CONSTRAINT pqrs_jefe_id_fkey FOREIGN KEY (jefe_id) REFERENCES alfared.usuarios(id_usuario) ON DELETE SET NULL;


--
-- Name: pqrs pqrs_solicitante_id_fkey; Type: FK CONSTRAINT; Schema: alfared; Owner: postgres
--

ALTER TABLE ONLY alfared.pqrs
    ADD CONSTRAINT pqrs_solicitante_id_fkey FOREIGN KEY (solicitante_id) REFERENCES alfared.usuarios(id_usuario) ON DELETE CASCADE;


--
-- Name: roles_permisos roles_permisos_permiso_id_fkey; Type: FK CONSTRAINT; Schema: alfared; Owner: postgres
--

ALTER TABLE ONLY alfared.roles_permisos
    ADD CONSTRAINT roles_permisos_permiso_id_fkey FOREIGN KEY (permiso_id) REFERENCES alfared.permisos(id_permiso) ON DELETE CASCADE;


--
-- Name: roles_permisos roles_permisos_rol_id_fkey; Type: FK CONSTRAINT; Schema: alfared; Owner: postgres
--

ALTER TABLE ONLY alfared.roles_permisos
    ADD CONSTRAINT roles_permisos_rol_id_fkey FOREIGN KEY (rol_id) REFERENCES alfared.roles(id_rol) ON DELETE CASCADE;


--
-- Name: satisfaccion satisfaccion_usuario_id_fkey; Type: FK CONSTRAINT; Schema: alfared; Owner: postgres
--

ALTER TABLE ONLY alfared.satisfaccion
    ADD CONSTRAINT satisfaccion_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES alfared.usuarios(id_usuario) ON DELETE CASCADE;


--
-- Name: usuarios usuarios_rol_id_fkey; Type: FK CONSTRAINT; Schema: alfared; Owner: postgres
--

ALTER TABLE ONLY alfared.usuarios
    ADD CONSTRAINT usuarios_rol_id_fkey FOREIGN KEY (rol_id) REFERENCES alfared.roles(id_rol) ON DELETE RESTRICT;


--
-- PostgreSQL database dump complete
--

\unrestrict dYlFDbPBcRZlvQ8JpbcKw6YLaIiwhmxGuQhBmMiw1I0aktLNPXDZ32896I4rzp3


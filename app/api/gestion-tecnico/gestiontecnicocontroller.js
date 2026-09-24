export class NodoIncidencia {
  constructor(nombre, titular, tipoIncidencia, tipoPrioridad, descripcion, ubicacion) {
    this.nombre = nombre;
    this.titular = titular;
    this.tipoIncidencia = tipoIncidencia;
    this.tipoPrioridad = tipoPrioridad;
    this.descripcion = descripcion;
    this.ubicacion = ubicacion;
    this.siguiente = null;
  }
}

export class ListaIncidencias {
  constructor() {
    this.cabezaInstalaciones = null;
    this.cabezaServicios = null;
    this.cabezaDanos = null;
    
    this.prioridades = {
      "Alta": 1,
      "Media": 2,
      "Baja": 3
    };
  }

  agregarIncidencia(nombre, titular, tipoIncidencia, tipoPrioridad, descripcion, ubicacion) {
    const nueva = new NodoIncidencia(nombre, titular, tipoIncidencia, tipoPrioridad, descripcion, ubicacion);
    let cabezaActual;

    if (tipoIncidencia === "Instalación") cabezaActual = this.cabezaInstalaciones;
    else if (tipoIncidencia === "Servicio") cabezaActual = this.cabezaServicios;
    else if (tipoIncidencia === "Daño") cabezaActual = this.cabezaDanos;
    else throw new Error("Tipo de incidencia no válido");

    if (!cabezaActual || this.prioridades[tipoPrioridad] < this.prioridades[cabezaActual.tipoPrioridad]) {
      nueva.siguiente = cabezaActual;
      if (tipoIncidencia === "Instalación") this.cabezaInstalaciones = nueva;
      else if (tipoIncidencia === "Servicio") this.cabezaServicios = nueva;
      else if (tipoIncidencia === "Daño") this.cabezaDanos = nueva;
    } else {
      this._insertarOrdenado(nueva, cabezaActual);
    }
    return nueva;
  }

  _insertarOrdenado(nueva, cabezaActual) {
    let actual = cabezaActual;
    while (actual.siguiente && this.prioridades[nueva.tipoPrioridad] >= this.prioridades[actual.siguiente.tipoPrioridad]) {
      actual = actual.siguiente;
    }
    nueva.siguiente = actual.siguiente;
    actual.siguiente = nueva;
  }

  atenderIncidencia(tipoIncidencia) {
    let incidenciaAtendida = null;

    if (tipoIncidencia === "Instalación" && this.cabezaInstalaciones) {
      incidenciaAtendida = this.cabezaInstalaciones;
      this.cabezaInstalaciones = this.cabezaInstalaciones.siguiente;
    } 
    else if (tipoIncidencia === "Servicio" && this.cabezaServicios) {
      incidenciaAtendida = this.cabezaServicios;
      this.cabezaServicios = this.cabezaServicios.siguiente;
    } 
    else if (tipoIncidencia === "Daño" && this.cabezaDanos) {
      incidenciaAtendida = this.cabezaDanos;
      this.cabezaDanos = this.cabezaDanos.siguiente;
    }

    if (incidenciaAtendida) {
      return this._formatearIncidenciaAtendida(incidenciaAtendida);
    }
    return `No hay incidencias de ${tipoIncidencia} para atender`;
  }

  _formatearIncidenciaAtendida(incidencia) {
    return {
      mensaje: `Atendiendo incidencia de ${incidencia.tipoIncidencia}`,
      cliente: `${incidencia.nombre} (Titular: ${incidencia.titular})`,
      prioridad: incidencia.tipoPrioridad,
      descripcion: incidencia.descripcion,
      ubicacion: incidencia.ubicacion
    };
  }

  mostrarIncidencias(tipoIncidencia = null) {
    const todasIncidencias = {};

    if (!tipoIncidencia || tipoIncidencia === "Todas") {
      todasIncidencias.instalaciones = this._formatearListaIncidencias(this.cabezaInstalaciones);
      todasIncidencias.servicios = this._formatearListaIncidencias(this.cabezaServicios);
      todasIncidencias.danos = this._formatearListaIncidencias(this.cabezaDanos);
    } 
    else if (tipoIncidencia === "Instalación") {
      todasIncidencias.instalaciones = this._formatearListaIncidencias(this.cabezaInstalaciones);
    } 
    else if (tipoIncidencia === "Servicio") {
      todasIncidencias.servicios = this._formatearListaIncidencias(this.cabezaServicios);
    } 
    else if (tipoIncidencia === "Daño") {
      todasIncidencias.danos = this._formatearListaIncidencias(this.cabezaDanos);
    }

    return todasIncidencias;
  }

  _formatearListaIncidencias(cabeza) {
    const incidencias = [];
    let actual = cabeza;
    while (actual) {
      incidencias.push({
        nombre: actual.nombre,
        prioridad: actual.tipoPrioridad,
        resumen: actual.descripcion.substring(0, 30) + "..."
      });
      actual = actual.siguiente;
    }
    return incidencias;
  }
}

// Exportamos una única instancia para que todo el backend use la misma lista
export const gestorTecnico = new ListaIncidencias();
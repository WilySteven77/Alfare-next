import { beforeEach, describe, expect, it } from 'vitest';

import {
  ListaIncidencias,
} from '../app/api/gestion-tecnico/gestiontecnicocontroller.js';

describe('ListaIncidencias', () => {
  let gestor;

  beforeEach(() => {
    gestor = new ListaIncidencias();
  });

  it('crea una incidencia correctamente', () => {
    const incidencia = gestor.agregarIncidencia(
      'Carlos Pérez',
      'Ana Pérez',
      'Instalación',
      'Alta',
      'Instalar conexión de internet',
      'Bogotá'
    );

    expect(incidencia.nombre).toBe('Carlos Pérez');
    expect(incidencia.tipoIncidencia).toBe('Instalación');
    expect(incidencia.tipoPrioridad).toBe('Alta');
    expect(incidencia.descripcion).toBe(
      'Instalar conexión de internet'
    );
  });

  it('rechaza un tipo de incidencia inválido', () => {
    expect(() => {
      gestor.agregarIncidencia(
        'Carlos Pérez',
        'Ana Pérez',
        'Desconocida',
        'Alta',
        'Descripción de prueba',
        'Bogotá'
      );
    }).toThrow('Tipo de incidencia no válido');
  });

  it('ordena las incidencias por prioridad', () => {
    gestor.agregarIncidencia(
      'Cliente baja',
      'Titular baja',
      'Servicio',
      'Baja',
      'Descripción baja',
      'Bogotá'
    );

    gestor.agregarIncidencia(
      'Cliente alta',
      'Titular alta',
      'Servicio',
      'Alta',
      'Descripción alta',
      'Bogotá'
    );

    gestor.agregarIncidencia(
      'Cliente media',
      'Titular media',
      'Servicio',
      'Media',
      'Descripción media',
      'Bogotá'
    );

    const resultado = gestor.mostrarIncidencias('Servicio');

    expect(resultado.servicios).toHaveLength(3);
    expect(resultado.servicios[0].nombre).toBe('Cliente alta');
    expect(resultado.servicios[1].nombre).toBe('Cliente media');
    expect(resultado.servicios[2].nombre).toBe('Cliente baja');
  });

  it('atiende primero la incidencia de mayor prioridad', () => {
    gestor.agregarIncidencia(
      'Cliente baja',
      'Titular baja',
      'Daño',
      'Baja',
      'Daño menor',
      'Bogotá'
    );

    gestor.agregarIncidencia(
      'Cliente alta',
      'Titular alta',
      'Daño',
      'Alta',
      'Daño crítico',
      'Bogotá'
    );

    const resultado = gestor.atenderIncidencia('Daño');

    expect(resultado).toEqual({
      mensaje: 'Atendiendo incidencia de Daño',
      cliente: 'Cliente alta (Titular: Titular alta)',
      prioridad: 'Alta',
      descripcion: 'Daño crítico',
      ubicacion: 'Bogotá',
    });
  });

  it('informa cuando no hay incidencias para atender', () => {
    const resultado = gestor.atenderIncidencia('Instalación');

    expect(resultado).toBe(
      'No hay incidencias de Instalación para atender'
    );
  });

  it('muestra todas las categorías cuando se solicita Todas', () => {
    gestor.agregarIncidencia(
      'Cliente instalación',
      'Titular',
      'Instalación',
      'Media',
      'Instalación de servicio',
      'Bogotá'
    );

    gestor.agregarIncidencia(
      'Cliente servicio',
      'Titular',
      'Servicio',
      'Alta',
      'Falla en el servicio',
      'Medellín'
    );

    gestor.agregarIncidencia(
      'Cliente daño',
      'Titular',
      'Daño',
      'Baja',
      'Daño en el cableado',
      'Cali'
    );

    const resultado = gestor.mostrarIncidencias('Todas');

    expect(resultado).toHaveProperty('instalaciones');
    expect(resultado).toHaveProperty('servicios');
    expect(resultado).toHaveProperty('danos');

    expect(resultado.instalaciones).toHaveLength(1);
    expect(resultado.servicios).toHaveLength(1);
    expect(resultado.danos).toHaveLength(1);
  });
});

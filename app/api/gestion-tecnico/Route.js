import { NextResponse } from 'next/server';
import { gestorTecnico } from '@/services/gestionTecnico';

// Mostrar Incidencias (Equivalente al botón "Mostrar" en Tkinter)
export async function GET(request) {
  // Leemos si el frontend pidió un tipo específico (ej: ?tipo=Daño)
  const { searchParams } = new URL(request.url);
  const tipo = searchParams.get('tipo') || "Todas";

  const incidencias = gestorTecnico.mostrarIncidencias(tipo);
  return NextResponse.json(incidencias, { status: 200 });
}

// Agregar Incidencia (Equivalente al botón "Agregar Incidencia")
export async function POST(request) {
  try {
    const body = await request.json();
    const { nombre, titular, tipoIncidencia, tipoPrioridad, descripcion, ubicacion } = body;

    if (!nombre || !titular || !tipoIncidencia || !descripcion || !ubicacion) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
    }

    gestorTecnico.agregarIncidencia(nombre, titular, tipoIncidencia, tipoPrioridad, descripcion, ubicacion);
    
    return NextResponse.json({ mensaje: 'Incidencia agregada correctamente' }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

// Atender Incidencia (Equivalente a los botones naranjas de Tkinter)
export async function PATCH(request) {
  try {
    const body = await request.json();
    const { tipoIncidencia } = body; // Debe ser "Instalación", "Servicio" o "Daño"

    if (!tipoIncidencia) {
      return NextResponse.json({ error: 'Debes enviar el tipoIncidencia a atender' }, { status: 400 });
    }

    const resultado = gestorTecnico.atenderIncidencia(tipoIncidencia);
    return NextResponse.json({ resultado }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Error al atender la incidencia' }, { status: 500 });
  }
}
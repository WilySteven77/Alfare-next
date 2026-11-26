import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import {
  render,
  screen,
  waitFor,
} from '@testing-library/react';

import userEvent from '@testing-library/user-event';

import PqrsPage from '../app/pqrs/page.jsx';
import * as api from '../lib/alfaredApi.js';

vi.mock('../lib/alfaredApi.js', () => ({
  createPqrs: vi.fn(),
  getPqrsPorUsuarioPublico: vi.fn(),
  getStoredUsuario: vi.fn(() => null),
}));

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe('Página PQRS', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    sessionStorage.clear();

    api.getPqrsPorUsuarioPublico.mockResolvedValue({
      success: true,
      data: [],
    });
  });

  it('renderiza el formulario de PQRS', () => {
    render(<PqrsPage />);

    expect(
      screen.getByRole('heading', { name: 'PQRS' })
    ).toBeInTheDocument();

    expect(
      screen.getByPlaceholderText('Ej: 101')
    ).toBeInTheDocument();

    expect(
      screen.getByPlaceholderText('Tu nombre')
    ).toBeInTheDocument();

    expect(
      screen.getByPlaceholderText('tu@correo.com')
    ).toBeInTheDocument();

    expect(
      screen.getByPlaceholderText('Cuéntanos los detalles')
    ).toBeInTheDocument();

    expect(
      screen.getByRole('button', {
        name: 'Enviar PQRS',
      })
    ).toBeInTheDocument();
  });

  it('registra una PQRS correctamente', async () => {
    api.createPqrs.mockResolvedValue({
      success: true,
      data: {
        id_pqrs: 55,
        estado: 'NUEVO',
      },
    });

    const user = userEvent.setup();

    render(<PqrsPage />);

    await user.type(
      screen.getByPlaceholderText('Ej: 101'),
      '101'
    );

    await user.type(
      screen.getByPlaceholderText('Tu nombre'),
      'Ana Pérez'
    );

    await user.type(
      screen.getByPlaceholderText('tu@correo.com'),
      'ana@test.com'
    );

    await user.selectOptions(
      screen.getByRole('combobox'),
      'QUEJA'
    );

    await user.type(
      screen.getByPlaceholderText('Cuéntanos los detalles'),
      'No tengo servicio de internet'
    );

    await user.click(
      screen.getByRole('button', {
        name: 'Enviar PQRS',
      })
    );

    await waitFor(() => {
      expect(
        screen.getByText(/PQRS registrada con éxito/i)
      ).toBeInTheDocument();
    });

    expect(api.createPqrs).toHaveBeenCalledWith(
      'QUEJA',
      'No tengo servicio de internet',
      101
    );
  });

  it('muestra un mensaje cuando el usuario no existe al registrar', async () => {
    api.createPqrs.mockResolvedValue({
      success: false,
      code: 'USER_NOT_FOUND',
    });

    const user = userEvent.setup();

    render(<PqrsPage />);

    await user.type(
      screen.getByPlaceholderText('Ej: 101'),
      '999'
    );

    await user.type(
      screen.getByPlaceholderText('Tu nombre'),
      'Usuario inexistente'
    );

    await user.type(
      screen.getByPlaceholderText('tu@correo.com'),
      'noexiste@test.com'
    );

    await user.selectOptions(
      screen.getByRole('combobox'),
      'PETICION'
    );

    await user.type(
      screen.getByPlaceholderText('Cuéntanos los detalles'),
      'Solicitud de prueba'
    );

    await user.click(
      screen.getByRole('button', {
        name: 'Enviar PQRS',
      })
    );

    await waitFor(() => {
      expect(
        screen.getByText(/ID de usuario no existe/i)
      ).toBeInTheDocument();
    });
  });

  it('limpia los campos del formulario', async () => {
    const user = userEvent.setup();

    render(<PqrsPage />);

    const userIdInput = screen.getByPlaceholderText('Ej: 101');
    const nameInput = screen.getByPlaceholderText('Tu nombre');
    const emailInput = screen.getByPlaceholderText('tu@correo.com');
    const messageInput = screen.getByPlaceholderText(
      'Cuéntanos los detalles'
    );

    await user.type(userIdInput, '101');
    await user.type(nameInput, 'Ana Pérez');
    await user.type(emailInput, 'ana@test.com');

    await user.selectOptions(
      screen.getByRole('combobox'),
      'QUEJA'
    );

    await user.type(
      messageInput,
      'Mensaje de prueba'
    );

    await user.click(
      screen.getByRole('button', {
        name: 'Limpiar',
      })
    );

    expect(userIdInput).toHaveValue(null);
    expect(nameInput).toHaveValue('');
    expect(emailInput).toHaveValue('');
    expect(
      screen.getByRole('combobox')
    ).toHaveValue('');
    expect(messageInput).toHaveValue('');
  });

  it('carga el listado de PQRS del usuario', async () => {
    sessionStorage.setItem(
      'alfared_usuario',
      JSON.stringify({
        id_usuario: 101,
        tipo: 'cliente',
      })
    );

    api.getPqrsPorUsuarioPublico.mockResolvedValue({
      success: true,
      data: [
        {
          id: 15,
          tipo: 'RECLAMO',
          mensaje: 'Interrupción del servicio',
          estado: 'CERRADO',
          fecha: '2026-10-27',
        },
      ],
    });

    const user = userEvent.setup();

    render(<PqrsPage />);

    await waitFor(() => {
      expect(
        screen.getByRole('button', {
          name: 'Actualizar listado',
        })
      ).toBeInTheDocument();
    });

    await user.click(
      screen.getByRole('button', {
        name: 'Actualizar listado',
      })
    );

    await waitFor(() => {
      expect(
        screen.getByText('Interrupción del servicio')
      ).toBeInTheDocument();
    });

   expect(
  screen.getByText('Interrupción del servicio')
).toBeInTheDocument();

expect(
  screen.getByRole('cell', {
    name: 'RECLAMO',
  })
).toBeInTheDocument();

expect(
  screen.getByText('CERRADO')
).toBeInTheDocument();


    expect(
      screen.getByText('CERRADO')
    ).toBeInTheDocument();

    expect(
      api.getPqrsPorUsuarioPublico
    ).toHaveBeenCalledWith(101);
  });

  it('muestra una alerta si el ID de usuario no es válido al consultar', async () => {
    sessionStorage.setItem(
      'alfared_usuario',
      JSON.stringify({
        id_usuario: 101,
        tipo: 'cliente',
      })
    );

    const alertMock = vi
      .spyOn(window, 'alert')
      .mockImplementation(() => {});

    const user = userEvent.setup();

    render(<PqrsPage />);

    await waitFor(() => {
      expect(
        screen.getByRole('button', {
          name: 'Actualizar listado',
        })
      ).toBeInTheDocument();
    });

    const userIdInput = screen.getByPlaceholderText('Ej: 101');

    await user.clear(userIdInput);

    await user.click(
      screen.getByRole('button', {
        name: 'Actualizar listado',
      })
    );

    expect(alertMock).toHaveBeenCalledWith(
      'Por favor ingresa o rellena tu ID de usuario.'
    );

    expect(
      api.getPqrsPorUsuarioPublico
    ).not.toHaveBeenCalled();

    alertMock.mockRestore();
  });

  it('muestra una alerta cuando el usuario no existe al consultar sus PQRS', async () => {
    sessionStorage.setItem(
      'alfared_usuario',
      JSON.stringify({
        id_usuario: 101,
        tipo: 'cliente',
      })
    );

    api.getPqrsPorUsuarioPublico.mockResolvedValue({
      success: false,
      code: 'USER_NOT_FOUND',
    });

    const alertMock = vi
      .spyOn(window, 'alert')
      .mockImplementation(() => {});

    const user = userEvent.setup();

    render(<PqrsPage />);

    await waitFor(() => {
      expect(
        screen.getByRole('button', {
          name: 'Actualizar listado',
        })
      ).toBeInTheDocument();
    });

    const userIdInput = screen.getByPlaceholderText('Ej: 101');

    await user.clear(userIdInput);
    await user.type(userIdInput, '999');

    await user.click(
      screen.getByRole('button', {
        name: 'Actualizar listado',
      })
    );

    await waitFor(() => {
      expect(alertMock).toHaveBeenCalledWith(
        'El ID de usuario no existe.'
      );
    });

    expect(
      api.getPqrsPorUsuarioPublico
    ).toHaveBeenCalledWith(999);

    alertMock.mockRestore();
  });

  it('valida los campos obligatorios al solicitar reapertura', async () => {
    const user = userEvent.setup();

    render(<PqrsPage />);

    await user.click(
      screen.getByRole('button', {
        name: 'Solicitar reapertura',
      })
    );

    expect(
      screen.getByText(
        'Completa ID PQRS, tu ID de usuario y el motivo.'
      )
    ).toBeInTheDocument();
  });

  it('solicita la reapertura de una PQRS correctamente', async () => {
    const user = userEvent.setup();

    render(<PqrsPage />);

    await user.type(
      document.getElementById('reabrirPqrsId'),
      '15'
    );

    await user.type(
      document.getElementById('reabrirUserId'),
      '101'
    );

    await user.type(
      screen.getByPlaceholderText(
        'Describe por qué solicitas reapertura'
      ),
      'El problema continúa sin resolverse'
    );

    await user.click(
      screen.getByRole('button', {
        name: 'Solicitar reapertura',
      })
    );

    expect(
      screen.getByText(
        /PQRS #15 reabierta con éxito/i
      )
    ).toBeInTheDocument();

    expect(
      screen.getByText(/Estado: ABIERTO/i)
    ).toBeInTheDocument();
  });
});

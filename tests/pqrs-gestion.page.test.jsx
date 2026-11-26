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

import PqrsGestionPage from '../app/pqrs-gestion/page.jsx';
import * as api from '../lib/alfaredApi.js';

const mocks = vi.hoisted(() => ({
  usuario: null,
}));

vi.mock('../lib/alfaredApi.js', () => ({
  login: vi.fn(),
  logout: vi.fn(),
  getPqrsTodas: vi.fn(),
  tomarPqrs: vi.fn(),
  cerrarPqrs: vi.fn(),
  refreshSessionFromServer: vi.fn(),
  getStoredUsuario: vi.fn(() => mocks.usuario),
}));

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe('Página de gestión PQRS', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Cada prueba comienza sin una sesión activa.
    mocks.usuario = null;

    api.refreshSessionFromServer.mockResolvedValue({
      success: true,
    });

    api.getPqrsTodas.mockResolvedValue({
      success: true,
      data: [],
    });
  });

  it('muestra el formulario de acceso personal', () => {
    render(<PqrsGestionPage />);

    expect(
      screen.getByRole('heading', {
        name: 'Acceso personal',
      })
    ).toBeInTheDocument();

    expect(
      document.getElementById('staffEmail')
    ).toBeInTheDocument();

    expect(
      document.getElementById('staffPass')
    ).toBeInTheDocument();

    expect(
      screen.getByRole('button', {
        name: 'Ingresar',
      })
    ).toBeInTheDocument();
  });

  it('permite ingresar a un usuario autorizado', async () => {
    api.login.mockImplementation(async () => {
      // La sesión se crea después de enviar el formulario.
      mocks.usuario = {
        id_usuario: 10,
        email: 'tecnico@test.com',
        tipo: 'tecnico',
      };

      return {
        success: true,
      };
    });

    api.getPqrsTodas.mockResolvedValue({
      success: true,
      data: [
        {
          id: 1,
          usuarioId: 101,
          tipo: 'QUEJA',
          mensaje: 'Falla de internet',
          estado: 'NUEVO',
        },
      ],
    });

    const user = userEvent.setup();

    render(<PqrsGestionPage />);

    const emailInput = document.getElementById('staffEmail');
    const passwordInput = document.getElementById('staffPass');

    expect(emailInput).not.toBeNull();
    expect(passwordInput).not.toBeNull();

    await user.type(
      emailInput,
      'tecnico@test.com'
    );

    await user.type(
      passwordInput,
      'clave-segura'
    );

    await user.click(
      screen.getByRole('button', {
        name: 'Ingresar',
      })
    );

    await waitFor(() => {
      expect(
        screen.getByRole('heading', {
          name: /PQRS — bandeja/i,
        })
      ).toBeInTheDocument();
    });

    expect(
      screen.getByText('Falla de internet')
    ).toBeInTheDocument();

    expect(api.login).toHaveBeenCalledWith(
      'tecnico@test.com',
      'clave-segura'
    );

    expect(api.getPqrsTodas).toHaveBeenCalled();
  });

  it('rechaza el acceso de un usuario cliente', async () => {
    api.login.mockImplementation(async () => {
      mocks.usuario = {
        id_usuario: 101,
        email: 'cliente@test.com',
        tipo: 'cliente',
      };

      return {
        success: true,
      };
    });

    const user = userEvent.setup();

    render(<PqrsGestionPage />);

    const emailInput = document.getElementById('staffEmail');
    const passwordInput = document.getElementById('staffPass');

    expect(emailInput).not.toBeNull();
    expect(passwordInput).not.toBeNull();

    await user.type(
      emailInput,
      'cliente@test.com'
    );

    await user.type(
      passwordInput,
      'clave-cliente'
    );

    await user.click(
      screen.getByRole('button', {
        name: 'Ingresar',
      })
    );

    await waitFor(() => {
      expect(
        screen.getByText(
          /Solo cuentas de personal/i
        )
      ).toBeInTheDocument();
    });

    expect(
      screen.queryByRole('heading', {
        name: /PQRS — bandeja/i,
      })
    ).not.toBeInTheDocument();

    expect(api.getPqrsTodas).not.toHaveBeenCalled();
  });

  it('permite cerrar sesión', async () => {
    api.login.mockImplementation(async () => {
      mocks.usuario = {
        id_usuario: 10,
        email: 'admin@test.com',
        tipo: 'administrador',
      };

      return {
        success: true,
      };
    });

    const user = userEvent.setup();

    render(<PqrsGestionPage />);

    const emailInput = document.getElementById('staffEmail');
    const passwordInput = document.getElementById('staffPass');

    expect(emailInput).not.toBeNull();
    expect(passwordInput).not.toBeNull();

    await user.type(
      emailInput,
      'admin@test.com'
    );

    await user.type(
      passwordInput,
      'clave-admin'
    );

    await user.click(
      screen.getByRole('button', {
        name: 'Ingresar',
      })
    );

    await waitFor(() => {
      expect(
        screen.getByRole('heading', {
          name: /PQRS — bandeja/i,
        })
      ).toBeInTheDocument();
    });

    await user.click(
      screen.getByRole('button', {
        name: 'Cerrar sesión',
      })
    );

    expect(api.logout).toHaveBeenCalled();

    expect(
      screen.getByRole('heading', {
        name: 'Acceso personal',
      })
    ).toBeInTheDocument();
  });
});

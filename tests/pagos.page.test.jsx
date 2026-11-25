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

import PagosPage from '../app/pagos/page.jsx';
import * as api from '../lib/alfaredApi.js';

vi.mock('../lib/alfaredApi.js', () => ({
  getFacturasByCliente: vi.fn(),
  getPagosPorUsuarioPublico: vi.fn(),
  getToken: vi.fn(() => null),
  getStoredUsuario: vi.fn(() => null),
}));

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe('Página de pagos', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    api.getPagosPorUsuarioPublico.mockResolvedValue({
      success: true,
      data: [],
    });
  });

  it('renderiza el formulario de consulta de facturas', () => {
    render(<PagosPage />);

    expect(
      screen.getByRole('heading', {
        name: 'Mi factura',
      })
    ).toBeInTheDocument();

    expect(
      screen.getByRole('heading', {
        name: 'Consulta tus facturas',
      })
    ).toBeInTheDocument();

    expect(
      screen.getByPlaceholderText('Ej: 101')
    ).toBeInTheDocument();

    expect(
      screen.getByRole('button', {
        name: 'Buscar facturas',
      })
    ).toBeInTheDocument();
  });

  it('muestra las facturas del usuario después de una consulta exitosa', async () => {
    api.getFacturasByCliente.mockResolvedValue({
      success: true,
      data: [
        {
          id_factura: 25,
          monto: 85000,
          fecha_vencimiento: '2026-11-15',
          estado: 'PENDIENTE',
        },
      ],
    });

    const user = userEvent.setup();

    render(<PagosPage />);

    await user.type(
      screen.getByPlaceholderText('Ej: 101'),
      '101'
    );

    await user.click(
      screen.getByRole('button', {
        name: 'Buscar facturas',
      })
    );

    await waitFor(() => {
      expect(
        screen.getByText('Facturas del Usuario')
      ).toBeInTheDocument();
    });

    expect(
      screen.getByText('Factura #25')
    ).toBeInTheDocument();

    expect(
      screen.getByText('Pagar online')
    ).toBeInTheDocument();

    expect(
      screen.getByText('Ver detalle')
    ).toBeInTheDocument();

    expect(api.getFacturasByCliente).toHaveBeenCalledWith(
      '101'
    );

    expect(
      api.getPagosPorUsuarioPublico
    ).toHaveBeenCalledWith('101');
  });

  it('muestra un mensaje cuando el usuario no existe', async () => {
    api.getFacturasByCliente.mockResolvedValue({
      success: false,
      code: 'USER_NOT_FOUND',
    });

    const user = userEvent.setup();

    render(<PagosPage />);

    await user.type(
      screen.getByPlaceholderText('Ej: 101'),
      '999'
    );

    await user.click(
      screen.getByRole('button', {
        name: 'Buscar facturas',
      })
    );

    await waitFor(() => {
      expect(
        screen.getByText(
          /El ID ingresado no es válido o no existe/i
        )
      ).toBeInTheDocument();
    });

    expect(
      screen.queryByText('Facturas del Usuario')
    ).not.toBeInTheDocument();

    expect(api.getFacturasByCliente).toHaveBeenCalledWith(
      '999'
    );
  });
});

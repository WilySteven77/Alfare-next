import {
  afterEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import {
  apiFetch,
  getStoredUsuario,
  getToken,
  login,
  register,
} from '../lib/alfaredApi.js';

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
  sessionStorage.clear();
});

describe('alfaredApi', () => {
  it('obtiene el usuario almacenado en localStorage', () => {
    const usuario = {
      id_usuario: 101,
      email: 'cliente@test.com',
      tipo: 'cliente',
    };

    localStorage.setItem(
      'alfared_usuario',
      JSON.stringify(usuario)
    );

    expect(getStoredUsuario()).toEqual(usuario);
  });

  it('devuelve null cuando el usuario almacenado no es JSON válido', () => {
    localStorage.setItem(
      'alfared_usuario',
      '{usuario-invalido'
    );

    expect(getStoredUsuario()).toBeNull();
  });

  it('realiza una petición GET correctamente', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          success: true,
          data: [
            {
              id_factura: 1,
              monto: 50000,
            },
          ],
        }),
    });

    const respuesta = await apiFetch('/facturas/101');

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/alfared/facturas/101'),
      expect.objectContaining({
        credentials: 'include',
      })
    );

    expect(respuesta.success).toBe(true);
    expect(respuesta.data).toHaveLength(1);
    expect(respuesta.data[0].id_factura).toBe(1);
  });
  it('obtiene el token almacenado y lo envía en Authorization', async () => {
  localStorage.setItem(
    'alfared_token',
    'token-de-prueba'
  );

  expect(getToken()).toBe('token-de-prueba');

  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    text: async () =>
      JSON.stringify({
        success: true,
        data: {
          id_usuario: 101,
        },
      }),
  });

  await apiFetch('/auth/me');

  expect(global.fetch).toHaveBeenCalledWith(
    expect.stringContaining('/api/alfared/auth/me'),
    expect.objectContaining({
      headers: expect.objectContaining({
        Authorization: 'Bearer token-de-prueba',
      }),
      credentials: 'include',
    })
  );
});
it('devuelve NETWORK_ERROR cuando falla la conexión', async () => {
  global.fetch = vi.fn().mockRejectedValue(
    new Error('Network error')
  );

  const respuesta = await apiFetch('/facturas/101');

  expect(respuesta).toEqual({
    success: false,
    error: 'No se pudo conectar con el servidor.',
    code: 'NETWORK_ERROR',
  });
});
it('inicia sesión correctamente y guarda el token', async () => {
  global.fetch = vi
    .fn()
    .mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          success: true,
          data: {
            token: 'jwt-de-prueba',
            usuario: {
              id_usuario: 101,
              email: 'cliente@test.com',
              tipo: 'cliente',
            },
          },
        }),
    })
    .mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          success: true,
          data: {
            id_usuario: 101,
            email: 'cliente@test.com',
            tipo: 'cliente',
            nombre: 'Cliente',
          },
        }),
    });

  const respuesta = await login(
    'cliente@test.com',
    'clave-segura'
  );

  expect(respuesta.success).toBe(true);
  expect(localStorage.getItem('alfared_token')).toBe(
    'jwt-de-prueba'
  );

  expect(JSON.parse(
  localStorage.getItem('alfared_usuario')
)).toEqual({
  id_usuario: 101,
  email: 'cliente@test.com',
  tipo: 'cliente',
  nombre: 'Cliente',
});

});
it('devuelve el error cuando las credenciales son incorrectas', async () => {
  global.fetch = vi.fn().mockResolvedValue({
    ok: false,
    status: 401,
    text: async () =>
      JSON.stringify({
        success: false,
        error: 'Credenciales incorrectas',
        code: 'INVALID_CREDENTIALS',
      }),
  });

  const respuesta = await login(
    'incorrecto@test.com',
    'clave-incorrecta'
  );

  expect(respuesta.success).toBe(false);
  expect(respuesta.error).toBe(
    'Credenciales incorrectas'
  );
  expect(respuesta.code).toBe('INVALID_CREDENTIALS');
  expect(localStorage.getItem('alfared_token')).toBeNull();
});
it('registra un usuario correctamente', async () => {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    status: 201,
    text: async () =>
      JSON.stringify({
        success: true,
        data: {
          id_usuario: 102,
          nombre: 'Ana',
          apellido: 'Pérez',
          email: 'ana@test.com',
        },
      }),
  });

  const respuesta = await register({
    nombre: 'Ana',
    apellido: 'Pérez',
    email: 'ana@test.com',
    contrasena: 'clave-segura',
  });

  expect(respuesta.success).toBe(true);
  expect(respuesta.data.id_usuario).toBe(102);

  expect(global.fetch).toHaveBeenCalledWith(
    expect.stringContaining('/api/alfared/auth/register'),
    expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({
        nombre: 'Ana',
        apellido: 'Pérez',
        email: 'ana@test.com',
        contrasena: 'clave-segura',
      }),
    })
  );
});
it('maneja una respuesta que no contiene JSON válido', async () => {
  global.fetch = vi.fn().mockResolvedValue({
    ok: false,
    status: 500,
    text: async () => 'Error interno del servidor',
  });

  const respuesta = await apiFetch('/facturas/101');

  expect(respuesta).toEqual({
    success: false,
    error: 'Error interno del servidor',
    code: 'INVALID_JSON',
  });
});
it('conserva el error enviado por la API aunque la respuesta HTTP falle', async () => {
  global.fetch = vi.fn().mockResolvedValue({
    ok: false,
    status: 401,
    statusText: 'Unauthorized',
    text: async () =>
      JSON.stringify({
        success: false,
        error: 'Token inválido',
        code: 'INVALID_TOKEN',
      }),
  });

  const respuesta = await apiFetch('/auth/me');

  expect(respuesta).toEqual({
    success: false,
    error: 'Token inválido',
    code: 'INVALID_TOKEN',
  });
});
});

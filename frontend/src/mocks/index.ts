/**
 * MSW initialization.
 */

export { handlers } from './handlers';

/** Check if we should enable mocking */
export function shouldEnableMocking(): boolean {
  if (typeof window === 'undefined') return false;
  return process.env.NEXT_PUBLIC_API_MOCKING === 'enabled';
}

/** Initialize MSW for browser */
export async function initMocks(): Promise<void> {
  if (!shouldEnableMocking()) return;

  const { worker } = await import('./browser');

  await worker.start({
    onUnhandledRequest: 'bypass', // Don't warn on unhandled requests
    serviceWorker: {
      url: '/mockServiceWorker.js',
    },
  });

  console.log('[MSW] Mocking enabled');
}

/** Initialize MSW for testing */
export async function initTestMocks(): Promise<void> {
  const { server } = await import('./server');

  server.listen({
    onUnhandledRequest: 'error',
  });

  return;
}

/** Stop test mocks */
export async function stopTestMocks(): Promise<void> {
  const { server } = await import('./server');
  server.close();
}

/** Reset test mocks between tests */
export async function resetTestMocks(): Promise<void> {
  const { server } = await import('./server');
  server.resetHandlers();
}

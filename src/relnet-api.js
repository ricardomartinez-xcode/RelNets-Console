export class BackendDependencyError extends Error {
  constructor(dependency) {
    super(`Backend dependency unavailable: ${dependency.id}`);
    this.name = 'BackendDependencyError';
    this.dependency = dependency;
  }
}

export const BACKEND_DEPENDENCIES = Object.freeze([
  { id: 'fleet.read', method: 'GET', path: '/console/api/relnet-next/fleet', available: false, status: 'backend-pending', owner: 'Control Plane' },
  { id: 'controllers.read', method: 'GET', path: '/console/api/relnet-next/controllers', available: false, status: 'backend-pending', owner: 'Control Plane' },
  { id: 'controllers.drain', method: 'POST', path: '/console/api/relnet-next/controllers/{controller_id}/drain', available: false, status: 'backend-pending', owner: 'Control Plane' },
  { id: 'nodes.read', method: 'GET', path: '/console/api/relnet-next/nodes', available: false, status: 'backend-pending', owner: 'Control Plane / Endpoint' },
  { id: 'edge.read', method: 'GET', path: '/console/api/relnet-next/edge', available: false, status: 'backend-pending', owner: 'Control Plane / Edge' },
  { id: 'network.read', method: 'GET', path: '/console/api/relnet-next/network', available: false, status: 'backend-pending', owner: 'Control Plane / Edge' },
  { id: 'installation.read', method: 'GET', path: '/console/api/relnet-next/installation', available: false, status: 'backend-pending', owner: 'Endpoint / Installer' },
  { id: 'installation.action', method: 'POST', path: '/console/api/relnet-next/installation/{device_id}/actions', available: false, status: 'backend-pending', owner: 'Endpoint / Installer' },
  { id: 'diagnostics.read', method: 'GET', path: '/console/api/relnet-next/diagnostics', available: false, status: 'backend-pending', owner: 'Control Plane / Endpoint' },
  { id: 'migration.read', method: 'GET', path: '/console/api/relnet-next/migration', available: false, status: 'backend-pending', owner: 'Coordinator' },
  { id: 'migration.cutover', method: 'POST', path: '/console/api/relnet-next/migration/cutover', available: false, status: 'backend-pending', owner: 'Coordinator' },
  { id: 'ai.read', method: 'GET', path: '/console/api/relnet-next/ai/coordinator', available: false, status: 'backend-pending', owner: 'AI / Builder' }
]);

export function dependencyById(id) {
  return BACKEND_DEPENDENCIES.find((dependency) => dependency.id === id) || null;
}

export async function loadRelnetResource(id, fetcher = fetch) {
  const dependency = dependencyById(id);
  if (!dependency) throw new TypeError(`Unknown RelNet Console dependency: ${id}`);
  if (!dependency.available) throw new BackendDependencyError(dependency);
  const response = await fetcher(dependency.path, { headers: { accept: 'application/json' }, credentials: 'same-origin' });
  if (!response.ok) throw new Error(`RelNet Console backend returned ${response.status}`);
  return response.json();
}

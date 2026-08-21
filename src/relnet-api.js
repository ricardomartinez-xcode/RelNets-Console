export class BackendDependencyError extends Error {
  constructor(dependency) {
    super(`Backend dependency unavailable: ${dependency.id}`);
    this.name = 'BackendDependencyError';
    this.dependency = dependency;
  }
}

const pending=(id,method,path,owner)=>({id,method,path,available:false,status:'backend-pending',owner});

export const BACKEND_DEPENDENCIES=Object.freeze([
  pending('fleet.read','GET','/console/api/relnet-next/fleet','Control Plane'),
  pending('controllers.read','GET','/console/api/relnet-next/controllers','Control Plane'),
  pending('controllers.drain','POST','/console/api/relnet-next/controllers/{controller_id}/drain','Control Plane'),
  pending('nodes.read','GET','/console/api/relnet-next/nodes','Control Plane / Endpoint'),
  pending('edge.read','GET','/console/api/relnet-next/edge','Control Plane / Edge'),
  pending('network.read','GET','/console/api/relnet-next/network','Control Plane / Edge'),
  pending('access.read','GET','/console/api/relnet-next/access','Product API / Endpoint'),
  pending('installation.read','GET','/console/api/relnet-next/installation','Endpoint / Installer'),
  pending('installation.action','POST','/console/api/relnet-next/installation/{device_id}/actions','Endpoint / Installer'),
  pending('diagnostics.read','GET','/console/api/relnet-next/diagnostics','Control Plane / Endpoint'),
  pending('migration.read','GET','/console/api/relnet-next/migration','Coordinator'),
  pending('migration.cutover','POST','/console/api/relnet-next/migration/cutover','Coordinator'),
  pending('billing.read','GET','/console/api/relnet-next/billing','Product API / Commercial'),
  pending('ai.entitlement.read','GET','/console/api/relnet-next/ai/entitlement','Product API / Commercial'),
  pending('ai.usage.read','GET','/console/api/relnet-next/ai/usage','Product API / Commercial'),
  pending('ai.execute','POST','/console/api/relnet-next/ai/execute','Product API / AI')
]);

export function dependencyById(id){return BACKEND_DEPENDENCIES.find(d=>d.id===id)||null}

export async function loadRelnetResource(id,fetcher=fetch){
  const dependency=dependencyById(id);
  if(!dependency) throw new TypeError(`Unknown RelNet Console dependency: ${id}`);
  if(!dependency.available) throw new BackendDependencyError(dependency);
  const response=await fetcher(dependency.path,{headers:{accept:'application/json'},credentials:'same-origin'});
  if(!response.ok) throw new Error(`RelNet Console backend returned ${response.status}`);
  return response.json();
}

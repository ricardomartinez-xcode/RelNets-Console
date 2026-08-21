import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/index.js';
import { BACKEND_DEPENDENCIES } from '../src/relnet-api.js';
import { RELNET_NEXT_ROUTES, PRODUCT_AI_PLAN_CONTRACT } from '../src/relnet-ui.js';

const req=(path)=>new Request(`https://console.relead.com.mx${path}`,{headers:{accept:'text/html'}});
const html=async(path)=>await (await worker.fetch(req(path),{})).text();

test('product Console adds access and canonical billing surfaces', async()=>{
  assert.ok(RELNET_NEXT_ROUTES.includes('/console/relnet/access'));
  for(const route of ['/console/relnet/access','/billing']){
    const response=await worker.fetch(req(route),{});
    assert.equal(response.status,200,route);
    assert.equal(response.headers.get('x-relead-surface'),'relnet-next-console');
  }
});

test('fleet presents A B C and future D as equal active-active controllers', async()=>{
  const page=await html('/console/relnet/controllers');
  for(const name of ['Controller A','Controller B','Controller C','Controller D']) assert.match(page,new RegExp(name));
  assert.match(page,/equal|iguales/i);
  assert.match(page,/active-active/i);
  assert.doesNotMatch(page,/primary controller|secondary controller|primary\s*\/\s*secondary/i);
});

test('network and Edge reflect frozen path and capacity semantics', async()=>{
  const network=await html('/console/relnet/network');
  for(const term of ['Direct P2P','Peer Relay','RelNet Relay','NetworkMap','generation','expiry']) assert.match(network,new RegExp(term,'i'));
  const edge=await html('/console/relnet/edge');
  for(const term of ['Relay','Gateway','Exit','Subnet','health','capacity','draining']) assert.match(edge,new RegExp(term,'i'));
  assert.match(edge,/Gateway.*capacity.*contract.*pending|capacity.*Gateway.*pending/is);
});

test('access surface covers Termius-class services without ads', async()=>{
  const page=await html('/console/relnet/access');
  for(const term of ['SSH','Terminal','RDP','RelDrop','RelShare','direct','peer relay','RelNet relay']) assert.match(page,new RegExp(term,'i'));
  assert.match(page,/server-side|servidor/i);
  assert.doesNotMatch(page,/googlesyndication|third-party ad|sponsor slot|data-ad-slot/i);
});

test('AI plan contract is bounded and never maps credits to provider units',()=>{
  assert.deepEqual(PRODUCT_AI_PLAN_CONTRACT.free,{included:false,monthlyCredits:0,pool:'space'});
  assert.deepEqual(PRODUCT_AI_PLAN_CONTRACT.pro,{included:true,monthlyCredits:100,pool:'space'});
  assert.deepEqual(PRODUCT_AI_PLAN_CONTRACT.team,{included:true,monthlyCredits:500,pool:'team'});
  assert.deepEqual(PRODUCT_AI_PLAN_CONTRACT.business,{included:true,monthlyCredits:null,pool:'contract'});
});

test('AI and Billing render server-side truth contract, not provider infrastructure', async()=>{
  for(const route of ['/console/relnet/ai','/billing']){
    const page=await html(route);
    for(const term of ['Free','Pro','Team','Business','credits','usage']) assert.match(page,new RegExp(term,'i'));
    assert.match(page,/server-side|servidor/i);
    assert.match(page,/Backend pendiente/i);
    assert.doesNotMatch(page,/RunPod|GGUF|Qwen|tokens\/sec|tokens per second|credit.*hours|credit.*tokens/i);
  }
  const ai=await html('/console/relnet/ai');
  assert.match(ai,/Free.*not included|Free.*no incluid/is);
  assert.match(ai,/Pro.*100/is);
  assert.match(ai,/Team.*500/is);
  assert.match(ai,/Business.*contract|Business.*contrat/is);
});

test('billing and AI dependencies remain fail-closed and client flags are never trusted',()=>{
  for(const id of ['billing.read','ai.entitlement.read','ai.usage.read']){
    const dep=BACKEND_DEPENDENCIES.find(x=>x.id===id);
    assert.ok(dep,id);
    assert.equal(dep.available,false,id);
    assert.equal(dep.status,'backend-pending',id);
  }
});

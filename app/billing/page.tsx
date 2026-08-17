'use client';
import { useEffect, useMemo, useState } from 'react';
import { Surface } from '@/app/components/Surface';

type Plan = { slug:string; name:string; description:string; currency:string; monthly_price:number|null; yearly_price:number|null; self_service:boolean; public_sponsor_supported:boolean; limits:Record<string,number>; features:Record<string,boolean> };
type Billing = { plan?:Plan; usage?:Record<string,number>; subscription?:Record<string,unknown>; billing_state?:string; csrf?:string };

function money(value:number|null){ return value == null ? 'Cotizar' : new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN',maximumFractionDigits:0}).format(value); }
export default function BillingPage(){
 const [plans,setPlans]=useState<Plan[]>([]); const [me,setMe]=useState<Billing>({}); const [csrf,setCsrf]=useState(''); const [error,setError]=useState(''); const [busy,setBusy]=useState('');
 useEffect(()=>{(async()=>{ const s=await fetch('/console/api/session',{cache:'no-store'}); if(s.status===401){location.replace('/console/login');return;} const session=await s.json(); setCsrf(String(session.csrf||'')); const [p,m]=await Promise.all([fetch('/console/api/billing/plans',{cache:'no-store'}),fetch('/console/api/billing/me',{cache:'no-store'})]); if(!p.ok||!m.ok) throw new Error('No fue posible cargar la facturación.'); setPlans((await p.json()).plans||[]); setMe(await m.json()); })().catch((e)=>setError(String(e.message||e)));},[]);
 const current=String(me.plan?.slug||'free'); const usage=me.usage||{};
 const usageCards=useMemo(()=>[{label:'Nodos',value:usage.nodes??0,limit:me.plan?.limits?.max_nodes??0},{label:'RelDrop GB/mes',value:usage.monthly_reldrop_gb??0,limit:me.plan?.limits?.monthly_reldrop_gb??0},{label:'Usuarios',value:usage.users??1,limit:me.plan?.limits?.max_users??1}], [usage,me.plan]);
 async function checkout(interval:'monthly'|'yearly') { setBusy(interval); setError(''); const r=await fetch('/console/api/billing/checkout',{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':csrf},body:JSON.stringify({plan_slug:'pro',interval})}); const p=await r.json().catch(()=>({})); if(!r.ok){setError(String(p.detail||'Checkout no disponible.'));setBusy('');return;} const url=String(p.checkout_url||p.url||''); if(url){location.assign(url);return;} setError('El proveedor no devolvió una URL de checkout.'); setBusy(''); }
 async function portal(){ setBusy('portal'); setError(''); const r=await fetch('/console/api/billing/portal',{method:'POST',headers:{'X-CSRF-Token':csrf}}); const p=await r.json().catch(()=>({})); if(!r.ok){setError(String(p.detail||'Portal no disponible.'));setBusy('');return;} const url=String(p.portal_url||p.url||''); if(url){location.assign(url);return;} setError('El proveedor no devolvió una URL de portal.'); setBusy(''); }
 return <Surface eyebrow="Plan y facturación" title="Paga por capacidad, no por otra red." description="Tu Space, identidad y direcciones permanecen. El plan sólo habilita capacidad, automatización y límites adicionales.">
   {error&&<div className="error" role="alert">{error}</div>}
   <section className="grid-3" style={{marginBottom:18}}>{usageCards.map(x=><div className="metric" key={x.label}><small>{x.label}</small><strong>{x.value} / {x.limit}</strong></div>)}</section>
   <div className="grid-2">{plans.map(plan=><article className="card stack" key={plan.slug}>
     <div><span className="pill">{plan.slug===current?'Plan actual':plan.self_service?'Self-service':'Venta asistida'}</span><h2>{plan.name}</h2><p className="helper">{plan.description}</p></div>
     <div className="grid-2"><div className="metric"><small>Mensual</small><strong>{money(plan.monthly_price)}</strong></div><div className="metric"><small>Anual</small><strong>{money(plan.yearly_price)}</strong></div></div>
     <div className="grid-3"><div className="metric"><small>Nodos</small><strong>{plan.limits.max_nodes}</strong></div><div className="metric"><small>Usuarios</small><strong>{plan.limits.max_users}</strong></div><div className="metric"><small>RelDrop</small><strong>{plan.limits.monthly_reldrop_gb} GB</strong></div></div>
     <p className="helper">{plan.features.api_access?'API externa · ':''}{plan.features.remote_chrome?'Remote Chrome · ':''}{plan.features.automation?'Automatización · ':''}{plan.public_sponsor_supported?'Free admite patrocinio público.':'Sin anuncios del plan.'}</p>
     {plan.slug==='pro'&&current!=='pro'?<div className="actions"><button className="button primary" onClick={()=>checkout('monthly')} disabled={Boolean(busy)}>{busy==='monthly'?'Abriendo…':'Pro mensual'}</button><button className="button secondary" onClick={()=>checkout('yearly')} disabled={Boolean(busy)}>{busy==='yearly'?'Abriendo…':'Pro anual'}</button></div>:null}
     {plan.slug===current?<button className="button secondary" onClick={portal} disabled={Boolean(busy)}>{busy==='portal'?'Abriendo…':'Administrar facturación'}</button>:null}
     {!plan.self_service&&plan.slug!==current?<a className="button secondary" href="https://relead.com.mx" target="_blank" rel="noreferrer">Hablar con ReLead</a>:null}
   </article>)}</div>
   <p className="helper" style={{marginTop:18}}>Los cobros sólo se inician desde checkout seguro. Team y Business permanecen como venta asistida mientras la membresía multiusuario completa sus gates de producción.</p>
 </Surface>;
}

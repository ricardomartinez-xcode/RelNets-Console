export const PANEL_PREFIXES=['/admin','/console'];
export function isPanelPath(p){return PANEL_PREFIXES.some(x=>p===x||p.startsWith(`${x}/`));}
export function isThemeableStylesheet(p){return /^\/(admin|console)\/static\/styles\.css$/.test(p);}
export function shouldInjectHtml(t){return String(t||'').toLowerCase().includes('text/html');}
export function injectTheme(h){if(h.includes('/__relead/theme-client.js'))return h;const t='<link rel="stylesheet" href="/__relead/theme.css"><script src="/__relead/theme-client.js" defer></script>';return h.includes('</head>')?h.replace('</head>',`${t}</head>`):`${t}${h}`;}
export function normalizeOrigin(v){const u=new URL(v||'https://api.relead.com.mx');if(u.protocol!=='https:')throw new Error('BACKEND_ORIGIN must use HTTPS');u.pathname='/';u.search='';u.hash='';return u.toString().replace(/\/$/,'');}

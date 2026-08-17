import { faqUrlFor, routeSelectPayload, routingViewModel } from "./relnet-routing.js";

const surfaceBase = location.pathname.startsWith("/console") ? "/console" : "/admin";
const surface = surfaceBase === "/console" ? "console" : "admin";
document.body.classList.add(surface === "console" ? "console-surface" : "admin-surface");

const allModules = {
  rescue: { group: "Recuperación", label: "Modo de recuperación", short: "Recuperación", description: "Estado independiente y reparación firmada del host aunque la API o el MCP estén fuera de servicio.", actions: ["recover_connectors", "redeploy_current", "logs", "start", "stop", "restart", "recreate"] },
  system: { group: "Resumen", label: "Estado general", short: "Plataforma", description: "Salud, actividad y alertas importantes de la plataforma.", actions: [] },
  containers: { group: "Operación", label: "Servicios", short: "Contenedores", description: "Estado de los servicios permitidos y controles de recuperación.", actions: ["logs", "start", "stop", "restart"] },
  runners: { group: "Operación", label: "Runners", short: "Runners", description: "Capacidad de ejecución, disponibilidad y controles de los runners.", actions: ["pause", "resume", "drain", "mark_offline", "restart"] },
  relnet: { group: "RelNet", label: "Red privada RelNet", short: "RelNet", description: "Nodos, Relay privada, RelDrop, RelShare, tags, políticas ACL, topología y telemetría.", actions: ["controller_join_create", "relay_register", "relay_enable", "relay_disable", "relay_priority", "drop_send", "share_create", "share_remove", "feature_set", "set_tag", "capability_grant", "create_pairing", "reauthenticate", "approve", "configure_network", "policy_create", "policy_update", "policy_delete", "dispatch", "terminal_create", "cancel_command", "pause", "resume", "mark_offline", "revoke", "delete_node"] },
  ssh_config: { group: "Seguridad", label: "SSH Config", short: "SSH Config", description: "Clave Ed25519 administrada por RelNet, configuración OpenSSH y despliegue controlado a nodos privados.", actions: ["ssh_key_generate", "ssh_key_deploy"] },
  jobs: { group: "Operación", label: "Ejecuciones", short: "Jobs y terminal", description: "Seguimiento de trabajos, logs, cancelaciones y terminales controladas.", actions: ["create", "get", "logs", "cancel", "retry", "ssh_execute"] },
  browser: { group: "Navegadores", label: "Browser administrado", short: "Browser Gateway", description: "Perfiles cifrados, sesiones visibles, pestañas y automatización tipada.", actions: ["session_create", "session_complete", "reuse", "revoke", "disconnect", "continue_control", "new_tab", "close_tab", "navigate", "click", "type", "press_key", "get_content", "screenshot", "wait", "upload", "select", "scroll"] },
  remote_chrome: { group: "Navegadores", label: "Chrome remoto", short: "Remote Chrome", description: "Dispositivos enlazados, sesiones activas y control autorizado de Chrome.", actions: ["pairing_create", "session_create", "list_tabs", "authorize_tab", "navigate", "click", "type", "press_key", "select", "scroll", "upload", "screenshot", "get_content", "wait", "disconnect", "device_revoke"] },
  integrations: { group: "Conexiones", label: "Integraciones", short: "Integraciones", description: "Conectores disponibles, estado de conexión y pruebas operativas.", actions: ["test", "disable", "reactivate"] },
  oauth: { group: "Conexiones", label: "Autenticación", short: "OAuth", description: "Sesiones de autenticación visual y conexiones con proveedores externos.", actions: ["add", "test", "disable", "reactivate", "revoke", "delete"] },
  secrets: { group: "Conexiones", label: "Secretos", short: "Secretos", description: "Almacén cifrado de credenciales reutilizables por jobs y servicios autorizados.", actions: [] },
  workspaces: { group: "Recursos", label: "Workspaces", short: "Workspaces", description: "Espacios de trabajo disponibles para archivos y ejecuciones.", actions: ["create", "delete"] },
  artifacts: { group: "Recursos", label: "Artifacts", short: "Artifacts", description: "Archivos generados, capturas y paquetes descargables.", actions: ["download", "delete"] },
  features: { group: "Plataforma", label: "Configuración", short: "Feature flags", description: "Funciones activas y cambios controlados de configuración.", actions: ["create", "set", "rollback"] },
  releases: { group: "Plataforma", label: "Releases", short: "Releases", description: "Versiones disponibles, staging, promociones y rollbacks.", actions: ["deploy_staging", "promote", "execute_host_approval", "rollback"] },
  backups: { group: "Plataforma", label: "Respaldo y restauración", short: "Backups", description: "Inventario de respaldos y operaciones explícitas de recuperación.", actions: ["backup_create", "snapshot_create", "backup_restore"] },
  audit: { group: "Gobernanza", label: "Auditoría", short: "Auditoría", description: "Historial de accesos, lecturas y acciones administrativas.", actions: [] },
};
const consoleModules = {
  relnet_network: { group: "Información", label: "Red y topología", short: "Red", description: "Estado del control plane, Relay, topología y funciones activas de RelNet.", actions: [], apiModule: "relnet", sections: ["status", "topology", "features"] },
  relnet_egress: { group: "Red", label: "Salida a Internet", short: "Internet", description: "Elige por nodo si conserva su salida local o usa un gateway RelNet, con estado deseado y aplicado visibles.", actions: [], apiModule: "relnet", sections: ["routing"], hideSummary: true },
  relnet_subnets: { group: "Red", label: "Subredes", short: "Subredes", description: "Anuncia redes privadas y decide explícitamente qué nodo las usa mediante RelNet.", actions: [], apiModule: "relnet", sections: ["routing"], hideSummary: true },
  relnet_nodes: { group: "Información", label: "Nodos", short: "Nodos", description: "Dispositivos vinculados, conectividad, versiones y capacidades anunciadas.", actions: [], apiModule: "relnet", sections: ["nodes", "pairings", "policies"] },
  relnet_telemetry: { group: "Información", label: "Telemetría", short: "Telemetría", description: "Métricas de transporte, actividad del Mesh y estado reciente de los agentes.", actions: [], apiModule: "relnet", sections: ["telemetry"] },
  relnet_history: { group: "Información", label: "Historial operativo", short: "Historial", description: "Comandos, sesiones y transferencias recientes sin controles de ejecución mezclados.", actions: [], apiModule: "relnet", sections: ["commands", "terminal_sessions", "drop_transfers"] },
  relnet_execute: { group: "Operación", label: "Ejecutor tipado", short: "Ejecutor", description: "Ejecuta capacidades y operaciones tipadas sobre un nodo seleccionado.", actions: ["dispatch", "cancel_command"], apiModule: "relnet", sections: [], actionOnly: true, hideSummary: true },
  relnet_terminal: { group: "Operación", label: "Terminal", short: "Terminal", description: "Terminal persistente con selección de nodo y reanudación de sesiones.", actions: [], apiModule: "relnet", sections: [], terminalOnly: true, hideSummary: true },
  relnet_drop: { group: "Operación", label: "RelDrop", short: "RelDrop", description: "Envía archivos entre nodos RelNet sin mezclar la transferencia con telemetría general.", actions: ["drop_send"], apiModule: "relnet", sections: [], actionOnly: true, hideSummary: true },
  relnet_share: { group: "Operación", label: "RelShare", short: "RelShare", description: "Carpeta RelShare fija del usuario, publicada por SMB dentro de RelNet.", actions: ["share_create", "share_remove"], apiModule: "relnet", sections: ["peers"], hideSummary: true },
  relnet_manage: { group: "Operación", label: "Administrar nodos", short: "Administrar", description: "Vinculación, capacidades, tags, transporte, políticas y ciclo de vida de los nodos.", actions: ["create_pairing", "approve", "configure_network", "set_tag", "capability_grant", "policy_create", "policy_update", "policy_delete", "revoke", "delete_node"], apiModule: "relnet", sections: [], actionOnly: true, hideSummary: true },
};
const adminModuleNames = new Set(Object.keys(allModules).filter((name) => !["relnet", "browser", "remote_chrome"].includes(name)));
const modules = surface === "console" ? consoleModules : Object.fromEntries(Object.entries(allModules).filter(([name]) => adminModuleNames.has(name)));
const backendModuleName = (name = activeModule) => modules[name]?.apiModule || name;

const copy = {
  platform: "Plataforma", version: "Versión", release_state: "Entorno", status: "Estado",
  checks: "Comprobaciones", host: "Host", metrics: "Métricas", alerts: "Alertas", alert_count: "Alertas activas",
  counts: "Actividad", capabilities: "Capacidades", items: "Registros", service: "Servicio", state: "Estado",
  created_at: "Creado", updated_at: "Actualizado", expires_at: "Vence", last_heartbeat_at: "Último pulso",
  device_id: "Dispositivo", session_id: "Sesión", connection_id: "Conexión", browser_connection_id: "Conexión",
  job_id: "Trabajo", runner_id: "Runner", node_id: "Nodo", network_id: "Red", controller_role: "Rol del controller", controller_priority: "Prioridad", backing_host: "Host asociado", controller_topology: "Topología de controllers", pairing_id: "Emparejamiento", policy_id: "Política", virtual_ip: "IP RelNet", transport_mode: "Transporte", desired_transport: "Transporte deseado", exit_node: "Nodo de salida", relay_connected: "Relay", integration_id: "Integración", workspace_id: "Workspace",
  label: "Nombre", name: "Nombre", type: "Tipo", size: "Tamaño", path: "Ruta", role: "Rol",
  healthy: "Saludable", degraded: "Degradado", production: "Producción", staging: "Staging",
};

const operationCopy = {
  create: ["Crear", "Crea un recurso nuevo con los parámetros indicados."],
  get: ["Consultar trabajo", "Obtiene el estado de un trabajo por ID."],
  logs: ["Consultar logs", "Recupera logs recientes del recurso seleccionado."],
  recover_connectors: ["Recuperar conexión", "Recrea Auth Broker, API y MCP con la release y el entorno exactos de producción, y espera hasta que estén saludables."],
  redeploy_current: ["Redesplegar versión actual", "Converge todos los servicios de la release actual sin apagar el plano de recuperación."],
  start: ["Iniciar servicio", "Inicia un servicio permitido en el entorno actual."],
  stop: ["Detener servicio", "Detiene un servicio permitido en staging."],
  restart: ["Reiniciar", "Reinicia el recurso seleccionado."],
  recreate: ["Recrear servicio", "Recrea únicamente el servicio seleccionado con la configuración vigente."],
  pause: ["Pausar runner", "Evita que el runner tome trabajos nuevos."],
  resume: ["Reanudar runner", "Devuelve el runner a operación normal."],
  drain: ["Drenar runner", "Permite terminar actividad antes de retirarlo."],
  mark_offline: ["Marcar offline", "Marca el runner como no disponible."],
  cancel: ["Cancelar trabajo", "Solicita la cancelación de un trabajo activo."],
  retry: ["Reintentar trabajo", "Crea un nuevo intento a partir de un trabajo terminal."],
  ssh_execute: ["Ejecutar por SSH", "Ejecuta un comando mediante una conexión SSH aprobada."],
  test: ["Probar conexión", "Comprueba el acceso sin modificar la configuración."],
  disable: ["Desactivar", "Desactiva temporalmente la conexión."],
  reactivate: ["Reactivar", "Vuelve a habilitar la conexión."],
  add: ["Añadir conexión", "Abre una sesión visual de autenticación con el proveedor."],
  revoke: ["Revocar", "Revoca el acceso y cierra sesiones activas."],
  delete: ["Eliminar", "Elimina el recurso seleccionado."],
  set: ["Cambiar valor", "Actualiza una función existente."],
  rollback: ["Rollback", "Prepara la reversión a un estado anterior."],
  session_create: ["Crear sesión", "Inicia una sesión acotada y solicita la autorización necesaria."],
  session_complete: ["Completar autenticación", "Confirma que la autenticación visual terminó."],
  reuse: ["Reutilizar perfil", "Abre un perfil cifrado existente."],
  disconnect: ["Desconectar", "Finaliza la sesión activa sin revocar el recurso."],
  continue_control: ["Continuar control", "Sale del modo de autenticación y continúa el control."],
  new_tab: ["Nueva pestaña", "Abre una pestaña nueva en el navegador administrado."],
  close_tab: ["Cerrar pestaña", "Cierra una pestaña por ID."],
  navigate: ["Navegar", "Abre una URL en la pestaña autorizada."],
  click: ["Hacer clic", "Activa un elemento mediante un selector."],
  type: ["Escribir texto", "Introduce texto en un campo permitido."],
  press_key: ["Presionar tecla", "Envía una tecla a un elemento permitido."],
  get_content: ["Leer contenido", "Obtiene HTML redactado de la pestaña."],
  screenshot: ["Capturar pantalla", "Crea una captura visible como artifact."],
  wait: ["Esperar elemento", "Espera hasta que un selector sea visible."],
  upload: ["Subir archivo", "Adjunta un artifact permitido a un control de archivo."],
  select: ["Elegir opción", "Selecciona una opción en un control."],
  scroll: ["Desplazar", "Desplaza la pestaña una distancia acotada."],
  pairing_create: ["Generar código de enlace", "Crea un código de 10 caracteres válido por cinco minutos."],
  relay_register: ["Registrar Relay", "Registra un Relay del pool MultiRelay; queda joining hasta su heartbeat."],
  relay_enable: ["Habilitar Relay", "Permite que un Relay vuelva al pool de selección."],
  relay_disable: ["Deshabilitar Relay", "Retira administrativamente un Relay sin borrar su identidad."],
  relay_priority: ["Cambiar prioridad Relay", "Actualiza la prioridad usada para seleccionar el Relay preferido."],
  create_pairing: ["Vincular nuevo nodo", "Genera un código temporal. El perfil predeterminado permite el agente Windows completo y también nodos Linux."],
  approve: ["Aprobar nodo", "Autoriza que un nodo pendiente participe en la red."],
  revoke: ["Revocar nodo", "Revoca sus credenciales y lo desconecta de RelNet."],
  reauthenticate: ["Reautenticar nodo", "Genera un pairing de un solo uso para reemplazar las credenciales del mismo nodo. Reutiliza el instalador actual y requiere volver a aprobar el nodo."],
  delete_node: ["Eliminar nodo", "Elimina permanentemente el nodo y su historial operativo RelNet. Solo funciona si está revocado u offline."],
  configure_network: ["Configurar red", "Define transporte deseado, capacidad como nodo de salida y rutas LAN anunciadas."],
  policy_create: ["Crear política", "Crea una regla ACL para el Mesh privado RelNet."],
  policy_update: ["Actualizar política", "Modifica una regla ACL existente."],
  policy_delete: ["Eliminar política", "Elimina una regla ACL de RelNet."],
  feature_set: ["Activar o desactivar habilidad", "Controla RelDrop, RelShare o acceso SSH de RelNet sin desinstalar componentes."],
  set_tag: ["Configurar tag", "Cambia el tag de enrutamiento usado por las políticas ACL del nodo."],
  capability_grant: ["Habilitar capacidades nativas", "Añade RelDrop, RelShare o SSH a un nodo activo con identidad Ed25519 y agente compatible, sin re-vincularlo."],
  controller_join_create: ["Crear join de controller", "Genera un código CTL de un solo uso para incorporar el controller secundario en standby fenced."],
  drop_send: ["RelDrop", "Transfiere un archivo de un nodo a otro con validación SHA-256 y registro auditable."],
  share_create: ["Crear RelShare", "Publica una carpeta compartida gestionada y restringida a la red RelNet."],
  share_remove: ["Quitar RelShare", "Deja de publicar la carpeta sin borrar sus archivos."],
  ssh_key_generate: ["Generar clave SSH", "Genera una clave Ed25519 administrada por RelNet; la clave privada no se muestra ni se exporta."],
  ssh_key_deploy: ["Autorizar clave en nodos", "Instala la clave pública administrada en uno o todos los nodos compatibles."],
  dispatch: ["Enviar trabajo", "Encola una operación tipada para un nodo activo; las acciones sobre aplicaciones requieren doble confirmación."],
  cancel_command: ["Cancelar trabajo", "Solicita la cancelación de un trabajo RelNet."],
  terminal_create: ["Abrir terminal", "Crea una sesión persistente e interactiva en un nodo en línea."],
  terminal_write: ["Enviar entrada", "Envía entrada a una terminal persistente."],
  terminal_resize: ["Redimensionar terminal", "Actualiza filas y columnas de la sesión."],
  terminal_signal: ["Enviar señal", "Envía Ctrl+C, TERM, KILL o EOF a la sesión."],
  terminal_close: ["Cerrar terminal", "Finaliza la sesión interactiva."],
  list_tabs: ["Listar pestañas", "Solicita a la extensión las pestañas de la sesión."],
  authorize_tab: ["Autorizar pestaña", "Solicita autorización local para una pestaña específica."],
  device_revoke: ["Revocar dispositivo", "Desconecta y revoca permanentemente el dispositivo."],
  download: ["Descargar", "Descarga un archivo existente del almacén de artifacts."],
  deploy_staging: ["Desplegar a staging", "Prepara el despliegue de una release en staging."],
  promote: ["Preparar promoción", "Genera una aprobación independiente para promover una release validada mediante una unidad persistente."],
  execute_host_approval: ["Ejecutar aprobación", "Consume una aprobación autorizada y pone en cola la promoción persistente."],
  backup_create: ["Crear backup", "Prepara un respaldo operativo."],
  snapshot_create: ["Crear snapshot", "Prepara una instantánea de datos."],
  backup_restore: ["Restaurar backup", "Solicita una restauración explícita."],
};

const highImpact = new Set(["recover_connectors", "redeploy_current", "stop", "restart", "recreate", "approve", "dispatch", "terminal_create", "cancel_command", "revoke", "reauthenticate", "delete_node", "controller_join_create", "relay_register", "relay_enable", "relay_disable", "relay_priority", "configure_network", "policy_create", "policy_update", "policy_delete", "feature_set", "set_tag", "capability_grant", "drop_send", "share_create", "share_remove", "ssh_key_generate", "ssh_key_deploy", "delete", "device_revoke", "promote", "execute_host_approval", "rollback", "backup_restore"]);

const field = (name, label, type = "text", options = {}) => ({ name, label, type, ...options });
const commonFields = {
  service: field("service", "Servicio", "select", { required: true, options: ["admin", "api", "auth-broker", "browser", "caddy", "mcp", "postgres", "redis", "remote-chrome-relay", "rescue", "worker"] }),
  runner: field("runner_id", "Runner ID", "text", { required: true, value: "runner_local" }),
  node: field("node_id", "Nodo", "node-select", { required: true }),
  integration: field("integration_id", "Integration ID", "text", { required: true, placeholder: "integration_…" }),
  job: field("job_id", "Job ID", "text", { required: true, placeholder: "job_…" }),
  session: field("session_id", "Session ID", "text", { required: true, placeholder: "remote_session_…" }),
  tab: field("tab_id", "Tab ID", "text", { required: true, placeholder: "tab_…" }),
  selector: field("selector", "Selector CSS", "text", { required: true, placeholder: "button[type=submit]" }),
};

const operationFields = {
  "rescue.logs": [commonFields.service], "rescue.start": [commonFields.service], "rescue.stop": [commonFields.service], "rescue.restart": [commonFields.service], "rescue.recreate": [commonFields.service],
  "relnet.controller_join_create": [field("role", "Rol", "select", { required: true, options: ["secondary"], value: "secondary" }), field("ttl_seconds", "Vigencia CTL (segundos)", "number", { value: 600, min: 60, max: 3600 })],
  "containers.logs": [commonFields.service], "containers.start": [commonFields.service], "containers.stop": [commonFields.service], "containers.restart": [commonFields.service],
  "runners.pause": [commonFields.runner], "runners.resume": [commonFields.runner], "runners.drain": [commonFields.runner], "runners.mark_offline": [commonFields.runner], "runners.restart": [commonFields.runner],
  "relnet.relay_register": [field("relay_id", "Relay ID", "text", { required: true, value: "relay_primary" }), field("public_key", "Clave pública WireGuard", "text", { required: true }), field("endpoint", "Endpoint", "text", { required: true, placeholder: "relay.example.com:51821" }), field("priority", "Prioridad", "number", { value: 100, min: 1, max: 10000 }), field("region", "Región", "text", { value: "" }), field("capacity", "Capacidad", "number", { value: 1, min: 1 })],
  "relnet.relay_enable": [field("relay_id", "Relay ID", "text", { required: true })],
  "relnet.relay_disable": [field("relay_id", "Relay ID", "text", { required: true })],
  "relnet.relay_priority": [field("relay_id", "Relay ID", "text", { required: true }), field("priority", "Prioridad", "number", { required: true, value: 100, min: 1, max: 10000 })],
  "relnet.create_pairing": [field("routing_tag", "RelNet tag", "text", { placeholder: "Automático si tu cuenta tiene un solo tag" }), field("ttl_seconds", "Vigencia (segundos)", "number", { value: 600, min: 60, max: 3600 }), field("node_role", "Rol", "select", { options: ["runner"], value: "runner" }), field("capabilities", "Capacidades permitidas (perfil Windows completo)", "json", { value: ["system.info", "system.metrics", "services", "terminal.shell", "terminal.powershell", "desktop.ui_automation", "browser.chrome", "office.com", "relnet.drop", "relnet.share", "relnet.ssh"] })],
  "relnet.approve": [field("node_id", "Nodo", "node-select", { required: true, states: ["pending", "paused", "offline"] })], "relnet.pause": [commonFields.node], "relnet.resume": [commonFields.node], "relnet.mark_offline": [commonFields.node], "relnet.revoke": [commonFields.node],
  "relnet.reauthenticate": [commonFields.node, field("ttl_seconds", "Vigencia del pairing (segundos)", "number", { value: 600, min: 60, max: 3600 })], "relnet.delete_node": [field("node_id", "Nodo", "node-select", { required: true, states: ["revoked", "offline"] })],
  "relnet.configure_network": [commonFields.node, field("desired_transport", "Transporte deseado", "select", { options: ["auto", "mesh", "relay"], value: "auto" }), field("preferred_relay_id", "Relay preferido", "text", { value: "", placeholder: "relay_primary, relay_secondary o vacío=auto" }), field("exit_node", "Permitir como nodo de salida", "checkbox", { value: false }), field("subnet_routes", "Subredes LAN anunciadas", "json", { value: [] })],
  "relnet.policy_create": [field("name", "Nombre", "text", { required: true }), field("description", "Descripción", "textarea"), field("source_tag", "Tag origen", "text", { value: "default" }), field("destination_tag", "Tag destino", "text", { value: "default" }), field("protocols", "Protocolos", "json", { value: ["tcp", "udp", "icmp"] }), field("ports", "Puertos", "json", { value: [] }), field("action", "Acción", "select", { options: ["allow", "deny"], value: "allow" }), field("priority", "Prioridad", "number", { value: 100, min: 1, max: 10000 }), field("enabled", "Habilitada", "checkbox", { value: true })],
  "relnet.policy_update": [field("policy_id", "Policy ID", "text", { required: true, placeholder: "relnet_policy_…" }), field("enabled", "Habilitada", "checkbox", { value: true }), field("priority", "Prioridad", "number", { value: 100, min: 1, max: 10000 })],
  "relnet.policy_delete": [field("policy_id", "Policy ID", "text", { required: true, placeholder: "relnet_policy_…" })],
  "relnet.dispatch": [commonFields.node, field("capability", "Capacidad", "select", { required: true, options: ["system.info"], value: "system.info" }), field("command_operation", "Operación tipada", "select", { required: true, options: ["read"], value: "read" }), field("command_parameters", "Parámetros tipados", "json", { value: {} }), field("ttl_seconds", "Vigencia (segundos)", "number", { value: 300, min: 60, max: 3600 })],
  "relnet.feature_set": [field("feature_name", "Habilidad", "select", { options: ["reldrop", "relshare", "ssh_access"], value: "reldrop" }), field("enabled", "Habilitada", "checkbox", { value: true })],
  "relnet.set_tag": [commonFields.node, field("routing_tag", "RelNet tag", "text", { required: true, value: "default" })],
  "relnet.capability_grant": [commonFields.node, field("capabilities", "Capacidades a habilitar", "json", { required: true, value: ["relnet.drop", "relnet.share", "relnet.ssh"] })],
  "relnet.drop_send": [field("source_node_id", "Nodo origen", "node-select", { required: true, capability: "relnet.drop" }), field("destination_node_id", "Nodo destino", "node-select", { required: true, capability: "relnet.drop" }), field("files", "Archivos", "file", { required: true, multiple: true }), field("ttl_seconds", "Vigencia", "number", { value: 1800, min: 300, max: 86400 })],
  "relnet.share_create": [commonFields.node, field("read_only", "Solo lectura", "checkbox", { value: false })],
  "relnet.share_remove": [commonFields.node],
  "ssh_config.ssh_key_generate": [field("replace", "Reemplazar clave existente", "checkbox", { value: false })],
  "ssh_config.ssh_key_deploy": [field("node_id", "Nodo (vacío = todos compatibles)", "text", { required: false, placeholder: "relnet_node_…" })],
  "relnet.terminal_create": [commonFields.node, field("shell", "Shell", "select", { options: ["shell", "powershell", "cmd"], value: "shell" }), field("cwd", "Directorio inicial", "text", { value: "" }), field("cols", "Columnas", "number", { value: 120, min: 20, max: 300 }), field("rows", "Filas", "number", { value: 32, min: 5, max: 120 }), field("ttl_seconds", "Duración máxima", "number", { value: 1800, min: 60, max: 3600 })],
  "relnet.cancel_command": [field("command_id", "Comando", "command-select", { required: true })],
  "jobs.create": [field("workspace_id", "Workspace ID", "text", { required: true, placeholder: "workspace_…" }), field("command", "Comando", "textarea", { required: true }), field("cwd", "Directorio", "text", { value: "" }), field("timeout_seconds", "Tiempo límite (segundos)", "number", { value: 900, min: 1, max: 3600 })],
  "jobs.get": [commonFields.job], "jobs.logs": [commonFields.job, field("offset", "Offset", "number", { value: 0, min: 0 }), field("limit", "Límite de bytes", "number", { value: 262144, min: 1, max: 524288 })], "jobs.cancel": [commonFields.job],
  "jobs.retry": [field("source_job_id", "Job de origen", "text", { required: true, placeholder: "job_…" }), field("command", "Comando", "textarea", { required: true })],
  "jobs.ssh_execute": [field("operation", "Modo", "select", { options: ["execute", "download", "upload"], value: "execute" }), field("connection_id", "Conexión SSH", "text", { required: true, placeholder: "ssh_connection_…" }), field("command", "Comando", "textarea", { required: true }), field("timeout_seconds", "Tiempo límite (segundos)", "number", { value: 900, min: 1, max: 3600 })],
  "integrations.test": [commonFields.integration], "integrations.disable": [commonFields.integration], "integrations.reactivate": [commonFields.integration],
  "oauth.test": [commonFields.integration], "oauth.disable": [commonFields.integration], "oauth.reactivate": [commonFields.integration], "oauth.revoke": [commonFields.integration], "oauth.delete": [commonFields.integration],
  "oauth.add": [field("provider", "Proveedor", "select", { required: true, options: ["github", "google", "cloudflare", "azure", "aws", "manual"] }), field("mode", "Modo", "select", { options: ["manual", "oauth"], value: "manual" }), field("label", "Nombre de la conexión", "text", { required: true }), field("scopes", "Scopes", "json", { value: [] }), field("open_in_browser", "Abrir en Browser administrado", "checkbox", { value: true })],
  "workspaces.create": [field("name", "Nombre", "text", { required: true }), field("description", "Descripción", "textarea")], "workspaces.delete": [field("workspace_id", "Workspace ID", "text", { required: true, placeholder: "workspace_…" })],
  "browser.session_create": [field("label", "Nombre de la sesión", "text", { required: true }), field("ttl_seconds", "Duración (segundos)", "number", { value: 900, min: 60, max: 86400 }), field("url", "URL inicial", "url", { placeholder: "https://…" })],
  "browser.session_complete": [commonFields.session, field("user_confirmed", "Confirmo que la autenticación terminó", "checkbox", { value: true })],
  "browser.reuse": [field("connection_id", "Connection ID", "text", { required: true, placeholder: "browser_connection_…" })], "browser.revoke": [field("connection_id", "Connection ID", "text", { required: true, placeholder: "browser_connection_…" })],
  "browser.close_tab": [commonFields.tab], "browser.navigate": [commonFields.tab, field("url", "URL", "url", { required: true, placeholder: "https://…" })], "browser.click": [commonFields.tab, commonFields.selector], "browser.type": [commonFields.tab, commonFields.selector, field("text", "Texto", "textarea", { required: true })], "browser.press_key": [commonFields.tab, commonFields.selector, field("key", "Tecla", "text", { required: true, placeholder: "Enter" })], "browser.get_content": [commonFields.tab], "browser.screenshot": [commonFields.tab, field("full_page", "Página completa", "checkbox", { value: true })], "browser.wait": [commonFields.tab, commonFields.selector], "browser.upload": [commonFields.tab, commonFields.selector, field("artifact_path", "Ruta del artifact", "text", { required: true })], "browser.select": [commonFields.tab, commonFields.selector, field("value", "Valor", "text", { required: true })], "browser.scroll": [commonFields.tab, field("delta_x", "Horizontal", "number", { value: 0 }), field("delta_y", "Vertical", "number", { value: 600 })],
  "remote_chrome.session_create": [field("device_id", "Device ID", "text", { required: true, placeholder: "chrome_device_…" }), field("ttl_seconds", "Duración (segundos)", "number", { value: 3600, min: 60, max: 86400 }), field("domain_allowlist", "Dominios permitidos", "json", { value: [] })],
  "remote_chrome.list_tabs": [commonFields.session], "remote_chrome.authorize_tab": [commonFields.session, commonFields.tab], "remote_chrome.navigate": [commonFields.session, commonFields.tab, field("url", "URL", "url", { required: true })], "remote_chrome.click": [commonFields.session, commonFields.tab, commonFields.selector], "remote_chrome.type": [commonFields.session, commonFields.tab, commonFields.selector, field("text", "Texto", "textarea", { required: true })], "remote_chrome.press_key": [commonFields.session, commonFields.tab, commonFields.selector, field("key", "Tecla", "text", { required: true })], "remote_chrome.select": [commonFields.session, commonFields.tab, commonFields.selector, field("value", "Valor", "text", { required: true })], "remote_chrome.scroll": [commonFields.session, commonFields.tab, field("delta_x", "Horizontal", "number", { value: 0 }), field("delta_y", "Vertical", "number", { value: 600 })], "remote_chrome.upload": [commonFields.session, commonFields.tab, commonFields.selector, field("artifact_path", "Ruta del artifact", "text", { required: true })], "remote_chrome.screenshot": [commonFields.session, commonFields.tab, field("full_page", "Página completa", "checkbox", { value: true })], "remote_chrome.get_content": [commonFields.session, commonFields.tab], "remote_chrome.wait": [commonFields.session, commonFields.tab, commonFields.selector], "remote_chrome.disconnect": [commonFields.session], "remote_chrome.device_revoke": [field("device_id", "Device ID", "text", { required: true, placeholder: "chrome_device_…" })],
  "artifacts.download": [field("path", "Ruta", "text", { required: true })], "artifacts.delete": [field("path", "Ruta", "text", { required: true })],
  "releases.deploy_staging": [field("release_id", "Release ID", "text", { required: true })], "releases.promote": [field("release_id", "Release ID", "text", { required: true })], "releases.execute_host_approval": [field("approval_id", "Approval ID", "text", { required: true, placeholder: "admin_approval_…" })], "releases.rollback": [field("release_id", "Release ID", "text", { required: true })],
  "backups.backup_restore": [field("backup_id", "Backup ID", "text", { required: true })],
};


const typedOperationsByCapability = {
  "system.info": ["read"],
  "system.metrics": ["read"],
  "services": ["list", "status", "start", "stop", "restart"],
  "terminal.shell": ["execute"],
  "terminal.powershell": ["execute"],
  "browser.chrome": ["launch"],
  "desktop.ui_automation": ["window_list", "launch", "invoke", "set_value"],
  "office.com": ["word_new", "excel_new"],
  "relnet.drop": ["upload", "download"],
  "relnet.share": ["list", "create", "remove"],
  "relnet.ssh": ["authorize_key", "revoke_key"],
};
const typedParameterTemplates = {
  "system.info.read": {}, "system.metrics.read": {}, "services.list": {},
  "services.status": { name: "" }, "services.start": { name: "" }, "services.stop": { name: "" }, "services.restart": { name: "" },
  "terminal.shell.execute": { command: "" }, "terminal.powershell.execute": { command: "" },
  "browser.chrome.launch": { url: "https://" },
  "desktop.ui_automation.window_list": {}, "desktop.ui_automation.launch": { app: "notepad" },
  "desktop.ui_automation.invoke": { window_title: "", element_name: "" },
  "desktop.ui_automation.set_value": { window_title: "", element_name: "", value: "" },
  "office.com.word_new": { text: "", visible: true }, "office.com.excel_new": { cells: { A1: "" }, visible: true },
  "relnet.drop.upload": { transfer_id: "", source_path: "" },
  "relnet.drop.download": { transfer_id: "", destination_directory: "", filename: "", expected_sha256: "" },
  "relnet.share.list": {}, "relnet.share.create": { name: "", path: "", read_only: false }, "relnet.share.remove": { name: "" },
  "relnet.ssh.authorize_key": { public_key: "ssh-ed25519 ", comment: "" },
  "relnet.ssh.revoke_key": { public_key: "ssh-ed25519 ", comment: "" },
};

let session;
let activeModule = surface === "console" ? "relnet_network" : "system";
let currentPayload;
let secretCatalog = [];
let secretStorePayload = { items: [], crypto_ready: false, values_exposed: false };
const revealedSecrets = new Map();
const secretRevealTimers = new Map();
let relnetNodeCatalog = [];
let relnetAllNodeCatalog = [];
let relnetCommandCatalog = [];
let actionDownloadUrl;

const byId = (id) => document.getElementById(id);
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);

function titleFor(key) {
  if (copy[key] && !["healthy", "degraded", "production", "staging"].includes(key)) return copy[key];
  return String(key).replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function statusTone(value, key = "") {
  if (value === true) return "ok";
  if (value === false) return key.includes("available") || key.includes("healthy") ? "bad" : "neutral";
  const normalized = String(value).toLowerCase();
  if (["healthy", "ready", "active", "online", "connected", "succeeded", "success", "production", "ok", "running", "enabled"].includes(normalized)) return "ok";
  if (["degraded", "staging", "pending", "queued", "warning", "paused", "draining", "authentication_required", "local_all_tabs_authorization_required"].includes(normalized)) return "warn";
  if (["failed", "error", "offline", "revoked", "stopped", "unhealthy", "cancelled", "expired", "unavailable"].includes(normalized)) return "bad";
  return "neutral";
}

function formatScalar(value, key = "") {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Sí" : "No";
  if (typeof value === "number" && key === "size") return formatBytes(value);
  if ((key.endsWith("_at") || key === "expires_at") && typeof value === "string") {
    const date = new Date(value);
    if (!Number.isNaN(date.valueOf())) return new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "short" }).format(date);
  }
  const translated = copy[String(value).toLowerCase()];
  return translated || String(value);
}

function formatBytes(bytes) {
  if (!Number.isFinite(Number(bytes))) return String(bytes);
  if (Number(bytes) < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = Number(bytes) / 1024;
  let index = 0;
  while (value >= 1024 && index < units.length - 1) { value /= 1024; index += 1; }
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[index]}`;
}

function renderValue(value, key = "") {
  if (value === null || value === undefined || value === "") return '<span class="muted">—</span>';
  if (["boolean", "string"].includes(typeof value) && (typeof value === "boolean" || statusTone(value, key) !== "neutral")) {
    return `<span class="status-chip ${statusTone(value, key)}">${escapeHtml(formatScalar(value, key))}</span>`;
  }
  if (typeof value === "object") {
    return `<details class="nested-details"><summary>Ver detalle</summary><pre>${escapeHtml(JSON.stringify(value, null, 2))}</pre></details>`;
  }
  return escapeHtml(formatScalar(value, key));
}

async function api(path, options = {}) {
  if (surface === "console" && path.startsWith("/admin/")) path = "/console/" + path.slice(7);
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (options.method && options.method !== "GET") headers["X-CSRF-Token"] = session.csrf;
  const response = await fetch(path, { ...options, headers, credentials: "same-origin" });
  if (response.status === 401) {
    location.assign(surfaceBase + "/login");
    throw new Error("La sesión caducó. Inicia sesión de nuevo.");
  }
  let payload;
  try { payload = await response.json(); } catch { payload = { detail: "La plataforma devolvió una respuesta inválida." }; }
  if (!response.ok) {
    const detail = typeof payload.detail === "string" ? payload.detail : "La operación no pudo completarse.";
    const error = new Error(detail);
    error.status = response.status;
    throw error;
  }
  return payload;
}

const TABLE_PAGE_SIZE = 10;
const tablePages = new Map();
let tableFilterTerm = "";

const relnetSectionMeta = {
  status: ["Estado de la red", "Resumen del controlador, Relay, protocolo y capacidades activas."],
  nodes: ["Nodos RelNet", "Dispositivos vinculados, versión del agente, transporte, conectividad y capacidades."],
  peers: ["Nodos", "Dispositivos físicos o móviles vinculados y disponibles para operación."],
  controllers: ["Controllers", "Plano de control lógico primario y secundario de RelNet."],
  pairings: ["Vinculaciones", "Solicitudes de emparejamiento, vigencia, tag y estado de aprobación."],
  commands: ["Comandos", "Operaciones tipadas enviadas a los nodos y su estado de ejecución."],
  terminal_sessions: ["Sesiones de terminal", "Terminales persistentes abiertas, reanudables o finalizadas por nodo."],
  policies: ["Políticas ACL", "Reglas de comunicación entre tags, prioridades, puertos y estado de aplicación."],
  topology: ["Topología", "Vista lógica de nodos, rutas, Relay, malla y conectividad entre dispositivos."],
  telemetry: ["Telemetría", "Métricas recientes de transporte y actividad reportadas por los agentes."],
  features: ["Funciones RelNet", "Estado de RelDrop, RelShare, SSH y otras funciones controladas por la red."],
  drop_transfers: ["Transferencias RelDrop", "Historial de envíos, origen, destino, integridad y estado de transferencia."],
  routing: ["Enrutamiento RelNet", "Preferencias de salida, gateways y anuncios de subred con estado deseado/aplicado."],
  ssh_config: ["SSH administrado", "Clave Ed25519 del controlador y nodos elegibles para acceso SSH privado."],
};

const relnetColumns = {
  nodes: ["name", "os_family", "agent_version", "effective_state", "online", "virtual_ip", "transport_mode", "routing_tag", "terminal_available"],
  peers: ["name", "os_family", "agent_version", "effective_state", "online", "virtual_ip", "transport_mode", "routing_tag", "terminal_available"],
  controllers: ["name", "virtual_ip", "state", "routing_tag", "transport_mode", "node_role"],
  pairings: ["pairing_id", "routing_tag", "state", "expires_at", "created_at", "approved_at"],
  commands: ["command_id", "node_id", "capability", "operation", "state", "created_at", "completed_at"],
  terminal_sessions: ["session_id", "node_id", "shell", "state", "created_at", "updated_at"],
  policies: ["name", "source_tag", "destination_tag", "action", "protocols", "ports", "priority", "enabled"],
  telemetry: ["node_id", "name", "online", "transport_mode", "relay_connected", "latest_handshake_age_seconds", "mesh_rx_bytes", "mesh_tx_bytes"],
  drop_transfers: ["transfer_id", "source_node_id", "destination_node_id", "state", "size_bytes", "created_at", "completed_at"],
};

function sourceTitle(source, operation = "") {
  if (operation && relnetSectionMeta[operation]) return relnetSectionMeta[operation][0];
  const normalized = String(source).replace("/v1/", "");
  const labels = {
    "internal/status": "Estado independiente de recuperación", "system/info": "Identidad de la plataforma", "system/health": "Salud y alertas", "infrastructure/execute": "Host e infraestructura",
    "features/query": "Funciones configuradas", "containers/query": "Servicios", "runners/query": "Runners y actividad", "relnet/query": "RelNet", "integrations/query": "Integraciones",
    "oauth/execute": "Conexiones de autenticación", "secrets/query": "Referencias registradas", "workspaces/execute": "Workspaces",
    "browser/execute": "Browser administrado", "remote-chrome/execute": "Chrome remoto", "artifacts/execute": "Artifacts", "audit/query": "Eventos administrativos",
  };
  return labels[normalized] || titleFor(normalized.split("/").pop());
}

function sectionDescription(section) {
  const operation = String(section.operation || "");
  return relnetSectionMeta[operation]?.[1] || "Datos actuales y redactados de esta fuente.";
}

function pageKey(section, index, suffix = "items") {
  return `${activeModule}:${section.operation || section.source}:${index}:${suffix}`;
}

function filteredItems(items) {
  if (!tableFilterTerm) return items;
  return items.filter((item) => JSON.stringify(item).toLowerCase().includes(tableFilterTerm));
}

function columnsFor(section, items) {
  const preferred = relnetColumns[String(section.operation || "")] || [];
  const available = new Set(items.flatMap((item) => Object.keys(item || {})));
  const keys = preferred.filter((key) => available.has(key));
  for (const key of available) {
    if (keys.length >= 9) break;
    if (!keys.includes(key)) keys.push(key);
  }
  return keys.slice(0, 9);
}

function renderPagination(key, page, pageCount, visibleCount, totalCount) {
  if (pageCount <= 1 && visibleCount === totalCount) return "";
  return `<div class="table-pagination" data-page-key="${escapeHtml(key)}">
    <span>${visibleCount === totalCount ? `${totalCount} registros` : `${visibleCount} de ${totalCount} registros`} · Página ${page + 1} de ${pageCount}</span>
    <div class="pagination-actions">
      <button type="button" class="button secondary compact page-button" data-page-delta="-1" ${page <= 0 ? "disabled" : ""}>Anterior</button>
      <button type="button" class="button secondary compact page-button" data-page-delta="1" ${page >= pageCount - 1 ? "disabled" : ""}>Siguiente</button>
    </div>
  </div>`;
}

function renderItemTable(section, items, index, suffix = "items") {
  const title = sourceTitle(section.source, section.operation);
  const filtered = filteredItems(items);
  const key = pageKey(section, index, suffix);
  const pageCount = Math.max(1, Math.ceil(filtered.length / TABLE_PAGE_SIZE));
  const requestedPage = Number(tablePages.get(key) || 0);
  const page = Math.min(Math.max(0, requestedPage), pageCount - 1);
  tablePages.set(key, page);
  const pageItems = filtered.slice(page * TABLE_PAGE_SIZE, (page + 1) * TABLE_PAGE_SIZE);
  if (!pageItems.length) {
    return `<div class="empty-state"><strong>No hay registros${tableFilterTerm ? " que coincidan" : ""}</strong><p>${tableFilterTerm ? "Prueba otro filtro." : "Esta subsección no tiene elementos que mostrar en este momento."}</p></div>`;
  }
  const keys = columnsFor(section, filtered.length ? filtered : items);
  const rows = pageItems.map((item) => `<tr class="record-row">${keys.map((column) => {
    const cellClass = /(?:^|_)(?:id|path|digest|fingerprint|version)$/.test(column) ? "cell-identifier" : (column === "status" || column === "state" || column === "effective_state" ? "cell-status" : "");
    return `<td class="${cellClass}" data-label="${escapeHtml(titleFor(column))}">${renderValue(item[column], column)}</td>`;
  }).join("")}<td class="cell-detail" data-label="Detalle"><details class="nested-details row-detail"><summary>Ver</summary><pre>${escapeHtml(JSON.stringify(item, null, 2))}</pre></details></td></tr>`).join("");
  return `<div class="table-wrap"><table><thead><tr>${keys.map((column) => `<th scope="col">${escapeHtml(titleFor(column))}</th>`).join("")}<th scope="col">Detalle</th></tr></thead><tbody>${rows}</tbody></table></div>${renderPagination(key, page, pageCount, filtered.length, items.length)}`;
}

function renderSshConfig(section, index) {
  const data = section.data || {};
  const nodes = Array.isArray(data.eligible_nodes) ? data.eligible_nodes : [];
  const fingerprint = data.fingerprint || data.managed_key?.fingerprint || "No generada";
  const generated = Boolean(data.generated || data.managed_key?.generated);
  const configReady = Boolean(data.config_ready);
  const keyStatus = generated ? "Lista" : "Pendiente";
  const cards = `<div class="ssh-key-summary">
    <article class="ssh-key-card"><span>Clave administrada</span><strong>${escapeHtml(keyStatus)}</strong><small>Ed25519 · la clave privada nunca se exporta</small></article>
    <article class="ssh-key-card"><span>Fingerprint</span><strong class="mono-wrap">${escapeHtml(fingerprint)}</strong><small>Identidad pública del controlador</small></article>
    <article class="ssh-key-card"><span>Configuración</span><strong>${configReady ? "Lista" : "Pendiente"}</strong><small>${nodes.length} nodo${nodes.length === 1 ? "" : "s"} elegible${nodes.length === 1 ? "" : "s"}</small></article>
  </div>`;
  const normalized = nodes.map((node) => {
    const nodeId = String(node.node_id || "");
    const slug = String(node.name || "node").toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 36) || "node";
    return { name: node.name, alias: `relnet-${slug}-${nodeId.slice(-6)}`, node_id: node.node_id, virtual_ip: node.virtual_ip, user: node.user, port: node.port };
  });
  const nodeSection = { ...section, operation: "ssh_config" };
  return `<article class="section-block ssh-config-block"><header class="section-header"><div><h3>SSH administrado</h3><p class="section-description">Genera una sola clave Ed25519 protegida en el controlador y autoriza únicamente su clave pública en los nodos que selecciones.</p><small class="source-label">La clave privada permanece en el controlador.</small></div><span class="record-count">${nodes.length}</span></header>${cards}<div class="ssh-guidance"><strong>Flujo recomendado</strong><ol><li>Genera la clave si aún no existe.</li><li>Revisa los nodos elegibles y su conectividad.</li><li>Usa “Autorizar clave en nodos” para uno o todos los nodos.</li></ol></div>${normalized.length ? renderItemTable(nodeSection, normalized, index, "eligible_nodes") : `<div class="empty-state"><strong>No hay nodos elegibles</strong><p>Los nodos deben estar activos, anunciar relnet.ssh y contar con IP virtual.</p></div>`}</article>`;
}

function renderSection(section, index) {
  if (activeModule === "ssh_config") return renderSshConfig(section, index);
  const data = section.data;
  const title = sourceTitle(section.source, section.operation);
  const description = sectionDescription(section);
  if (Array.isArray(data?.items)) {
    return `<article class="section-block" data-operation="${escapeHtml(section.operation || "")}"><header class="section-header"><div><h3>${escapeHtml(title)}</h3><p class="section-description">${escapeHtml(description)}</p><small class="source-label">${escapeHtml(section.operation || section.source)}</small></div><span class="record-count">${data.items.length}</span></header>${renderItemTable(section, data.items, index)}</article>`;
  }
  const objectArrays = Object.entries(data || {}).filter(([, value]) => Array.isArray(value) && value.every((item) => item && typeof item === "object" && !Array.isArray(item)));
  const arrayKeys = new Set(objectArrays.map(([key]) => key));
  const entries = Object.entries(data || {}).filter(([key]) => !arrayKeys.has(key));
  if (!entries.length && !objectArrays.length) return `<article class="section-block"><div class="empty-state"><strong>Sin información</strong><p>La fuente respondió correctamente, pero no contiene datos.</p></div></article>`;
  const summary = entries.length ? `<dl class="detail-grid">${entries.map(([key, value]) => `<div class="detail-item ${typeof value === "object" && value !== null ? "wide" : ""}"><dt>${escapeHtml(titleFor(key))}</dt><dd>${renderValue(value, key)}</dd></div>`).join("")}</dl>` : "";
  const tables = objectArrays.map(([key, value], arrayIndex) => `<section class="nested-table-section"><h4>${escapeHtml(titleFor(key))}</h4>${renderItemTable({ ...section, operation: section.operation || key }, value, index, `${key}-${arrayIndex}`)}</section>`).join("");
  return `<article class="section-block" data-operation="${escapeHtml(section.operation || "")}"><header class="section-header"><div><h3>${escapeHtml(title)}</h3><p class="section-description">${escapeHtml(description)}</p><small class="source-label">${escapeHtml(section.operation || section.source)}</small></div></header>${summary}${tables}</article>`;
}

function findSystemSection(fragment) {
  return currentPayload?.sections?.find((section) => String(section.source).includes(fragment))?.data || {};
}

function metricCard(label, value, note, tone = "neutral") {
  return `<article class="metric-card"><span class="metric-label"><span class="status-dot ${tone === "neutral" ? "" : tone}"></span>${escapeHtml(label)}</span><strong class="metric-value">${escapeHtml(formatScalar(value))}</strong><small class="metric-note">${escapeHtml(note)}</small></article>`;
}

function renderSummary(payload) {
  let cards = [];
  if (activeModule === "system") {
    const info = findSystemSection("/system/info");
    const health = findSystemSection("/system/health");
    const jobs = health.metrics?.jobs || {};
    const remote = health.metrics?.remote_chrome || {};
    cards = [
      metricCard("Entorno", info.release_state || "—", info.version || "Versión no disponible", statusTone(info.release_state)),
      metricCard("Salud general", health.status || "—", `${health.alert_count || 0} alertas activas`, statusTone(health.status)),
      metricCard("Trabajos activos", jobs.running ?? jobs.active ?? 0, `${jobs.queued || 0} en cola`, Number(jobs.running || 0) > 0 ? "ok" : "neutral"),
      metricCard("Chrome remoto", remote.online_devices ?? 0, `${remote.active_sessions || 0} sesiones activas`, Number(remote.online_devices || 0) > 0 ? "ok" : "neutral"),
    ];
    const alerts = Array.isArray(health.alerts) ? health.alerts : [];
    const banner = byId("global-alert");
    if (alerts.length) {
      banner.hidden = false;
      banner.className = "banner";
      banner.textContent = `${alerts.length} alerta${alerts.length === 1 ? " requiere" : "s requieren"} atención. Revisa “Salud y alertas” antes de operar.`;
    } else {
      banner.hidden = true;
    }
  } else {
    const items = payload.sections.flatMap((section) => Array.isArray(section.data?.items) ? section.data.items : []);
    const facts = payload.sections.flatMap((section) => Object.entries(section.data || {})).filter(([, value]) => ["string", "number", "boolean"].includes(typeof value));
    cards.push(metricCard("Registros", items.length, items.length === 1 ? "Elemento disponible" : "Elementos disponibles", items.length ? "ok" : "neutral"));
    for (const [key, value] of facts.slice(0, 3)) cards.push(metricCard(titleFor(key), value, "Dato actual", statusTone(value, key)));
    while (cards.length < 4) cards.push(metricCard("Fuente", "Disponible", "Datos redactados", "ok"));
    byId("global-alert").hidden = true;
  }
  byId("summary").innerHTML = cards.slice(0, 4).join("");
}

async function relnetRoutingAction(operation, parameters, confirmationToken) {
  const result = await api(`${surfaceBase}/api/modules/relnet/actions`, {
    method: "POST",
    body: JSON.stringify({ operation, parameters, ...(confirmationToken ? { confirmation_token: confirmationToken } : {}) }),
  });
  if (result.status === "confirmation_required" && result.confirmation_token) {
    const approved = await confirmationDialog(result, operation, parameters);
    if (!approved) throw new Error("Operación cancelada.");
    return relnetRoutingAction(operation, parameters, result.confirmation_token);
  }
  return result;
}

async function executeRelnetRoutingAction(operation, parameters) {
  try { return await relnetRoutingAction(operation, parameters); }
  catch (error) {
    if (error.status !== 428) throw error;
    await reauthenticate();
    return relnetRoutingAction(operation, parameters);
  }
}

function relnetRoutingPayload(payload) {
  return (payload?.sections || []).find((section) => section.operation === "routing")?.data || {};
}
function relnetRoutingCanManage() { return ["administrator", "owner"].includes(String(session?.role || "").toLowerCase()); }
function routingHelpLinks(contexts) {
  return `<div class="routing-help-links">${contexts.map(([label, context]) => `<a href="${faqUrlFor(context)}" target="_blank" rel="noreferrer">${escapeHtml(label)}</a>`).join("")}</div>`;
}
function gatewayDisplay(gateway) {
  if (!gateway) return "Gateway no disponible";
  if (gateway.gateway_id === "controller_relay") return "Controller / Relay · anbox.relead.com.mx";
  return `${gateway.display_name || gateway.public_name || gateway.node_id || gateway.gateway_id}${gateway.virtual_ip ? ` · ${gateway.virtual_ip}` : ""}`;
}

function renderRelnetEgress(payload) {
  if (surface !== "console" || activeModule !== "relnet_egress") return false;
  const view = routingViewModel(relnetRoutingPayload(payload));
  const nodes = relnetSections(payload).nodes.filter((node) => node.node_role !== "controller" && node.state !== "revoked");
  const byNode = new Map(view.nodes.map((item) => [item.node_id, item]));
  const activeGateways = view.gateways.filter((gateway) => String(gateway.state || "") === "active");
  const canManage = relnetRoutingCanManage();
  const gatewayCards = view.gateways.length ? view.gateways.map((gateway) => {
    const active = String(gateway.state || "") === "active";
    return `<article class="routing-gateway-card"><div><span class="routing-label">Gateway</span><strong>${escapeHtml(gatewayDisplay(gateway))}</strong><small>${escapeHtml(gateway.kind || "RelNet")} · ${escapeHtml(gateway.virtual_ip || "IP automática")}</small></div><div class="routing-gateway-actions"><span class="status-chip ${active ? "ok" : "warn"}">${active ? "Activo" : "Desactivado"}</span>${canManage ? `<button type="button" class="button secondary compact" data-routing-gateway="${escapeHtml(gateway.gateway_id)}" data-routing-node="${escapeHtml(gateway.node_id || "")}" data-routing-enabled="${active ? "false" : "true"}">${active ? "Desactivar" : "Activar"}</button>` : ""}</div></article>`;
  }).join("") : `<div class="empty-state"><strong>No hay gateways configurados</strong><p>Activa Controller / Relay antes de enviar tráfico por RelNet.</p></div>`;
  const nodeCards = nodes.length ? nodes.map((node) => {
    const state = byNode.get(String(node.node_id)) || { desired_mode: "local", gateway_id: null, failure_policy: "block", status: { desired: "Red local", applied: "Red local", tone: "ok" } };
    const supports = (node.capabilities || []).includes("relnet.egress.consumer");
    const selected = state.desired_mode === "relnet" && state.gateway_id ? state.gateway_id : "local";
    const gatewayOptions = activeGateways.map((gateway) => `<option value="${escapeHtml(gateway.gateway_id)}" ${selected === gateway.gateway_id ? "selected" : ""}>${escapeHtml(gatewayDisplay(gateway))}</option>`).join("");
    const blocked = !canManage || !supports || (!activeGateways.length && selected !== "local");
    const explanation = !supports ? "Este agente todavía no anuncia relnet.egress.consumer." : (!activeGateways.length ? "No hay un gateway activo; la red local permanece disponible." : "La selección cambia solo este nodo y conserva bypasses de recuperación.");
    return `<article class="routing-node-card" data-routing-node-card="${escapeHtml(node.node_id)}"><header><div><strong>${escapeHtml(node.name || node.node_id)}</strong><small>${escapeHtml(node.os_family || "Nodo RelNet")} · ${escapeHtml(node.virtual_ip || "sin IP")}</small></div><span class="status-chip ${state.status.tone === "pending" ? "warn" : statusTone(state.status.tone)}">${state.status.tone === "pending" ? "Pendiente" : escapeHtml(state.status.tone)}</span></header><div class="routing-state-pair"><div><span>Deseado</span><strong>${escapeHtml(state.status.desired)}</strong></div><div><span>Aplicado</span><strong>${escapeHtml(state.status.applied)}</strong></div></div><label class="field">Salida a Internet<select data-routing-mode ${blocked ? "disabled" : ""}><option value="local" ${selected === "local" ? "selected" : ""}>Red local</option>${gatewayOptions}</select></label><label class="checkbox-field"><input type="checkbox" data-routing-fallback ${state.failure_policy === "fallback_local" ? "checked" : ""} ${blocked ? "disabled" : ""}>Permitir fallback a Internet local si RelNet falla</label><p class="routing-explanation">${escapeHtml(explanation)}</p>${canManage ? `<button class="button primary" type="button" data-routing-apply ${blocked ? "disabled" : ""}>Aplicar selección</button>` : `<p class="routing-explanation">Se requiere rol administrador para modificar rutas.</p>`}</article>`;
  }).join("") : `<div class="empty-state"><strong>No hay nodos visibles</strong><p>El alcance de tu cuenta no contiene nodos configurables.</p></div>`;
  const content = byId("content");
  content.innerHTML = `<section id="relnet-routing-egress" class="routing-shell"><article class="section-block"><header class="section-header"><div><h3>Gateways de Internet</h3><p class="section-description">La identidad técnica permanece fija; la UI muestra el nombre público sin enviarlo al API.</p></div><span class="record-count">r${view.revision}</span></header><div class="routing-gateway-grid">${gatewayCards}</div>${routingHelpLinks([["Policies","policies"],["Capacidades","capabilities"],["Exit nodes","exit_nodes"]])}</article><article class="section-block"><header class="section-header"><div><h3>Salida por nodo</h3><p class="section-description">Red local es el valor seguro predeterminado. RelNet muestra por separado lo deseado y lo aplicado.</p></div><span class="record-count">${nodes.length}</span></header><div class="routing-node-grid">${nodeCards}</div></article></section>`;
  content.querySelectorAll("[data-routing-gateway]").forEach((button) => button.addEventListener("click", async () => {
    button.disabled = true;
    try {
      const result = await executeRelnetRoutingAction("gateway_set", { gateway_id: button.dataset.routingGateway, node_id: button.dataset.routingNode || null, enabled: button.dataset.routingEnabled === "true" });
      renderActionResult(result); toast("Gateway actualizado."); await loadModule(activeModule, { quiet: true });
    } catch (error) { toast(error.message, "error"); } finally { button.disabled = false; }
  }));
  content.querySelectorAll("[data-routing-node-card]").forEach((card) => card.querySelector("[data-routing-apply]")?.addEventListener("click", async (event) => {
    const button = event.currentTarget; button.disabled = true;
    try {
      const selection = card.querySelector("[data-routing-mode]").value;
      const parameters = routeSelectPayload({ nodeId: card.dataset.routingNodeCard, mode: selection === "local" ? "local" : "relnet", gatewayId: selection === "local" ? "" : selection, fallback: card.querySelector("[data-routing-fallback]").checked });
      const result = await executeRelnetRoutingAction("route_select", parameters);
      renderActionResult(result); toast("Preferencia de salida actualizada."); await loadModule(activeModule, { quiet: true });
    } catch (error) { toast(error.message, "error"); } finally { button.disabled = false; }
  }));
  return true;
}

function renderRelnetSubnets(payload) {
  if (surface !== "console" || activeModule !== "relnet_subnets") return false;
  const routing = relnetRoutingPayload(payload);
  const view = routingViewModel(routing);
  const nodes = relnetSections(payload).nodes.filter((node) => node.node_role !== "controller" && node.state !== "revoked" && (node.capabilities || []).includes("relnet.subnet"));
  const canManage = relnetRoutingCanManage();
  const activeGateways = view.gateways.filter((gateway) => String(gateway.state || "") === "active");
  const gatewayOptions = activeGateways.map((gateway) => `<option value="${escapeHtml(gateway.gateway_id)}">${escapeHtml(gatewayDisplay(gateway))}</option>`).join("");
  const nodeOptions = nodes.map((node) => `<option value="${escapeHtml(node.node_id)}">${escapeHtml(node.name || node.node_id)} · ${escapeHtml(node.virtual_ip || "sin IP")}</option>`).join("");
  const subnetPrefs = new Map((routing.preferences || []).filter((item) => item.destination_kind === "subnet").map((item) => [`${item.node_id}:${item.destination_id}`, item]));
  const advertisements = view.advertisements.length ? view.advertisements.map((item) => {
    const gateway = view.gateways.find((candidate) => candidate.gateway_id === item.gateway_id);
    const gatewayActive = String(gateway?.state || "") === "active";
    const disabled = !canManage || !gatewayActive || !nodes.length;
    const explanation = !gatewayActive ? "El gateway de esta subred no está activo; no se puede seleccionar para nuevos nodos." : (!nodes.length ? "No hay nodos con capacidad relnet.subnet dentro de tu alcance." : "El anuncio permanece visible aunque ningún nodo lo use.");
    return `<article class="routing-subnet-card" data-subnet-id="${escapeHtml(item.advertisement_id)}" data-subnet-gateway="${escapeHtml(item.gateway_id)}"><header><div><strong>${escapeHtml(item.name || item.cidr)}</strong><small>${escapeHtml(item.cidr)} · ${escapeHtml(gatewayDisplay(gateway))}</small></div><span class="status-chip ${item.state === "active" ? "ok" : "warn"}">${escapeHtml(item.state || "unknown")}</span></header><div class="routing-state-pair"><div><span>Deseado</span><strong>r${Number(item.desired_revision || 0)}</strong></div><div><span>Aplicado</span><strong>r${Number(item.applied_revision || 0)}</strong></div></div><p class="routing-explanation">${escapeHtml(explanation)}</p>${canManage ? `<div class="guided-grid"><label class="field">Nodo<select data-subnet-node ${disabled ? "disabled" : ""}>${nodeOptions}</select></label><label class="field">Uso<select data-subnet-mode ${disabled ? "disabled" : ""}><option value="relnet">Usar vía RelNet</option><option value="local">Red local</option></select></label></div><div class="routing-subnet-actions"><button type="button" class="button primary" data-subnet-apply ${disabled ? "disabled" : ""}>Aplicar al nodo</button><button type="button" class="button secondary" data-subnet-remove>Eliminar anuncio</button></div>` : ""}</article>`;
  }).join("") : `<div class="empty-state"><strong>No hay subredes anunciadas</strong><p>Anunciar una subred no cambia rutas de ningún nodo por sí mismo.</p></div>`;
  const content = byId("content");
  content.innerHTML = `<section id="relnet-routing-subnets" class="routing-shell"><article class="section-block"><header class="section-header"><div><h3>Anunciar subred</h3><p class="section-description">El anuncio y el uso por nodo son decisiones separadas.</p></div><span class="record-count">r${view.revision}</span></header>${canManage ? `<form id="relnet-subnet-advertise" class="routing-advertise-form"><label class="field">Gateway<select name="gateway_id" ${activeGateways.length ? "" : "disabled"}>${gatewayOptions}</select></label><label class="field">Nombre<input name="name" type="text" maxlength="120" required placeholder="Oficina"></label><label class="field">CIDR privada<input name="cidr" type="text" maxlength="64" required placeholder="192.168.50.0/24"></label><button class="button primary" type="submit" ${activeGateways.length ? "" : "disabled"}>Anunciar subred</button></form>` : `<p class="routing-explanation">Se requiere rol administrador para anunciar subredes.</p>`}${routingHelpLinks([["Subredes","subnets"],["Policies","policies"],["SSH","ssh"]])}</article><article class="section-block"><header class="section-header"><div><h3>Subredes disponibles</h3><p class="section-description">Cada nodo conserva Red local hasta que se seleccione explícitamente “Usar vía RelNet”.</p></div><span class="record-count">${view.advertisements.length}</span></header><div class="routing-node-grid">${advertisements}</div></article></section>`;
  content.querySelector("#relnet-subnet-advertise")?.addEventListener("submit", async (event) => {
    event.preventDefault(); const form = event.currentTarget; const button = form.querySelector("button[type=submit]"); button.disabled = true;
    try {
      const values = new FormData(form);
      const result = await executeRelnetRoutingAction("subnet_advertise", { gateway_id: values.get("gateway_id"), name: String(values.get("name") || "").trim(), cidr: String(values.get("cidr") || "").trim() });
      renderActionResult(result); toast("Subred anunciada; ningún nodo cambió de ruta automáticamente."); await loadModule(activeModule, { quiet: true });
    } catch (error) { toast(error.message, "error"); } finally { button.disabled = false; }
  });
  content.querySelectorAll("[data-subnet-id]").forEach((card) => {
    const updateExisting = () => {
      const nodeId = card.querySelector("[data-subnet-node]")?.value;
      const existing = subnetPrefs.get(`${nodeId}:${card.dataset.subnetId}`);
      const select = card.querySelector("[data-subnet-mode]");
      if (select) select.value = existing?.desired_mode === "relnet" ? "relnet" : "local";
    };
    card.querySelector("[data-subnet-node]")?.addEventListener("change", updateExisting); updateExisting();
    card.querySelector("[data-subnet-apply]")?.addEventListener("click", async (event) => {
      const button = event.currentTarget; button.disabled = true;
      try {
        const nodeId = card.querySelector("[data-subnet-node]").value;
        const mode = card.querySelector("[data-subnet-mode]").value;
        const result = await executeRelnetRoutingAction("route_select", { node_id: nodeId, destination_kind: "subnet", destination_id: card.dataset.subnetId, mode, gateway_id: mode === "relnet" ? card.dataset.subnetGateway : null, failure_policy: "block" });
        renderActionResult(result); toast("Preferencia de subred actualizada."); await loadModule(activeModule, { quiet: true });
      } catch (error) { toast(error.message, "error"); } finally { button.disabled = false; }
    });
    card.querySelector("[data-subnet-remove]")?.addEventListener("click", async (event) => {
      const button = event.currentTarget; button.disabled = true;
      try {
        const result = await executeRelnetRoutingAction("subnet_remove", { advertisement_id: card.dataset.subnetId });
        renderActionResult(result); toast("Anuncio de subred eliminado."); await loadModule(activeModule, { quiet: true });
      } catch (error) { toast(error.message, "error"); } finally { button.disabled = false; }
    });
  });
  return true;
}

function renderData(payload) {
  currentPayload = payload;
  if (backendModuleName() === "relnet") {
    const catalogs = relnetSections(payload);
    relnetNodeCatalog = catalogs.nodes;
    relnetAllNodeCatalog = catalogs.inventory;
    const commandsSection = (payload.sections || []).find((section) => section.operation === "commands" && Array.isArray(section.data?.items));
    relnetCommandCatalog = commandsSection?.data?.items || [];
  }
  const specification = modules[activeModule] || {};
  const visibleOperations = Array.isArray(specification.sections) ? new Set(specification.sections) : null;
  const visibleSections = visibleOperations ? payload.sections.filter((section) => visibleOperations.has(String(section.operation || ""))) : payload.sections;
  const visiblePayload = { ...payload, sections: visibleSections };
  const customRoutingRendered = renderRelnetEgress(payload) || renderRelnetSubnets(payload);
  if (!customRoutingRendered) byId("content").innerHTML = visibleSections.map((section, index) => renderSection(section, index)).join("");
  byId("content").setAttribute("aria-busy", "false");
  const hasRows = Boolean(byId("content").querySelector(".record-row"));
  byId("search-field").hidden = !hasRows;
  byId("table-filter").value = tableFilterTerm;
  if (!specification.hideSummary) renderSummary(visiblePayload);
  else byId("summary").innerHTML = "";
  renderRelnetTerminal(payload);
  renderRelnetMobileNodes(payload);
  renderRelShareConnections(payload);
  const now = new Intl.DateTimeFormat("es-MX", { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date());
  byId("last-updated").textContent = `Actualizado ${now}`;
}

function loadingMarkup() {
  return '<div class="loading-state" aria-label="Cargando"><div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div></div>';
}

function renderNavigation() {
  const groups = [...new Set(Object.values(modules).map((module) => module.group))];
  const navigation = byId("navigation");
  for (const group of groups) {
    const wrapper = document.createElement("section");
    wrapper.className = "nav-group";
    const heading = document.createElement("span");
    heading.className = "nav-group-label";
    heading.textContent = group;
    wrapper.append(heading);
    for (const [name, specification] of Object.entries(modules).filter(([, module]) => module.group === group)) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "nav-button";
      button.dataset.module = name;
      button.setAttribute("aria-current", name === activeModule ? "page" : "false");
      const label = document.createElement("span");
      label.textContent = specification.short;
      button.append(label);
      button.addEventListener("click", () => loadModule(name));
      wrapper.append(button);
    }
    navigation.append(wrapper);
  }
  if (surface === "console") renderMobileConsoleNavigation();
}

function mobileScrollTo(selector) {
  window.requestAnimationFrame(() => document.querySelector(selector)?.scrollIntoView({ behavior: "smooth", block: "start" }));
}

async function mobileLoadModule(name, selector) {
  if (activeModule !== name) await loadModule(name);
  if (selector) mobileScrollTo(selector);
}

function renderMobileConsoleNavigation() {
  if (byId("console-mobile-nav")) return;
  const nav = document.createElement("nav");
  nav.id = "console-mobile-nav"; nav.className = "console-mobile-nav"; nav.setAttribute("aria-label", "Accesos rápidos RelNet");
  const items = [["Red","relnet_network","#main-content","⌂"],["Internet","relnet_egress","#relnet-routing-egress","⇄"],["Nodos","relnet_nodes","#main-content","◫"],["Terminal","relnet_terminal","#relnet-terminal-panel",">_"],["RelDrop","relnet_drop","#action-panel","↗"]];
  for (const [label,moduleName,selector,icon] of items) {
    const button=document.createElement("button"); button.type="button"; button.className="console-mobile-nav-button"; button.dataset.mobileModule=moduleName;
    button.innerHTML=`<span aria-hidden="true">${icon}</span><small>${label}</small>`;
    button.addEventListener("click",async()=>{ await mobileLoadModule(moduleName,selector); });
    nav.append(button);
  }
  document.body.append(nav);
}

function updateMobileConsoleNavigation() {
  if (surface !== "console") return;
  document.querySelectorAll(".console-mobile-nav-button").forEach((button)=>button.classList.toggle("active",button.dataset.mobileModule===activeModule));
}

async function focusRelnetAction(operation, nodeId = "") {
  const targetModule = ({ dispatch: "relnet_execute", drop_send: "relnet_drop", share_create: "relnet_share", share_remove: "relnet_share", terminal_create: "relnet_terminal" })[operation] || "relnet_manage";
  if (activeModule !== targetModule) await loadModule(targetModule);
  const select=byId("operation");
  if (select && [...select.options].some((option)=>option.value===operation)) {
    select.value=operation; renderGuidedFields();
    if(nodeId){const nodeField=byId("guided-node_id");if(nodeField){nodeField.value=nodeId;nodeField.dispatchEvent(new Event("change"));}}
    mobileScrollTo("#action-panel");
  }
}

function actionLabel(operation) { return operationCopy[operation]?.[0] || titleFor(operation); }
function actionDescription(operation) { return operationCopy[operation]?.[1] || "Ejecuta una operación permitida con los parámetros indicados."; }

function renderGuidedFields() {
  const operation = byId("operation").value;
  const key = `${backendModuleName()}.${operation}`;
  const definitions = operationFields[key] || [];
  const context = byId("operation-context");
  const impact = highImpact.has(operation) ? "Alto impacto" : "Operación controlada";
  context.innerHTML = `<strong><span>${escapeHtml(actionLabel(operation))}</span><span class="status-chip ${highImpact.has(operation) ? "bad" : "neutral"}">${impact}</span></strong><p>${escapeHtml(actionDescription(operation))}</p>`;
  const container = byId("guided-fields");
  container.replaceChildren();
  for (const definition of definitions) {
    const id = `guided-${definition.name}`;
    if (definition.type === "checkbox") {
      const label = document.createElement("label");
      label.className = "checkbox-field";
      const input = document.createElement("input");
      input.type = "checkbox";
      input.id = id;
      input.dataset.parameter = definition.name;
      input.checked = Boolean(definition.value);
      label.append(input, document.createTextNode(definition.label));
      container.append(label);
      continue;
    }
    const label = document.createElement("label");
    label.className = "field";
    label.htmlFor = id;
    label.append(document.createTextNode(definition.label));
    let input;
    if (definition.type === "textarea") input = document.createElement("textarea");
    else if (definition.type === "node-select") {
      input = document.createElement("select");
      const sourceCatalog = Array.isArray(definition.states) ? relnetAllNodeCatalog : relnetNodeCatalog;
      const allowedStates = new Set(definition.states || []);
      const nodes = sourceCatalog.filter((node) => node.node_role !== "controller" && (!allowedStates.size ? node.state !== "revoked" : allowedStates.has(String(node.state || ""))) && (!definition.capability || (node.capabilities || []).includes(definition.capability)));
      if (!definition.required) {
        const blank = document.createElement("option"); blank.value = ""; blank.textContent = "Todos los nodos compatibles"; input.append(blank);
      }
      if (!nodes.length) {
        const option = document.createElement("option"); option.value = ""; option.textContent = "No hay nodos disponibles"; option.disabled = true; input.append(option);
      }
      for (const node of nodes) {
        const option = document.createElement("option");
        option.value = node.node_id;
        const state = node.effective_state || node.state || "unknown";
        option.textContent = `${node.name || node.node_id} · ${node.os_family || "nodo"} · ${state} · ${node.virtual_ip || "sin IP"}`;
        input.append(option);
      }
    }
    else if (definition.type === "command-select") {
      input = document.createElement("select");
      const commands = relnetCommandCatalog.filter((command) => ["queued", "claimed"].includes(String(command.state || "")));
      if (!commands.length) {
        const option = document.createElement("option"); option.value = ""; option.textContent = "No hay comandos activos"; option.disabled = true; input.append(option);
      }
      for (const command of commands) {
        const option = document.createElement("option"); option.value = command.command_id;
        const node = relnetNodeCatalog.find((item) => item.node_id === command.node_id);
        option.textContent = `${node?.name || command.node_id} · ${command.capability || "comando"}/${command.operation || ""} · ${command.state || ""}`;
        input.append(option);
      }
    }
    else if (definition.type === "select") {
      input = document.createElement("select");
      for (const optionValue of definition.options || []) {
        const option = document.createElement("option");
        option.value = optionValue;
        option.textContent = titleFor(optionValue);
        input.append(option);
      }
    } else input = document.createElement("input");
    if (definition.type === "file") { input.type = "file"; if (definition.multiple) input.multiple = true; }
    input.id = id;
    input.dataset.parameter = definition.name;
    input.dataset.valueType = definition.type;
    if (definition.type === "json") {
      input = document.createElement("textarea");
      input.id = id;
      input.dataset.parameter = definition.name;
      input.dataset.valueType = "json";
      input.rows = 3;
      input.value = JSON.stringify(definition.value ?? [], null, 2);
    } else {
      if (!["select", "textarea", "node-select", "command-select", "file"].includes(definition.type)) input.type = definition.type;
      if (definition.value !== undefined) input.value = definition.value;
    }
    if (definition.required) input.required = true;
    if (definition.placeholder) input.placeholder = definition.placeholder;
    if (definition.min !== undefined) input.min = definition.min;
    if (definition.max !== undefined) input.max = definition.max;
    label.append(input);
    container.append(label);
  }
  byId("parameters").value = "{}";
  if (backendModuleName() === "relnet" && operation === "dispatch") wireTypedDispatchControls();
}

function wireTypedDispatchControls() {
  const nodeSelect = byId("guided-node_id");
  const capabilitySelect = byId("guided-capability");
  const operationSelect = byId("guided-command_operation");
  const parametersField = byId("guided-command_parameters");
  if (!nodeSelect || !capabilitySelect || !operationSelect || !parametersField) return;
  const updateTemplate = () => {
    const key = `${capabilitySelect.value}.${operationSelect.value}`;
    parametersField.value = JSON.stringify(typedParameterTemplates[key] ?? {}, null, 2);
  };
  const updateOperations = () => {
    const operations = typedOperationsByCapability[capabilitySelect.value] || [];
    operationSelect.replaceChildren(...operations.map((value) => {
      const option = document.createElement("option"); option.value = value; option.textContent = titleFor(value); return option;
    }));
    updateTemplate();
  };
  const updateCapabilities = () => {
    const node = relnetNodeCatalog.find((item) => item.node_id === nodeSelect.value);
    const capabilities = (node?.capabilities || []).filter((capability) => typedOperationsByCapability[capability]);
    capabilitySelect.replaceChildren(...capabilities.map((value) => {
      const option = document.createElement("option"); option.value = value; option.textContent = value; return option;
    }));
    capabilitySelect.disabled = !capabilities.length;
    operationSelect.disabled = !capabilities.length;
    if (capabilities.length) updateOperations();
    else parametersField.value = "{}";
  };
  nodeSelect.addEventListener("change", updateCapabilities);
  capabilitySelect.addEventListener("change", updateOperations);
  operationSelect.addEventListener("change", updateTemplate);
  updateCapabilities();
}

function actionParameters() {
  let parameters;
  try { parameters = JSON.parse(byId("parameters").value || "{}"); }
  catch { throw new Error("Los parámetros avanzados no contienen JSON válido."); }
  if (!parameters || Array.isArray(parameters) || typeof parameters !== "object") throw new Error("Los parámetros avanzados deben ser un objeto JSON.");
  for (const input of byId("guided-fields").querySelectorAll("[data-parameter]")) {
    const key = input.dataset.parameter;
    if (input.type === "file") continue;
    if (input.type === "checkbox") { parameters[key] = input.checked; continue; }
    if (input.value === "" && !input.required) continue;
    if (input.dataset.valueType === "number") parameters[key] = Number(input.value);
    else if (input.dataset.valueType === "json") {
      try { parameters[key] = JSON.parse(input.value); }
      catch { throw new Error(`${input.previousSibling?.textContent || key} no contiene JSON válido.`); }
    } else parameters[key] = input.value;
  }
  return parameters;
}

function setActionState(busy) {
  byId("action-submit").disabled = busy;
  byId("action-submit").textContent = busy ? "Procesando…" : "Revisar y ejecutar";
}

function trustedCapability(value) {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value, location.origin);
    return url.origin === location.origin && /^\/auth\/(browser-access|admin|session)\/[A-Za-z0-9_-]+/.test(url.pathname) && !url.search && !url.hash;
  } catch { return false; }
}

function guidanceForResult(result) {
  const detail = String(result?.detail || result?.error || "");
  if (/browser session required/i.test(detail)) return { tone: "warn", text: "Esta operación necesita una sesión de Browser administrado activa. Abre Navegadores → Browser administrado, crea o reutiliza una sesión y después reintenta." };
  if (/did not authorize interactive terminal access|did not authorize interactive terminals/i.test(detail)) return { tone: "error", text: "El nodo está en línea, pero no anunció la capacidad terminal requerida. Actualiza o vuelve a registrar el agente con terminal.powershell/terminal.shell y aprueba de nuevo sus capacidades." };
  if (result?.status === "pending" && result?.approval_id && result?.authorization_url) return { tone: "warn", text: "La operación está preparada. Abre la autorización; este panel detectará la aprobación y continuará automáticamente con la ejecución." };
  if (result?.status === "approved") return { tone: "info", text: "Autorización recibida. Preparando la ejecución del comando aprobado…" };
  return null;
}

function renderActionResult(result, isError = false) {
  if (actionDownloadUrl) { URL.revokeObjectURL(actionDownloadUrl); actionDownloadUrl = undefined; }
  byId("action-output").hidden = false;
  const status = typeof result?.status === "string" ? result.status : isError ? "error" : "completed";
  byId("result-status").className = `status-chip ${isError ? "bad" : statusTone(status)}`;
  byId("result-status").textContent = formatScalar(status);
  const links = byId("action-links");
  links.replaceChildren();
  const guidance = byId("action-guidance");
  const guidanceSpec = guidanceForResult(result);
  if (guidanceSpec) {
    guidance.hidden = false;
    guidance.className = `action-guidance ${guidanceSpec.tone === "info" ? "" : guidanceSpec.tone}`;
    guidance.textContent = guidanceSpec.text;
  } else {
    guidance.hidden = true;
    guidance.textContent = "";
    guidance.className = "action-guidance";
  }
  for (const [key, value] of Object.entries(result || {})) {
    if (!trustedCapability(value)) continue;
    const link = document.createElement("a");
    link.className = "action-link";
    link.href = value;
    link.target = "_blank";
    link.rel = "noopener";
    link.textContent = key === "browser_ui_url" ? "Abrir Browser UI" : "Abrir autorización";
    const hint = document.createElement("span");
    hint.textContent = "Nueva pestaña";
    link.append(hint);
    links.append(link);
  }
  if (result?.encoding === "base64" && typeof result.content_base64 === "string") {
    const binary = atob(result.content_base64);
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    actionDownloadUrl = URL.createObjectURL(new Blob([bytes], { type: result.media_type || "application/octet-stream" }));
    const download = document.createElement("a");
    download.className = "action-link";
    download.href = actionDownloadUrl;
    download.download = result.filename || "artifact";
    download.textContent = `Descargar ${result.filename || "artifact"}`;
    links.append(download);
  }
  const safeResult = { ...(result || {}) };
  delete safeResult.content_base64;
  byId("action-result").textContent = JSON.stringify(safeResult, null, 2);
}

function toast(message, type = "info") {
  const element = document.createElement("div");
  element.className = `toast ${type === "error" ? "error" : ""}`;
  element.textContent = message;
  byId("toast-region").append(element);
  window.setTimeout(() => element.remove(), 5000);
}

function confirmationDialog(result, operation, parameters) {
  const dialog = byId("confirmation-dialog");
  byId("confirmation-summary").textContent = result.summary || "Esta operación requiere confirmación explícita antes de ejecutarse.";
  const resource = parameters.device_id || parameters.connection_id || parameters.session_id || parameters.runner_id || parameters.integration_id || parameters.release_id || parameters.path || modules[activeModule].label;
  byId("confirmation-details").innerHTML = `<div><span>Operación</span><strong>${escapeHtml(actionLabel(operation))}</strong></div><div><span>Recurso</span><strong>${escapeHtml(resource)}</strong></div><div><span>Autorización</span><strong>Un solo uso</strong></div>`;
  byId("confirmation-submit").textContent = highImpact.has(operation) ? "Confirmar operación sensible" : "Confirmar operación";
  dialog.showModal();
  return new Promise((resolve) => {
    const cancel = dialog.querySelector("[data-dialog-cancel]");
    cancel.onclick = () => { dialog.close(); resolve(false); };
    byId("confirmation-form").onsubmit = (event) => { event.preventDefault(); dialog.close(); resolve(true); };
    dialog.oncancel = () => resolve(false);
  });
}

async function waitForAdministratorApproval(approvalId, initialResult) {
  const parsedExpiry = initialResult?.expires_at ? new Date(initialResult.expires_at).getTime() : Number.NaN;
  const expiresAt = Number.isFinite(parsedExpiry) ? parsedExpiry : Date.now() + 7 * 60 * 1000;
  let last = initialResult;
  while (Date.now() < expiresAt + 1000) {
    await new Promise((resolve) => window.setTimeout(resolve, 900));
    last = await api(`${surfaceBase}/api/approvals/${encodeURIComponent(approvalId)}`);
    renderActionResult({ ...initialResult, ...last });
    if (last.status === "approved") return last;
    if (["denied", "expired", "consumed"].includes(last.status)) {
      throw new Error(`La autorización administrativa terminó con estado: ${last.status}.`);
    }
  }
  throw new Error("La autorización administrativa venció antes de poder ejecutarse.");
}

async function continueApprovedAdministratorCommand(initialResult) {
  const approvalId = initialResult?.approval_id;
  if (!approvalId || !trustedCapability(initialResult?.authorization_url)) return initialResult;
  toast("Esperando autorización administrativa…");
  await waitForAdministratorApproval(approvalId, initialResult);
  const executeApproved = () => api(`${surfaceBase}/api/approvals/${encodeURIComponent(approvalId)}/execute`, {
    method: "POST",
    body: "{}",
  });
  let executed;
  try {
    executed = await executeApproved();
  } catch (error) {
    if (error.status !== 428) throw error;
    await reauthenticate();
    executed = await executeApproved();
  }
  renderActionResult(executed);
  toast("Autorización recibida; el comando ya fue puesto en ejecución.");
  return executed;
}

async function submitRelDropAttachments() {
  const input = byId("guided-files");
  const destination = byId("guided-destination_node_id")?.value || "";
  const ttl = Number(byId("guided-ttl_seconds")?.value || 1800);
  const files = [...(input?.files || [])];
  if (!destination) throw new Error("Selecciona un nodo destino.");
  if (!files.length) throw new Error("Adjunta al menos un archivo.");
  if (files.length > 20) throw new Error("RelDrop admite hasta 20 archivos por envío.");
  const delivered = [];
  for (const file of files) {
    if (file.size > 2 * 1024 * 1024 * 1024) throw new Error(`${file.name} excede 2 GiB.`);
    const parameters = { destination_node_id: destination, filename: file.name, size_bytes: file.size, ttl_seconds: ttl };
    let prepared = await api(`${surfaceBase}/api/modules/relnet/actions`, { method: "POST", body: JSON.stringify({ operation: "mobile_drop_prepare", parameters }) });
    if (prepared.status === "confirmation_required" && prepared.confirmation_token) {
      const approved = await confirmationDialog(prepared, "drop_send", parameters);
      if (!approved) { toast("Operación cancelada; no se envió ningún archivo."); return prepared; }
      prepared = await api(`${surfaceBase}/api/modules/relnet/actions`, { method: "POST", body: JSON.stringify({ operation: "mobile_drop_prepare", parameters, confirmation_token: prepared.confirmation_token }) });
    }
    if (!prepared.transfer_id) throw new Error(`No se pudo preparar ${file.name}.`);
    const response = await fetch(`${surfaceBase}/api/relnet/mobile-drops/${encodeURIComponent(prepared.transfer_id)}/upload`, { method: "PUT", credentials: "same-origin", headers: { "X-CSRF-Token": session.csrf, "Content-Type": "application/octet-stream" }, body: file });
    let result = {}; try { result = await response.json(); } catch {}
    if (!response.ok) throw new Error(typeof result.detail === "string" ? result.detail : `Falló el envío de ${file.name}.`);
    delivered.push({ transfer_id: prepared.transfer_id, filename: file.name, state: result.state || prepared.state || "queued", size_bytes: file.size });
  }
  const result = { status: "success", destination_node_id: destination, destination_directory: "RelDrop", items: delivered };
  renderActionResult(result);
  const mobileReady=delivered.length>0 && delivered.every((item)=>item.state==="mobile_available");
  toast(mobileReady ? `${delivered.length} archivo(s) disponibles en “RelDrop recibido” del móvil.` : `RelNet guardó ${delivered.length} archivo(s); el nodo destino los moverá a su carpeta RelDrop al completar la descarga.`);
  await loadModule(activeModule, { quiet: true }); return result;
}

async function submitAction(confirmationToken, preparedParameters) {
  const operation = byId("operation").value;
  if (operation === "drop_send" && !confirmationToken && byId("guided-files")) return submitRelDropAttachments();
  const parameters = preparedParameters || actionParameters();
  const result = await api(`${surfaceBase}/api/modules/${backendModuleName()}/actions`, {
    method: "POST",
    body: JSON.stringify({ operation, parameters, ...(confirmationToken ? { confirmation_token: confirmationToken } : {}) }),
  });
  renderActionResult(result);
  if (result.status === "confirmation_required" && result.confirmation_token) {
    const approved = await confirmationDialog(result, operation, parameters);
    if (!approved) { toast("Operación cancelada; no se realizó ningún cambio."); return result; }
    return submitAction(result.confirmation_token, parameters);
  }
  if (result.status === "pending" && result.approval_id && result.authorization_url) {
    const executed = await continueApprovedAdministratorCommand(result);
    await loadModule(activeModule, { quiet: true });
    return executed;
  }
  toast(`${actionLabel(operation)} completada.`);
  await loadModule(activeModule, { quiet: true });
  return result;
}

function reauthenticate() {
  const dialog = byId("reauth-dialog");
  byId("reauth-totp-label").hidden = !session.mfa_configured;
  byId("reauth-error").hidden = true;
  byId("reauth-password").value = "";
  byId("reauth-totp").value = "";
  dialog.showModal();
  byId("reauth-password").focus();
  return new Promise((resolve, reject) => {
    dialog.querySelector("[data-dialog-cancel]").onclick = () => { dialog.close(); reject(new Error("Reautenticación cancelada.")); };
    dialog.oncancel = () => reject(new Error("Reautenticación cancelada."));
    byId("reauth-form").onsubmit = async (event) => {
      event.preventDefault();
      byId("reauth-submit").disabled = true;
      try {
        await api(`${surfaceBase}/api/reauthenticate`, { method: "POST", body: JSON.stringify({ password: byId("reauth-password").value, totp: byId("reauth-totp").value }) });
        dialog.close();
        toast("Identidad verificada.");
        resolve();
      } catch (error) {
        byId("reauth-error").textContent = error.message;
        byId("reauth-error").hidden = false;
      } finally { byId("reauth-submit").disabled = false; }
    };
  });
}

function clearRevealedSecret(secretId) {
  const timer = secretRevealTimers.get(secretId);
  if (timer) window.clearTimeout(timer);
  secretRevealTimers.delete(secretId);
  revealedSecrets.delete(secretId);
  if (activeModule === "secrets") renderSecrets(secretStorePayload);
}
function clearAllRevealedSecrets() {
  for (const timer of secretRevealTimers.values()) window.clearTimeout(timer);
  secretRevealTimers.clear();
  revealedSecrets.clear();
}
function secretItem(secretId) { return secretCatalog.find((item) => item.secret_id === secretId); }
function secretConfirmationParameters(operation, payload) {
  return { secret_id: payload.secret_id || undefined, key: payload.key || secretItem(payload.secret_id)?.key || undefined, name: payload.name || secretItem(payload.secret_id)?.name || undefined, change: operation === "rotate_value" ? "Value" : operation };
}
async function callSecretOperation(operation, payload, confirmationToken) {
  return api("/admin/api/secrets/execute", { method: "POST", body: JSON.stringify({ operation, ...payload, ...(confirmationToken ? { confirmation_token: confirmationToken } : {}) }) });
}
async function submitSecretOperation(operation, payload = {}, confirmationToken) {
  let result;
  try { result = await callSecretOperation(operation, payload, confirmationToken); }
  catch (error) { if (error.status !== 428) throw error; await reauthenticate(); result = await callSecretOperation(operation, payload, confirmationToken); }
  if (result.status === "confirmation_required" && result.confirmation_token) {
    const approved = await confirmationDialog(result, operation, secretConfirmationParameters(operation, payload));
    if (!approved) throw new Error("Operación cancelada.");
    return submitSecretOperation(operation, payload, result.confirmation_token);
  }
  if (operation === "reveal") {
    const secretId = String(result.secret_id || payload.secret_id || "");
    if (!secretId || typeof result.value !== "string") throw new Error("La respuesta de revelado no es válida.");
    revealedSecrets.set(secretId, result.value);
    const previous = secretRevealTimers.get(secretId); if (previous) window.clearTimeout(previous);
    secretRevealTimers.set(secretId, window.setTimeout(() => clearRevealedSecret(secretId), 30_000));
    renderSecrets(secretStorePayload); toast("Value revelado durante 30 segundos."); return result;
  }
  if ((operation === "rotate_value" || operation === "delete") && payload.secret_id) {
    const timer = secretRevealTimers.get(payload.secret_id); if (timer) window.clearTimeout(timer);
    secretRevealTimers.delete(payload.secret_id); revealedSecrets.delete(payload.secret_id);
  }
  await loadSecrets({ quiet: true });
  toast(operation === "delete" ? "Secreto eliminado." : "Secreto actualizado."); return result;
}

function secretEditorDialog(operation, item = {}) {
  const dialog = document.createElement("dialog"); dialog.className = "secret-editor-dialog";
  const create = operation === "create", edit = operation === "update", rotate = operation === "rotate_value";
  const title = create ? "Añadir secreto" : edit ? "Editar secreto" : "Rotar valor";
  dialog.innerHTML = `<form method="dialog" class="secret-editor-form"><header><div><span class="eyebrow">Secret Store</span><h3>${title}</h3></div><button type="button" class="button secondary compact" data-secret-cancel>Cancelar</button></header>
    ${create || edit ? `<label class="field">Nombre del Secreto<input name="name" type="text" maxlength="200" required value="${escapeHtml(item.name || "")}" autocomplete="off"></label><label class="field">Key<input name="key" type="text" maxlength="128" required pattern="[A-Z][A-Z0-9_]{1,127}" value="${escapeHtml(item.key || "")}" autocomplete="off" spellcheck="false"></label>` : ""}
    ${create || rotate ? `<label class="field">Value<input name="value" type="password" maxlength="65536" required autocomplete="new-password"></label><p class="source-label">El Value se cifra antes de guardarse y no aparecerá en el listado.</p>` : ""}
    <div class="secret-editor-actions"><button type="submit" class="button primary">${create ? "Guardar secreto" : rotate ? "Rotar valor" : "Guardar cambios"}</button></div></form>`;
  document.body.append(dialog);
  dialog.querySelector("[data-secret-cancel]").addEventListener("click", () => dialog.close());
  dialog.addEventListener("close", () => dialog.remove(), { once: true });
  dialog.querySelector("form").addEventListener("submit", async (event) => {
    event.preventDefault(); const form = event.currentTarget; const button = form.querySelector("button[type=submit]"); button.disabled = true;
    try {
      const data = new FormData(form), payload = {};
      if (!create) payload.secret_id = item.secret_id;
      if (create || edit) { payload.name = String(data.get("name") || "").trim(); payload.key = String(data.get("key") || "").trim().toUpperCase(); }
      if (create || rotate) payload.value = String(data.get("value") || "");
      await submitSecretOperation(operation, payload); dialog.close();
    } catch (error) { toast(error.message, "error"); button.disabled = false; }
  });
  dialog.showModal(); dialog.querySelector("input")?.focus();
}
async function copyRevealedSecret(secretId) {
  const value = revealedSecrets.get(secretId);
  if (typeof value !== "string") throw new Error("Revela el Value antes de copiarlo.");
  await navigator.clipboard.writeText(value); toast("Value copiado al portapapeles.");
}

function renderSecrets(payload) {
  secretStorePayload = { items: Array.isArray(payload?.items) ? payload.items : [], crypto_ready: Boolean(payload?.crypto_ready), values_exposed: false };
  secretCatalog = secretStorePayload.items;
  byId("summary").hidden = false;
  byId("summary").innerHTML = [metricCard("Secretos", secretCatalog.filter((item) => item.source === "canonical").length, "Entradas canónicas", "ok"), metricCard("Cifrado", secretStorePayload.crypto_ready ? "Listo" : "No disponible", "AES-256-GCM", secretStorePayload.crypto_ready ? "ok" : "bad"), metricCard("Values", "Protegidos", "Ocultos por defecto", "ok"), metricCard("Heredados", secretCatalog.filter((item) => item.source === "legacy").length, "Solo lectura", "neutral")].join("");
  const rows = secretCatalog.map((item) => {
    const canonical = item.source === "canonical" && item.secret_id;
    const revealed = canonical ? revealedSecrets.get(item.secret_id) : undefined;
    const value = typeof revealed === "string" ? revealed : (item.value_masked || "••••••••");
    const actions = canonical ? `<div class="secret-actions"><button class="button secondary compact" type="button" data-secret-action="update" data-secret-id="${escapeHtml(item.secret_id)}">Editar</button><button class="button secondary compact" type="button" data-secret-action="reveal" data-secret-id="${escapeHtml(item.secret_id)}">Revelar</button>${typeof revealed === "string" ? `<button class="button secondary compact" type="button" data-secret-action="copy" data-secret-id="${escapeHtml(item.secret_id)}">Copiar</button>` : ""}<button class="button secondary compact" type="button" data-secret-action="rotate_value" data-secret-id="${escapeHtml(item.secret_id)}">Rotar valor</button><button class="button danger compact" type="button" data-secret-action="delete" data-secret-id="${escapeHtml(item.secret_id)}">Eliminar</button></div>` : '<span class="status-chip neutral">Heredado · solo lectura</span>';
    return `<tr><td><strong>${escapeHtml(item.name || item.key)}</strong></td><td><code>${escapeHtml(item.key)}</code></td><td><code class="secret-value ${typeof revealed === "string" ? "revealed" : "masked"}">${escapeHtml(value)}</code></td><td>${actions}</td></tr>`;
  }).join("");
  byId("content").setAttribute("aria-busy", "false");
  byId("content").innerHTML = `<article class="section-block secrets-shell"><header class="section-header"><div><h3>Secretos</h3><p class="section-description">Los Values permanecen cifrados y se revelan solo temporalmente tras reautenticación y confirmación.</p></div><button type="button" class="button primary" data-secret-add ${secretStorePayload.crypto_ready ? "" : "disabled"}>Añadir secreto</button></header><div class="table-wrap"><table class="data-table secrets-table"><thead><tr><th>Nombre del Secreto</th><th>Key</th><th>Value</th><th>Acciones</th></tr></thead><tbody>${rows || '<tr><td colspan="4"><div class="empty-state"><strong>No hay secretos canónicos.</strong><p>Añade el primero para usar referencias secret://KEY.</p></div></td></tr>'}</tbody></table></div></article>`;
  byId("content").querySelector("[data-secret-add]")?.addEventListener("click", () => secretEditorDialog("create"));
  byId("content").querySelectorAll("[data-secret-action]").forEach((button) => button.addEventListener("click", async () => {
    const item = secretItem(button.dataset.secretId); if (!item) return; button.disabled = true;
    try { if (button.dataset.secretAction === "update") secretEditorDialog("update", item); else if (button.dataset.secretAction === "rotate_value") secretEditorDialog("rotate_value", item); else if (button.dataset.secretAction === "reveal") await submitSecretOperation("reveal", { secret_id: item.secret_id }); else if (button.dataset.secretAction === "copy") await copyRevealedSecret(item.secret_id); else if (button.dataset.secretAction === "delete") await submitSecretOperation("delete", { secret_id: item.secret_id }); }
    catch (error) { toast(error.message, "error"); } finally { if (button.isConnected) button.disabled = false; }
  }));
}
async function loadSecrets(options = {}) {
  if (!options.quiet) byId("content").innerHTML = loadingMarkup();
  const payload = await api("/admin/api/secrets/query");
  currentPayload = { sections: [] };
  renderSecrets(payload);
}

async function loadModule(name, options = {}) {
  if (activeModule === "secrets" && name !== "secrets") clearAllRevealedSecrets();
  activeModule = name;
  updateMobileConsoleNavigation();
  if (surface === "console" && history.replaceState) {
    const url = new URL(location.href); url.searchParams.set("module", name); history.replaceState({}, "", url);
  }
  const specification = modules[name];
  document.querySelectorAll(".nav-button").forEach((button) => {
    const active = button.dataset.module === name;
    button.classList.toggle("active", active);
    button.setAttribute("aria-current", active ? "page" : "false");
  });
  byId("section-name").textContent = specification.group;
  byId("title").textContent = specification.label;
  byId("panel-title").textContent = specification.label;
  byId("module-description").textContent = specification.description;
  byId("module-state").textContent = "En vivo";
  byId("content").setAttribute("aria-busy", "true");
  if (!options.quiet) byId("content").innerHTML = loadingMarkup();
  byId("search-field").hidden = true;
  const operations = specification.actions;
  const actionOnly = Boolean(specification.actionOnly);
  const dataPanel = document.querySelector(".data-panel");
  if (dataPanel) dataPanel.hidden = actionOnly;
  byId("summary").hidden = Boolean(specification.hideSummary);
  byId("action-panel").hidden = !operations.length;
  byId("module-layout").classList.toggle("single", !operations.length || actionOnly);
  byId("module-layout").classList.toggle("action-only", actionOnly);
  byId("operation").replaceChildren(...operations.map((operation) => {
    const option = document.createElement("option");
    option.value = operation;
    option.textContent = actionLabel(operation);
    return option;
  }));
  try {
    if (surface === "admin" && name === "secrets") { await loadSecrets(options); return; }
    const payload = await api(`${surfaceBase}/api/modules/${backendModuleName(name)}`);
    renderData(payload);
    if (operations.length) { renderGuidedFields(); }
  } catch (error) {
    byId("content").setAttribute("aria-busy", "false");
    byId("content").innerHTML = `<div class="error-state"><strong>No fue posible cargar este módulo.</strong><p>${escapeHtml(error.message)}</p></div>`;
    byId("module-state").textContent = "Error";
    toast(error.message, "error");
  }
}

function renderRelShareConnections(payload) {
  if (surface !== "console" || activeModule !== "relnet_share") return;
  const nodes = relnetSections(payload).nodes.filter((node) => node.node_role !== "controller" && node.state !== "revoked" && (node.capabilities || []).includes("relnet.share"));
  const article=document.createElement("article"); article.className="section-block relnet-share-connections";
  article.innerHTML=`<header class="section-header"><div><h3>Conectar a RelShare</h3><small class="source-label">Carpeta fija del usuario en cada nodo</small></div><span class="record-count">${nodes.length}</span></header><div class="relnet-node-card-list"></div>`;
  const list=article.querySelector(".relnet-node-card-list");
  for(const node of nodes){
    const ip=node.virtual_ip||node.tailscale_ip||""; if(!ip) continue;
    const smb=`smb://${ip}/RelShare`; const unc=`\\\\${ip}\\RelShare`;
    const card=document.createElement("div"); card.className="relnet-node-card";
    card.innerHTML=`<div class="relnet-node-card-head"><div><strong>${escapeHtml(node.name||node.node_id)}</strong><small>${escapeHtml(node.os_family||"Nodo RelNet")}</small></div><span class="status-chip ${statusTone(node.effective_state||node.state)}">${escapeHtml(formatScalar(node.effective_state||node.state))}</span></div><div class="relnet-node-meta"><code>${escapeHtml(smb)}</code><code>${escapeHtml(unc)}</code></div><p class="source-label">iPhone/iPad: Archivos → Conectar al servidor → ${escapeHtml(smb)}</p>`;
    list.append(card);
  }
  byId("content").prepend(article);
}

async function downloadRelNetMobileProfile(nodeID) {
  const response=await fetch(`${surfaceBase}/api/relnet/mobile/nodes/${encodeURIComponent(nodeID)}/profile`,{method:'POST',credentials:'same-origin',headers:{'X-CSRF-Token':session.csrf}});
  if(!response.ok){let detail='No fue posible generar el perfil VPN.';try{const payload=await response.json();detail=payload.detail||detail;}catch{}throw new Error(detail);}
  const ticket=await response.json();
  if(!ticket.download_url||!String(ticket.download_url).startsWith('/console/api/relnet/mobile/profile-download/'))throw new Error('RelNet no emitió un enlace de instalación válido.');
  toast('Perfil descargado. En Ajustes, abre Perfil descargado y pulsa Instalar.');
  window.location.assign(ticket.download_url);
}

function renderRelnetMobileSetup(payload) {
  if (surface !== "console" || activeModule !== "relnet_nodes") return;
  const mobileNodes=relnetSections(payload).nodes.filter((node)=>node.node_role==="mobile" && node.state!=="revoked");
  const article=document.createElement("article"); article.className="section-block relnet-mobile-setup"; article.id="relnet-mobile-setup";
  article.innerHTML=`<header class="section-header"><div><h3>RelNet Mobile v1</h3><small class="source-label">IKEv2 · RelDrop · RelShare</small></div><span class="record-count">${mobileNodes.length}</span></header>
  <div class="guided-grid"><label>Nombre del dispositivo<input id="relnet-mobile-name" type="text" maxlength="120" value="iPhone" autocomplete="off"></label><label>Plataforma<select id="relnet-mobile-platform"><option value="ios">iPhone / iOS</option><option value="ipados">iPad / iPadOS</option></select></label></div>
  <p class="source-label">Safari abrirá una descarga segura de un solo uso. Después ve a Ajustes → Perfil descargado → Instalar y regresa a RelNet Console.</p>
  <div class="relnet-node-actions"><button class="button primary" type="button" id="relnet-mobile-enroll">Configurar este iPhone</button></div><div class="relnet-node-card-list" id="relnet-mobile-device-list"></div>`;
  article.querySelector('#relnet-mobile-enroll')?.addEventListener('click',async()=>{
    const button=article.querySelector('#relnet-mobile-enroll'); const name=article.querySelector('#relnet-mobile-name').value.trim(); const platform=article.querySelector('#relnet-mobile-platform').value;
    if(!name){toast('Escribe un nombre para el dispositivo.','error');return;}
    button.disabled=true;
    try{
      const device=await api(`${surfaceBase}/api/relnet/mobile/enroll`,{method:'POST',body:JSON.stringify({device_name:name,platform})});
      const token=String(device.shortcut_token||'');
      const shortcutUrl=`${location.origin}/relnet/v1/mobile/shortcuts/${encodeURIComponent(device.node_id)}/send`;
      const setup=document.createElement('div');setup.className='relnet-node-card';
      setup.innerHTML=`<strong>Credencial móvil creada</strong><p class="source-label">El Mobile Token se muestra una sola vez. Guárdalo en el llavero de RelNet o como variable segura en Atajos.</p><div class="relnet-mobile-credentials"><div class="relnet-mobile-credential"><span>Node ID</span><code>${escapeHtml(device.node_id)}</code></div><div class="relnet-mobile-credential"><span>Mobile Token</span><code data-mobile-token>${escapeHtml(token)}</code></div><div class="relnet-mobile-credential"><span>Endpoint de Atajos (POST)</span><code data-mobile-shortcut-url>${escapeHtml(shortcutUrl)}</code></div></div><div class="relnet-node-actions"><button class="button secondary" type="button" data-copy-token>Copiar token</button><button class="button secondary" type="button" data-copy-shortcut>Copiar endpoint</button><button class="button secondary" type="button" data-open-shortcut-guide>Abrir guía</button></div>`;
      setup.querySelector('[data-copy-token]')?.addEventListener('click',async()=>{await navigator.clipboard.writeText(token);toast('Mobile Token copiado.');});
      setup.querySelector('[data-copy-shortcut]')?.addEventListener('click',async()=>{await navigator.clipboard.writeText(shortcutUrl);toast('Endpoint de Atajos copiado.');});
      setup.querySelector('[data-open-shortcut-guide]')?.addEventListener('click',()=>{window.open(shortcutUrl,'_blank','noopener');});
      article.querySelector('#relnet-mobile-device-list').prepend(setup);
      toast(`Nodo móvil ${device.name||name} creado. Descargando perfil VPN…`);
      await downloadRelNetMobileProfile(device.node_id);
    }catch(error){toast(error.message,'error');}finally{button.disabled=false;}
  });
  const list=article.querySelector('#relnet-mobile-device-list');
  for(const node of mobileNodes){
    const card=document.createElement('div');card.className='relnet-node-card';
    card.innerHTML=`<div class="relnet-node-card-head"><div><strong>${escapeHtml(node.name||node.node_id)}</strong><small>${escapeHtml(node.virtual_ip||'10.77.240.x')} · IKEv2</small></div><span class="status-chip ${statusTone(node.effective_state||node.state)}">${escapeHtml(formatScalar(node.effective_state||node.state))}</span></div><div class="relnet-node-actions"><button class="button secondary" type="button" data-mobile-profile>Perfil VPN</button><button class="button secondary" type="button" data-mobile-inbox>RelDrop recibido</button></div><div class="mobile-inbox" hidden></div>`;
    card.querySelector('[data-mobile-profile]').addEventListener('click',async()=>{try{await downloadRelNetMobileProfile(node.node_id);}catch(error){toast(error.message,'error');}});
    card.querySelector('[data-mobile-inbox]').addEventListener('click',async()=>{
      const box=card.querySelector('.mobile-inbox');box.hidden=false;box.innerHTML='<p class="source-label">Cargando RelDrop…</p>';
      try{
        const inbox=await api(`${surfaceBase}/api/relnet/mobile/nodes/${encodeURIComponent(node.node_id)}/inbox`); const items=inbox.items||[];
        if(!items.length){box.innerHTML='<p class="source-label">No hay archivos pendientes.</p>';return;}
        box.replaceChildren(...items.map((item)=>{
          const row=document.createElement('div');row.className='relnet-node-actions';
          const label=document.createElement('span');label.textContent=`${item.filename} · ${formatBytes(item.size_bytes)}`;
          const download=document.createElement('button');download.type='button';download.className='button secondary';download.textContent='Descargar';
          download.addEventListener('click',async()=>{
            try{
              const link=await api(`${surfaceBase}/api/relnet/mobile/nodes/${encodeURIComponent(node.node_id)}/drops/${encodeURIComponent(item.transfer_id)}/link`,{method:'POST',body:'{}'});
              const a=document.createElement('a');a.href=link.download_path;a.download=item.filename||'RelDrop';document.body.append(a);a.click();a.remove();
              download.textContent='Confirmar recibido';download.onclick=async()=>{
                const response=await fetch(link.ack_path,{method:'POST',credentials:'same-origin'});if(!response.ok)throw new Error('No fue posible confirmar RelDrop.');toast('RelDrop confirmado; el archivo temporal fue eliminado.');row.remove();
              };
            }catch(error){toast(error.message,'error');}
          });
          row.append(label,download);return row;
        }));
      }catch(error){box.innerHTML=`<p class="error-state">${escapeHtml(error.message)}</p>`;}
    });
    list.append(card);
  }
  byId('content').prepend(article);
}

function renderRelnetMobileNodes(payload) {
  if (surface !== "console" || activeModule !== "relnet_nodes") return;
  const { nodes, controllers } = relnetSections(payload);
  if (!nodes.length && !controllers.length) return;
  const groups=[{title:"Controllers",items:controllers,controller:true},{title:"Nodos",items:nodes,controller:false}];
  for(const group of groups.filter((entry)=>entry.items.length).reverse()){
    const article=document.createElement("article");
    article.className="section-block relnet-mobile-nodes";
    article.id=group.controller?"relnet-mobile-controllers":"relnet-mobile-nodes";
    article.innerHTML=`<header class="section-header"><div><h3>${group.title}</h3><small class="source-label">${group.controller?'Plano de control':'Acceso rápido móvil'}</small></div><span class="record-count">${group.items.length}</span></header><div class="relnet-node-card-list"></div>`;
    const list=article.querySelector(".relnet-node-card-list");
    for(const node of group.items){
      const stateValue=node.effective_state||node.state||(node.online?"online":"offline");
      const terminalAvailable=!group.controller&&(node.terminal_available||(node.capabilities||[]).some((cap)=>String(cap).startsWith("terminal.")));
      const actions=group.controller?'':`<div class="relnet-node-actions"><button class="button secondary" type="button" data-node-action="dispatch">Acción</button>${terminalAvailable?'<button class="button primary" type="button" data-node-action="terminal">Terminal</button>':''}</div>`;
      const card=document.createElement("div"); card.className="relnet-node-card";
      card.innerHTML=`<div class="relnet-node-card-head"><div><strong>${escapeHtml(node.name||node.node_id)}</strong><small>${escapeHtml(node.os_family||"Nodo RelNet")} · ${escapeHtml(node.transport_mode||node.desired_transport||"auto")}</small></div><span class="status-chip ${statusTone(stateValue)}">${escapeHtml(formatScalar(stateValue))}</span></div><div class="relnet-node-meta"><span>${escapeHtml(node.virtual_ip||node.tailscale_ip||"IP automática")}</span><span>${group.controller?'control-plane':`v${escapeHtml(node.agent_version||"—")}`}</span></div>${actions}`;
      card.querySelector('[data-node-action="dispatch"]')?.addEventListener("click",()=>focusRelnetAction("dispatch",node.node_id));
      card.querySelector('[data-node-action="terminal"]')?.addEventListener("click",async()=>{await mobileLoadModule("relnet_terminal");const select=byId("relnet-terminal-node");if(select&&[...select.options].some((o)=>o.value===node.node_id))select.value=node.node_id;mobileScrollTo("#relnet-terminal-panel");});
      list.append(card);
    }
    byId("content").prepend(article);
  }
}

let relnetTerminalState = { sessionId: sessionStorage.getItem("relnet.terminalSessionId") || null, cursor: 0, timer: null, writeChain: Promise.resolve() };

function relnetSections(payload) {
  const sections = payload?.sections || [];
  const peerSection = sections.find((section) => section.operation === "peers" && Array.isArray(section.data?.items));
  const fullNodeSection = sections.find((section) => section.operation === "nodes" && Array.isArray(section.data?.items));
  const controllerSection = sections.find((section) => section.operation === "controllers" && Array.isArray(section.data?.items));
  const sessionSection = sections.find((section) => section.operation === "terminal_sessions" && Array.isArray(section.data?.items));
  return {
    nodes: peerSection?.data?.items || fullNodeSection?.data?.items?.filter((node) => node.state !== "revoked") || [],
    inventory: fullNodeSection?.data?.items || [],
    controllers: controllerSection?.data?.items || [],
    sessions: sessionSection?.data?.items || [],
  };
}

async function relnetTerminalAction(operation, parameters, confirmationToken) {
  const result = await api(`${surfaceBase}/api/modules/relnet/actions`, {
    method: 'POST',
    body: JSON.stringify({ operation, parameters, ...(confirmationToken ? { confirmation_token: confirmationToken } : {}) }),
  });
  if (result.status === 'confirmation_required' && result.confirmation_token) {
    const approved = await confirmationDialog(result, operation, parameters);
    if (!approved) throw new Error('Operación cancelada.');
    return relnetTerminalAction(operation, parameters, result.confirmation_token);
  }
  return result;
}

function terminalOutputText(value) {
  return String(value || '')
    .replace(/\x1b\][^\x07]*(?:\x07|\x1b\\)/g, '')
    .replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, '')
    .replace(/\r(?!\n)/g, '\n');
}

function stopRelnetTerminalPolling() {
  if (relnetTerminalState.timer) window.clearTimeout(relnetTerminalState.timer);
  relnetTerminalState.timer = null;
}

function updateTerminalStatus(session) {
  const status = byId('relnet-terminal-status');
  if (!status || !session) return;
  status.textContent = `${formatScalar(session.state)} · ${session.shell} · ${session.node_id}`;
  status.className = `status-chip ${statusTone(session.state)}`;
  if (['closed', 'failed', 'expired'].includes(session.state)) {
    stopRelnetTerminalPolling();
    sessionStorage.removeItem("relnet.terminalSessionId");
    relnetTerminalState.sessionId = null;
    const input = byId('relnet-terminal-input');
    if (input) input.disabled = true;
  }
}

async function pollRelnetTerminal() {
  stopRelnetTerminalPolling();
  const sessionId = relnetTerminalState.sessionId;
  if (!sessionId || activeModule !== 'relnet_terminal') return;
  try {
    const result = await relnetTerminalAction('terminal_read', {
      session_id: sessionId,
      after_event_id: relnetTerminalState.cursor,
      limit: 500,
    });
    relnetTerminalState.cursor = Number(result.next_event_id || relnetTerminalState.cursor);
    const output = byId('relnet-terminal-output');
    if (output) {
      for (const event of result.events || []) output.textContent += terminalOutputText(event.data);
      if ((result.events || []).length) output.scrollTop = output.scrollHeight;
    }
    updateTerminalStatus(result.session);
    if (!['closed', 'failed', 'expired'].includes(result.session?.state)) {
      relnetTerminalState.timer = window.setTimeout(pollRelnetTerminal, document.hidden ? 2200 : 400);
    }
  } catch (error) {
    const status = byId('relnet-terminal-status');
    if (status) { status.textContent = error.message; status.className = 'status-chip bad'; }
    relnetTerminalState.timer = window.setTimeout(pollRelnetTerminal, document.hidden ? 3000 : 1400);
  }
}

function queueTerminalInput(data) {
  if (!relnetTerminalState.sessionId || !data) return;
  relnetTerminalState.writeChain = relnetTerminalState.writeChain
    .then(() => relnetTerminalAction('terminal_write', {
      session_id: relnetTerminalState.sessionId, data,
    }))
    .catch((error) => toast(error.message, 'error'));
}

function calculateTerminalSize() {
  const output = byId('relnet-terminal-output');
  if (!output) return { cols: 120, rows: 32 };
  return {
    cols: Math.max(20, Math.min(300, Math.floor(output.clientWidth / 8.2))),
    rows: Math.max(5, Math.min(120, Math.floor(output.clientHeight / 18))),
  };
}

async function attachRelnetTerminal(sessionId, clearOutput = true) {
  relnetTerminalState.sessionId = sessionId;
  sessionStorage.setItem("relnet.terminalSessionId", sessionId);
  relnetTerminalState.cursor = 0;
  const output = byId('relnet-terminal-output');
  const input = byId('relnet-terminal-input');
  if (output && clearOutput) output.textContent = '';
  if (input) { input.disabled = false; input.focus(); }
  const size = calculateTerminalSize();
  await relnetTerminalAction('terminal_resize', { session_id: sessionId, ...size }).catch(() => undefined);
  pollRelnetTerminal();
}

function renderRelnetTerminal(payload) {
  stopRelnetTerminalPolling();
  if (activeModule !== 'relnet_terminal') return;
  const { nodes, sessions } = relnetSections(payload);
  const terminalNodes = nodes.filter((node) => node.terminal_available || (
    node.effective_state === 'online' && (node.capabilities || []).some((cap) => cap.startsWith('terminal.'))
  ));
  const resumable = sessions.filter((session) => ['queued', 'claimed', 'open', 'closing'].includes(session.state));
  const blockedNodes = nodes.filter((node) => node.effective_state === 'online' && !(node.capabilities || []).some((cap) => cap.startsWith('terminal.')));
  const article = document.createElement('article');
  article.className = 'section-block relnet-terminal-panel';
  article.id = 'relnet-terminal-panel';
  article.innerHTML = `
    <header class="section-header"><div><h3>Terminal interactiva</h3><small class="source-label">Sesión persistente RelNet 2.0</small></div><span id="relnet-terminal-status" class="status-chip neutral">Desconectada</span></header>
    ${!terminalNodes.length && blockedNodes.length ? `<div class="terminal-remediation"><strong>Terminal no autorizada en ${blockedNodes.length} nodo(s) en línea.</strong> ${blockedNodes.map((node) => `${escapeHtml(node.name || node.node_id)} <span class="terminal-meta">v${escapeHtml(node.agent_version || 'desconocida')}</span>`).join(', ')} no anuncia <code>terminal.powershell</code> o <code>terminal.shell</code>. Actualiza/re-registra el agente y vuelve a aprobar sus capacidades.</div>` : ''}
    <div class="terminal-toolbar">
      <label class="field">Nodo<select id="relnet-terminal-node">${terminalNodes.map((node) => `<option value="${escapeHtml(node.node_id)}" data-os="${escapeHtml(node.os_family)}">${escapeHtml(node.name)} · ${escapeHtml(node.os_family)} · v${escapeHtml(node.agent_version || '—')}</option>`).join('')}</select></label>
      <label class="field">Directorio inicial<input id="relnet-terminal-cwd" type="text" placeholder="Directorio predeterminado del usuario"></label>
      <button id="relnet-terminal-open" type="button" class="button primary" ${terminalNodes.length ? '' : 'disabled'}>Abrir terminal</button>
      <label class="field">Sesión existente<select id="relnet-terminal-resume"><option value="">Seleccionar…</option>${resumable.map((session) => `<option value="${escapeHtml(session.session_id)}">${escapeHtml(session.node_id)} · ${escapeHtml(session.state)}</option>`).join('')}</select></label>
      <button id="relnet-terminal-resume-button" class="button secondary" type="button">Reanudar</button>
    </div>
    <pre id="relnet-terminal-output" class="terminal-output" aria-live="polite"></pre>
    <label class="field terminal-input-field">Entrada de terminal<textarea id="relnet-terminal-input" rows="2" disabled spellcheck="false" autocomplete="off" placeholder="Haz clic aquí y escribe en la sesión"></textarea></label>
    <div class="terminal-controls"><button id="relnet-terminal-interrupt" class="button secondary" type="button" disabled>Ctrl+C</button><button id="relnet-terminal-close" class="button secondary" type="button" disabled>Cerrar sesión</button></div>`;
  byId('content').append(article);
  const rememberedSessionId = sessionStorage.getItem("relnet.terminalSessionId");
  const resumeSelect = byId('relnet-terminal-resume');
  if (rememberedSessionId && resumeSelect && [...resumeSelect.options].some((option) => option.value === rememberedSessionId)) resumeSelect.value = rememberedSessionId;
  const openButton = byId('relnet-terminal-open');
  openButton?.addEventListener('click', async () => {
    try {
      const select = byId('relnet-terminal-node');
      const option = select.options[select.selectedIndex];
      const os = option?.dataset.os;
      const size = calculateTerminalSize();
      const result = await relnetTerminalAction('terminal_create', {
        node_id: select.value,
        shell: os === 'windows' ? 'powershell' : 'shell',
        cwd: byId('relnet-terminal-cwd').value,
        ...size,
        ttl_seconds: 1800,
      });
      byId('relnet-terminal-interrupt').disabled = false;
      byId('relnet-terminal-close').disabled = false;
      await attachRelnetTerminal(result.session_id);
    } catch (error) { toast(error.message, 'error'); }
  });
  byId('relnet-terminal-resume-button')?.addEventListener('click', async () => {
    const sessionId = byId('relnet-terminal-resume').value;
    if (!sessionId) return;
    byId('relnet-terminal-interrupt').disabled = false;
    byId('relnet-terminal-close').disabled = false;
    await attachRelnetTerminal(sessionId);
  });
  const input = byId('relnet-terminal-input');
  input?.addEventListener('input', () => { const value = input.value; input.value = ''; queueTerminalInput(value); });
  input?.addEventListener('keydown', (event) => {
    const special = { Enter: '\r', Backspace: '\x7f', Tab: '\t', ArrowUp: '\x1b[A', ArrowDown: '\x1b[B', ArrowRight: '\x1b[C', ArrowLeft: '\x1b[D' };
    if (event.ctrlKey && event.key.toLowerCase() === 'c') {
      event.preventDefault();
      relnetTerminalAction('terminal_signal', { session_id: relnetTerminalState.sessionId, signal: 'INT' }).catch((error) => toast(error.message, 'error'));
    } else if (special[event.key]) {
      event.preventDefault(); queueTerminalInput(special[event.key]);
    }
  });
  byId('relnet-terminal-interrupt')?.addEventListener('click', () => relnetTerminalAction('terminal_signal', { session_id: relnetTerminalState.sessionId, signal: 'INT' }).catch((error) => toast(error.message, 'error')));
  byId('relnet-terminal-close')?.addEventListener('click', () => relnetTerminalAction('terminal_close', { session_id: relnetTerminalState.sessionId }).catch((error) => toast(error.message, 'error')));
}


async function initialize() {
  if (surface === "console") {
    document.title = "RelNet Console · ReLead";
    const params = new URLSearchParams(location.search);
    const requestedModule = params.get("module");
    const legacyAlias = requestedModule === "relnet" ? "relnet_network" : requestedModule;
    if (legacyAlias && modules[legacyAlias]) activeModule = legacyAlias;
    const toolModule = { reldrop: "relnet_drop", relshare: "relnet_share", terminal: "relnet_terminal", execute: "relnet_execute", nodes: "relnet_nodes" }[params.get("tool")];
    if (toolModule && modules[toolModule]) activeModule = toolModule;
  }
  session = await api(`${surfaceBase}/api/session`);
  byId("actor").textContent = session.actor;
  byId("actor-initial").textContent = String(session.actor || "A").slice(0, 1).toUpperCase();
  byId("role").textContent = `${session.role} · ${Math.max(1, Math.floor(session.session_expires_in_seconds / 3600))} h restantes`;
  renderNavigation();
  byId("refresh").addEventListener("click", () => loadModule(activeModule));
  document.addEventListener("visibilitychange", () => { if (!document.hidden && relnetTerminalState.sessionId && activeModule === "relnet_terminal" && !relnetTerminalState.timer) pollRelnetTerminal(); });
  byId("operation").addEventListener("change", renderGuidedFields);
  byId("table-filter").addEventListener("input", (event) => {
    tableFilterTerm = event.target.value.trim().toLowerCase();
    tablePages.clear();
    if (currentPayload) renderData(currentPayload);
    byId("table-filter").focus();
  });
  byId("content").addEventListener("click", (event) => {
    const button = event.target.closest(".page-button");
    if (!button || !currentPayload) return;
    const wrapper = button.closest(".table-pagination");
    const key = wrapper?.dataset.pageKey;
    if (!key) return;
    const delta = Number(button.dataset.pageDelta || 0);
    tablePages.set(key, Math.max(0, Number(tablePages.get(key) || 0) + delta));
    renderData(currentPayload);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key.toLowerCase() === "r" && !["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName)) loadModule(activeModule);
  });
  byId("logout").addEventListener("click", async () => {
    await api(`${surfaceBase}/api/logout`, { method: "POST", body: "{}" });
    location.assign(surfaceBase + "/login");
  });
  byId("action-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    setActionState(true);
    try {
      await submitAction();
    } catch (error) {
      if (error.status === 428) {
        try { await reauthenticate(); await submitAction(); }
        catch (reauthError) { if (reauthError.message !== "Reautenticación cancelada.") toast(reauthError.message, "error"); }
      } else {
        renderActionResult({ status: "error", detail: error.message }, true);
        toast(error.message, "error");
      }
    } finally { setActionState(false); }
  });
  await loadModule(activeModule);
  if (surface === "admin") {
    const environment = findSystemSection("/system/info").release_state || "Desconocido";
    byId("environment").textContent = formatScalar(environment);
    byId("environment-dot").className = `status-dot ${statusTone(environment)}`;
  } else {
    byId("environment").textContent = "RelNet";
    byId("environment-dot").className = "status-dot ok";
  }
}

initialize().catch(() => location.assign(surfaceBase + "/login"));

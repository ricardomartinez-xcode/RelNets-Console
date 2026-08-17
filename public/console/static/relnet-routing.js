const FAQ_BASE = "https://relead.com.mx/FAQs";
const FAQ_ANCHORS = Object.freeze({
  relnet: "#relnet",
  policies: "#policies",
  subnets: "#subredes",
  capabilities: "#capacidades",
  ssh: "#ssh",
  reldrop: "#reldrop",
  relshare: "#relshare",
  exit_nodes: "#exit-nodes",
  vpn: "#vpn-movil",
});

export function faqUrlFor(context, _runtime = undefined) {
  return FAQ_BASE + (FAQ_ANCHORS[String(context || "")] || "");
}

export function gatewayLabel(gatewayId) {
  if (!gatewayId) return "Red local";
  if (gatewayId === "controller_relay") return "Controller / Relay";
  return `Gateway ${gatewayId}`;
}

export function routeSelectPayload(form) {
  const nodeId = String(form?.nodeId || "").trim();
  const mode = String(form?.mode || "local").trim().toLowerCase();
  const gatewayId = String(form?.gatewayId || "").trim();
  if (!nodeId) throw new Error("nodeId is required");
  if (!new Set(["local", "relnet"]).has(mode)) throw new Error("unsupported routing mode");
  if (mode === "relnet" && !gatewayId) throw new Error("gatewayId is required for RelNet mode");
  return {
    node_id: nodeId,
    destination_kind: "internet",
    destination_id: null,
    mode,
    gateway_id: mode === "relnet" ? gatewayId : null,
    failure_policy: mode === "relnet" && Boolean(form?.fallback) ? "fallback_local" : "block",
  };
}

function preferenceLabel(preference, gateways) {
  const mode = String(preference?.desired_mode || "local");
  if (mode === "local") return "Red local";
  const explicitGatewayId = String(preference?.gateway_id || "");
  const gateway = gateways.get(explicitGatewayId) || (gateways.size === 1 ? [...gateways.values()][0] : null);
  return gateway?.display_name || gatewayLabel(explicitGatewayId);
}

function appliedLabel(preference, gateways) {
  const mode = String(preference?.applied_mode || "local");
  if (mode === "local") return "Red local";
  const gateway = gateways.get(String(preference?.gateway_id || ""));
  return gateway?.display_name || gatewayLabel(preference?.gateway_id);
}

export function routingViewModel(payload = {}) {
  const gateways = new Map();
  for (const item of Array.isArray(payload.gateways) ? payload.gateways : []) {
    const gatewayId = String(item.gateway_id || "");
    const displayName = gatewayId === "controller_relay"
      ? "Controller / Relay"
      : String(item.public_name || item.node_id || gatewayLabel(gatewayId));
    gateways.set(gatewayId, { ...item, display_name: displayName });
  }
  const nodes = [];
  for (const preference of Array.isArray(payload.preferences) ? payload.preferences : []) {
    if (String(preference.destination_kind || "internet") !== "internet") continue;
    const desired = preferenceLabel(preference, gateways);
    const applied = appliedLabel(preference, gateways);
    const rawState = String(preference.state || "").toLowerCase();
    const tone = rawState === "error" ? "bad" : (desired !== applied || rawState === "pending" ? "pending" : (rawState || "ok"));
    nodes.push({
      node_id: String(preference.node_id || ""),
      preference_id: String(preference.preference_id || ""),
      desired_mode: String(preference.desired_mode || "local"),
      applied_mode: String(preference.applied_mode || "local"),
      gateway_id: preference.gateway_id || null,
      failure_policy: String(preference.failure_policy || "block"),
      status: { desired, applied, tone },
      last_error: preference.last_error || null,
    });
  }
  return {
    revision: Number(payload.revision || 0),
    gateways: [...gateways.values()],
    nodes,
    advertisements: Array.isArray(payload.advertisements) ? payload.advertisements.map((item) => ({ ...item })) : [],
  };
}

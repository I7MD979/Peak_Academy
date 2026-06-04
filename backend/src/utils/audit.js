const { createAuditLog } = require("../data/coreStore");

async function auditAdminAction(req, action, entityType, entityId, metadata = {}) {
  if (!req?.user) return;
  await createAuditLog({
    request_id: req.requestId || `req-${Date.now()}`,
    actor_id: req.user.id,
    actor_role: req.user.role,
    action,
    entity_type: entityType,
    entity_id: entityId || null,
    metadata
  });
}

module.exports = { auditAdminAction };

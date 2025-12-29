// utils/logger.js
exports.auditLog = async (tx, { 
  action, 
  modelName, 
  recordId, 
  userId, 
  details, 
  oldValue = null, 
  newValue = null, 
  req 
}) => {
  return await tx.auditLog.create({
    data: {
      action,
      modelName,
      recordId,
      performedById: userId,
      details,
      oldValue,
      newValue,
      ipAddress: req?.ip || null,
      userAgent: req?.get('User-Agent') || null,
    },
  });
};
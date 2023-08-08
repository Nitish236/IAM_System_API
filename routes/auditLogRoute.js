const Router = require("express").Router;

const router = Router();

const { filter, getAuditLogById } = require("../controllers/auditLogs");

// Router

router.route("/search").post(filter); // Get all Audit Logs

router.route("/:auditId").get(getAuditLogById); // Get Audit Log By Id

// Evport router

module.exports = router;

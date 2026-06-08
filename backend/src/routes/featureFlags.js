import { Router } from "express";
import { auth } from "../middleware/auth.js";
import { getFeatureFlagForUser } from "../services/dbFeatureFlags.service.js";

const router = Router();

router.get("/:key", auth, getFeatureFlagForUser);

export default router;

import { Router } from "express";
import {
  initPayment,
  initCustomPayment,
  verifyPayment,
  initPrecreatePayment,
  verifyPrecreatePayment,
} from "../controllers/payment";
import isAuthenticated from "../middlewares/isAuthenticated";

const router = Router();

router.post("/init", isAuthenticated, initPayment);
router.post("/init-custom", isAuthenticated, initCustomPayment);
router.get("/verify/:reference", isAuthenticated, verifyPayment);
// Pay-first flow for creating paid events
router.post("/init-precreate", isAuthenticated, initPrecreatePayment);
router.get(
  "/verify-precreate/:reference",
  isAuthenticated,
  verifyPrecreatePayment
);

export default router;

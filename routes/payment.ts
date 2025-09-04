import { Router } from "express";
import {
  initPayment,
  initCustomPayment,
  verifyPayment,
} from "../controllers/payment";
import isAuthenticated from "../middlewares/isAuthenticated";

const router = Router();

router.post("/init", isAuthenticated, initPayment);
router.post("/init-custom", isAuthenticated, initCustomPayment);
router.get("/verify/:reference", isAuthenticated, verifyPayment);

export default router;

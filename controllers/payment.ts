import { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";
import Event, {
  GuestLimit,
  PhotoCapLimit,
  PaymentStatus,
} from "../models/event";
import {
  generateEventSlug,
  generateEventQRCode,
} from "../utils/qrCodeGenerator";
import BadRequestError from "../errors/badRequest";
import NotFoundError from "../errors/notFound";
import {
  getPriceForPlan,
  getPriceForCustomGuests,
  initTransaction,
  verifyTransaction,
} from "../utils/paystack";
import {
  generateEventPassword,
  hashEventPassword,
  getEventAccessUrl,
} from "../utils/qrCodeGenerator";

function assertAllowedPair(guestLimit: string, photoCapLimit: string) {
  const allowed: Record<string, string> = {
    [GuestLimit.TEN]: PhotoCapLimit.FIVE,
    [GuestLimit.ONE_HUNDRED]: PhotoCapLimit.TEN,
    [GuestLimit.TWO_FIFTY]: PhotoCapLimit.FIFTEEN,
    [GuestLimit.FIVE_HUNDRED]: PhotoCapLimit.TWENTY,
    [GuestLimit.EIGHT_HUNDRED]: PhotoCapLimit.TWENTY_FIVE,
    [GuestLimit.ONE_THOUSAND]: PhotoCapLimit.TWENTY_FIVE,
  };
  if (allowed[guestLimit] !== photoCapLimit) {
    throw new BadRequestError("Invalid pairing for plan selection");
  }
}

export const initPayment = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { eventId, guestLimit, photoCapLimit, email } = req.body as {
      eventId: string;
      guestLimit: GuestLimit;
      photoCapLimit: PhotoCapLimit;
      email: string;
    };

    if (!eventId || !guestLimit || !photoCapLimit || !email) {
      throw new BadRequestError(
        "eventId, guestLimit, photoCapLimit and email are required"
      );
    }

    if (
      guestLimit === GuestLimit.CUSTOM ||
      photoCapLimit === PhotoCapLimit.CUSTOM
    ) {
      throw new BadRequestError("Use custom pricing flow for CUSTOM limits");
    }

    assertAllowedPair(guestLimit, photoCapLimit);

    const event = await Event.findByPk(eventId);
    if (!event) throw new NotFoundError("Event not found");

    // Calculate price
    const priceNgn = await getPriceForPlan(guestLimit, photoCapLimit);
    const amountKobo = priceNgn * 100;

    if (priceNgn === 0) {
      await event.update({
        guestLimit,
        photoCapLimit,
        planPrice: 0,
        paymentStatus: PaymentStatus.FREE,
        paidAt: new Date(),
      });
      return res.status(StatusCodes.OK).json({
        success: true,
        message: "Free plan applied",
        event,
      });
    }

    const metadata = {
      eventId: event.id,
      plan: `${guestLimit}-${photoCapLimit}`,
      userId: req.user?.id,
    };

    const initRes = await initTransaction({
      email,
      amountKobo,
      metadata,
      callback_url: process.env.PAYSTACK_CALLBACK_URL || undefined,
    });

    if (!initRes.status || !initRes.data) {
      throw new BadRequestError(
        initRes.message || "Unable to initialize transaction"
      );
    }

    await event.update({
      paymentStatus: PaymentStatus.PENDING,
      planPrice: priceNgn,
      guestLimit,
      photoCapLimit,
      paystackReference: initRes.data.reference,
    });

    return res.status(StatusCodes.OK).json({
      success: true,
      authorizationUrl: initRes.data.authorization_url,
      reference: initRes.data.reference,
    });
  } catch (error) {
    next(error);
  }
};

export const initCustomPayment = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { eventId, email } = req.body as {
      eventId: string;
      email: string;
    };

    if (!eventId || !email) {
      throw new BadRequestError("eventId and email are required");
    }

    const event = await Event.findByPk(eventId);
    if (!event) throw new NotFoundError("Event not found");

    // Validate that event is using CUSTOM and has custom values
    if (
      event.guestLimit !== GuestLimit.CUSTOM &&
      event.photoCapLimit !== PhotoCapLimit.CUSTOM
    ) {
      throw new BadRequestError(
        "This event is not using CUSTOM limits. Use standard init endpoint."
      );
    }

    const customGuests = event.customGuestLimit ?? 0;
    if (!Number.isInteger(customGuests) || customGuests <= 1000) {
      throw new BadRequestError(
        "customGuestLimit must be > 1000 for custom pricing"
      );
    }

    const priceNgn = await getPriceForCustomGuests(customGuests);
    const amountKobo = priceNgn * 100;

    const metadata = {
      eventId: event.id,
      plan: `CUSTOM-${customGuests}`,
      userId: req.user?.id,
    };

    const initRes = await initTransaction({
      email,
      amountKobo,
      metadata,
      callback_url: process.env.PAYSTACK_CALLBACK_CUSTOM_URL || undefined,
    });

    if (!initRes.status || !initRes.data) {
      throw new BadRequestError(
        initRes.message || "Unable to initialize transaction"
      );
    }

    await event.update({
      paymentStatus: PaymentStatus.PENDING,
      planPrice: priceNgn,
      paystackReference: initRes.data.reference,
    });

    return res.status(StatusCodes.OK).json({
      success: true,
      authorizationUrl: initRes.data.authorization_url,
      reference: initRes.data.reference,
    });
  } catch (error) {
    next(error);
  }
};

// Initialize payment BEFORE creating a paid event (pre-create flow)
export const initPrecreatePayment = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw new BadRequestError("User authentication required");
    }

    const {
      title,
      description,
      eventFlyer,
      guestLimit,
      photoCapLimit,
      eventDate,
      isPasswordProtected,
      customPassword,
      customGuestLimit,
      customPhotoCapLimit,
      email,
    } = req.body as any;

    if (!email) throw new BadRequestError("email is required");
    if (!title || !description || !guestLimit || !photoCapLimit) {
      throw new BadRequestError(
        "Title, description, guestLimit, and photoCapLimit are required"
      );
    }

    if (!Object.values(GuestLimit).includes(guestLimit)) {
      throw new BadRequestError("Invalid guestLimit");
    }
    if (!Object.values(PhotoCapLimit).includes(photoCapLimit)) {
      throw new BadRequestError("Invalid photoCapLimit");
    }

    // Determine price
    let priceNgn = 0;
    if (
      guestLimit === GuestLimit.CUSTOM ||
      photoCapLimit === PhotoCapLimit.CUSTOM
    ) {
      const numGuests = Number(customGuestLimit);
      if (!Number.isInteger(numGuests) || numGuests <= 1000) {
        throw new BadRequestError(
          "customGuestLimit must be an integer greater than 1000 for CUSTOM"
        );
      }
      priceNgn = await getPriceForCustomGuests(numGuests);
    } else {
      assertAllowedPair(guestLimit, photoCapLimit);
      priceNgn = await getPriceForPlan(guestLimit, photoCapLimit);
    }

    if (priceNgn <= 0) {
      throw new BadRequestError(
        "This plan appears to be free; use standard create flow"
      );
    }

    const amountKobo = priceNgn * 100;

    // Normalize boolean for password protection (handle "false" string)
    const isProtected =
      typeof isPasswordProtected === "boolean"
        ? isPasswordProtected
        : String(isPasswordProtected).toLowerCase() === "true";

    const metadata = {
      mode: "precreate",
      userId,
      title,
      description,
      eventFlyer:
        typeof eventFlyer === "string" && eventFlyer.trim().length > 0
          ? eventFlyer
          : null,
      guestLimit,
      photoCapLimit,
      customGuestLimit:
        guestLimit === GuestLimit.CUSTOM ? Number(customGuestLimit) : null,
      customPhotoCapLimit:
        photoCapLimit === PhotoCapLimit.CUSTOM
          ? Number(customPhotoCapLimit)
          : null,
      eventDate: eventDate ?? null,
      isPasswordProtected: isProtected,
      customPassword: isProtected
        ? typeof customPassword === "string"
          ? customPassword
          : null
        : null,
    } as Record<string, unknown>;

    const initRes = await initTransaction({
      email,
      amountKobo,
      metadata,
      callback_url: process.env.PAYSTACK_CALLBACK_URL || undefined,
    });

    if (!initRes.status || !initRes.data) {
      throw new BadRequestError(
        initRes.message || "Unable to initialize pre-create transaction"
      );
    }

    return res.status(StatusCodes.OK).json({
      success: true,
      authorizationUrl: initRes.data.authorization_url,
      reference: initRes.data.reference,
    });
  } catch (error) {
    next(error);
  }
};

// Verify pre-create payment and then create the event
export const verifyPrecreatePayment = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { reference } = req.params as { reference: string };
    if (!reference) throw new BadRequestError("reference is required");

    const verifyRes = await verifyTransaction(reference);
    if (!verifyRes.status || !verifyRes.data) {
      throw new BadRequestError("Unable to verify transaction");
    }

    const data = verifyRes.data;
    if (data.status !== "success") {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ success: false, message: "Transaction not successful" });
    }

    const md = (data.metadata || {}) as any;
    // Debug: inspect metadata coming back from Paystack for this reference
    try {
      // Avoid crashing if circular; best-effort stringify
      // eslint-disable-next-line no-console
      console.log(
        "[verify-precreate] reference:",
        reference,
        "metadata:",
        JSON.stringify(md)
      );
    } catch (_) {
      // eslint-disable-next-line no-console
      console.log(
        "[verify-precreate] reference:",
        reference,
        "metadata (non-serializable)"
      );
    }
    if (md.mode !== "precreate") {
      throw new BadRequestError("Invalid transaction mode for pre-create");
    }

    const userId = req.user?.id;
    if (!userId || (md.userId && md.userId !== userId)) {
      // Enforce that the verifying user is the payer/owner
      throw new BadRequestError("User mismatch for event creation");
    }

    // Prepare password (no auto-generation)
    let accessPassword: string | null = null;
    const isProtectedFlag =
      md.isPasswordProtected === true ||
      String(md.isPasswordProtected).toLowerCase() === "true";
    if (isProtectedFlag) {
      const provided =
        typeof md.customPassword === "string" ? md.customPassword : "";
      if (provided.trim().length >= 4) {
        accessPassword = await hashEventPassword(provided);
      } else {
        // If password protection is flagged but a valid password is missing/short,
        // proceed without password instead of hard-failing the flow.
        // eslint-disable-next-line no-console
        console.warn(
          "[verify-precreate] Password protection flagged but no valid customPassword provided; proceeding without password."
        );
      }
    }

    // Generate slug/QR at this point (paid event)
    const slug = generateEventSlug();
    const qr = await generateEventQRCode(slug);

    const sanitizedEventFlyer =
      typeof md.eventFlyer === "string" && md.eventFlyer.trim().length > 0
        ? (md.eventFlyer as string)
        : undefined;

    const event = await Event.create({
      title: md.title,
      description: md.description,
      eventFlyer: sanitizedEventFlyer,
      guestLimit: md.guestLimit,
      photoCapLimit: md.photoCapLimit,
      customGuestLimit:
        md.guestLimit === GuestLimit.CUSTOM
          ? Number(md.customGuestLimit)
          : null,
      customPhotoCapLimit:
        md.photoCapLimit === PhotoCapLimit.CUSTOM
          ? Number(md.customPhotoCapLimit)
          : null,
      eventDate: md.eventDate ? new Date(md.eventDate as string) : undefined,
      // Derive protection flag from whether we actually stored a password
      isPasswordProtected: Boolean(accessPassword),
      accessPassword: accessPassword ?? undefined,
      eventSlug: slug,
      qrCodeData: qr,
      paymentStatus: PaymentStatus.PAID,
      planPrice: Math.round(Number(data.amount) / 100), // NGN
      paidAt: new Date(),
      isActive: true,
      paystackReference: reference,
      createdBy: userId,
    });

    return res.status(StatusCodes.CREATED).json({
      success: true,
      message: "Event created after successful payment",
      event,
      accessInfo: {
        eventSlug: slug,
        accessUrl: getEventAccessUrl(slug),
        qrCodeData: qr,
        isPasswordProtected: !!md.isPasswordProtected,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const verifyPayment = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { reference } = req.params as { reference: string };
    if (!reference) throw new BadRequestError("reference is required");

    const verifyRes = await verifyTransaction(reference);
    if (!verifyRes.status || !verifyRes.data) {
      throw new BadRequestError("Unable to verify transaction");
    }

    const event = await Event.findOne({
      where: { paystackReference: reference },
    });
    if (!event) throw new NotFoundError("Event for reference not found");

    if (verifyRes.data.status === "success") {
      // Generate slug/QR if not yet set, activate event
      let updates: any = {
        paymentStatus: PaymentStatus.PAID,
        paidAt: new Date(),
        isActive: true,
      };

      if (!event.eventSlug) {
        const slug = generateEventSlug();
        const qr = await generateEventQRCode(slug);
        updates.eventSlug = slug;
        updates.qrCodeData = qr;
      }

      await event.update(updates);
    }

    return res
      .status(StatusCodes.OK)
      .json({ success: true, data: verifyRes.data });
  } catch (error) {
    next(error);
  }
};

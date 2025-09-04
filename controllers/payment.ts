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

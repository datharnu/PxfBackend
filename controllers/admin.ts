import { Request, Response, NextFunction } from "express";
import { Op, fn, col, literal } from "sequelize";
import db, { User, Event, EventMedia } from "../models";

export const getUsers = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const page = parseInt((req.query.page as string) || "1", 10);
    const limit = parseInt((req.query.limit as string) || "20", 10);
    const offset = (page - 1) * limit;
    const search = (req.query.search as string) || "";

    const where: any = {};
    if (search) {
      where[Op.or] = [
        { fullname: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const { rows, count } = await User.findAndCountAll({
      where,
      order: [["createdAt", "DESC"]],
      limit,
      offset,
      attributes: { exclude: ["password", "refreshToken", "verificationCode"] },
    });

    res.status(200).json({
      success: true,
      data: rows,
      pagination: {
        page,
        limit,
        total: count,
        pages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const toggleUserActive = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { userId } = req.params as { userId: string };
    const user = await User.findByPk(userId);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }
    user.isActive = !user.isActive;
    await user.save();
    res
      .status(200)
      .json({ success: true, data: { id: user.id, isActive: user.isActive } });
  } catch (error) {
    next(error);
  }
};

export const getEvents = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const page = parseInt((req.query.page as string) || "1", 10);
    const limit = parseInt((req.query.limit as string) || "20", 10);
    const offset = (page - 1) * limit;
    const search = (req.query.search as string) || "";

    const where: any = {};
    if (search) {
      where.title = { [Op.iLike]: `%${search}%` };
    }

    const { rows, count } = await Event.findAndCountAll({
      where,
      order: [["createdAt", "DESC"]],
      limit,
      offset,
      include: [
        { model: User, as: "creator", attributes: ["id", "fullname", "email"] },
      ],
    });

    res.status(200).json({
      success: true,
      data: rows,
      pagination: {
        page,
        limit,
        total: count,
        pages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const toggleEventActive = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { eventId } = req.params as { eventId: string };
    const event = await Event.findByPk(eventId);
    if (!event) {
      return res
        .status(404)
        .json({ success: false, message: "Event not found" });
    }
    event.isActive = !event.isActive;
    await event.save();
    res.status(200).json({
      success: true,
      data: { id: event.id, isActive: event.isActive },
    });
  } catch (error) {
    next(error);
  }
};

export const getAdminStats = async (
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const [usersCount, eventsCount, mediaCount] = await Promise.all([
      User.count(),
      Event.count(),
      EventMedia.count(),
    ]);

    // Recent activity (last 7 days)
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const [newUsers, newEvents, newMedia] = await Promise.all([
      User.count({ where: { createdAt: { [Op.gte]: since } } }),
      Event.count({ where: { createdAt: { [Op.gte]: since } } }),
      EventMedia.count({ where: { createdAt: { [Op.gte]: since } } }),
    ]);

    // Payment stats
    const [paidEvents, pendingEvents, freeEvents] = await Promise.all([
      Event.count({ where: { paymentStatus: "PAID" } }),
      Event.count({ where: { paymentStatus: "PENDING" } }),
      Event.count({ where: { paymentStatus: "FREE" } }),
    ]);

    // Revenue calculation
    const revenueResult = (await Event.findOne({
      where: { paymentStatus: "PAID" },
      attributes: [[fn("SUM", col("planPrice")), "totalRevenue"]],
      raw: true,
    })) as { totalRevenue: string | null } | null;

    res.status(200).json({
      success: true,
      data: {
        totals: { users: usersCount, events: eventsCount, media: mediaCount },
        last7Days: { users: newUsers, events: newEvents, media: newMedia },
        payments: {
          paid: paidEvents,
          pending: pendingEvents,
          free: freeEvents,
          totalRevenue: Number(revenueResult?.totalRevenue || 0),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// Payment Management
export const getPaymentHistory = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const page = parseInt((req.query.page as string) || "1", 10);
    const limit = parseInt((req.query.limit as string) || "20", 10);
    const offset = (page - 1) * limit;

    const { rows, count } = await Event.findAndCountAll({
      where: {
        paymentStatus: { [Op.in]: ["PAID", "PENDING"] },
      },
      include: [
        { model: User, as: "creator", attributes: ["id", "fullname", "email"] },
      ],
      order: [
        ["paidAt", "DESC"],
        ["createdAt", "DESC"],
      ],
      limit,
      offset,
    });

    res.status(200).json({
      success: true,
      data: rows,
      pagination: {
        page,
        limit,
        total: count,
        pages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

// Media Moderation
export const getMediaForModeration = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const page = parseInt((req.query.page as string) || "1", 10);
    const limit = parseInt((req.query.limit as string) || "20", 10);
    const offset = (page - 1) * limit;
    const mediaType = req.query.mediaType as string;

    const where: any = {};
    if (mediaType && ["image", "video"].includes(mediaType)) {
      where.mediaType = mediaType;
    }

    const { rows, count } = await EventMedia.findAndCountAll({
      where,
      include: [
        { model: Event, as: "event", attributes: ["id", "title", "eventSlug"] },
        {
          model: User,
          as: "uploader",
          attributes: ["id", "fullname", "email"],
        },
      ],
      order: [["createdAt", "DESC"]],
      limit,
      offset,
    });

    res.status(200).json({
      success: true,
      data: rows,
      pagination: {
        page,
        limit,
        total: count,
        pages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const moderateMedia = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { mediaId } = req.params;
    const { action } = req.body; // "approve", "reject", "delete"

    if (!["approve", "reject", "delete"].includes(action)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid action" });
    }

    const media = await EventMedia.findByPk(mediaId);
    if (!media) {
      return res
        .status(404)
        .json({ success: false, message: "Media not found" });
    }

    if (action === "delete") {
      await media.destroy();
      return res
        .status(200)
        .json({ success: true, message: "Media deleted successfully" });
    }

    // For approve/reject, you might want to add a moderation status field
    // For now, we'll just toggle isActive
    media.isActive = action === "approve";
    await media.save();

    res.status(200).json({
      success: true,
      message: `Media ${action}d successfully`,
      data: { id: media.id, isActive: media.isActive },
    });
  } catch (error) {
    next(error);
  }
};

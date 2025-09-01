import { Request, Response, NextFunction } from "express";
import Event, { GuestLimit, PhotoCapLimit } from "../models/event";
import User from "../models/user";
import EventMedia from "../models/eventMedia";
import BadRequestError from "../errors/badRequest";
import NotFoundError from "../errors/notFound";
import UnAuthorizedError from "../errors/unauthorized";
import { StatusCodes } from "http-status-codes";
import { Op } from "sequelize";
import {
  generateEventSlug,
  generateEventQRCode,
  generateEventPassword,
  hashEventPassword,
  verifyEventPassword,
  getEventAccessUrl,
} from "../utils/qrCodeGenerator";

// Create a new event
export const createEvent = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      title,
      description,
      eventFlyer,
      guestLimit,
      photoCapLimit,
      eventDate,
      isPasswordProtected,
      customPassword,
    } = req.body;

    const userId = req.user?.id;
    if (!userId) {
      throw new BadRequestError("User authentication required");
    }

    // Input validation
    if (!title || !description || !guestLimit || !photoCapLimit) {
      throw new BadRequestError(
        "Title, description, guest limit, and photo capture limit are required"
      );
    }

    // Validate enums
    if (!Object.values(GuestLimit).includes(guestLimit)) {
      throw new BadRequestError(
        "Invalid guest limit. Must be one of: 10, 100, 250, 500, 800, 1000+"
      );
    }

    if (!Object.values(PhotoCapLimit).includes(photoCapLimit)) {
      throw new BadRequestError(
        "Invalid photo capture limit. Must be one of: 5, 10, 15, 20, 25"
      );
    }

    // Validate event date if provided
    if (eventDate && new Date(eventDate) < new Date()) {
      throw new BadRequestError("Event date must be in the future");
    }

    // Generate unique event slug and QR code
    const eventSlug = generateEventSlug();
    const qrCodeData = await generateEventQRCode(eventSlug);

    // Handle password protection
    let accessPassword: string | undefined;
    let plainPasswordForResponse: string | undefined;

    if (isPasswordProtected) {
      plainPasswordForResponse = customPassword || generateEventPassword(6);
      accessPassword = await hashEventPassword(plainPasswordForResponse!);
    }

    const event = await Event.create({
      title,
      description,
      eventFlyer,
      guestLimit,
      photoCapLimit,
      eventDate: eventDate ? new Date(eventDate) : undefined,
      eventSlug,
      qrCodeData,
      accessPassword,
      isPasswordProtected: !!isPasswordProtected,
      createdBy: userId,
    });

    // Fetch the created event with creator details
    const createdEvent = await Event.findByPk(event.id, {
      include: [
        {
          model: User,
          as: "creator",
          attributes: ["id", "fullname", "email"],
        },
      ],
    });

    return res.status(StatusCodes.CREATED).json({
      success: true,
      message: "Event created successfully",
      event: createdEvent,
      accessInfo: {
        eventSlug,
        accessUrl: getEventAccessUrl(eventSlug),
        qrCodeData,
        isPasswordProtected: !!isPasswordProtected,
        ...(isPasswordProtected &&
          plainPasswordForResponse && {
            generatedPassword: plainPasswordForResponse,
          }),
      },
    });
  } catch (error) {
    console.error("Create event error:", error);
    next(error);
  }
};

// Get all events with optional filtering
export const getAllEvents = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      page = 1,
      limit = 10,
      isActive,
      guestLimit,
      photoCapLimit,
      createdBy,
      upcoming,
    } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const offset = (pageNum - 1) * limitNum;

    // Build where clause
    const whereClause: any = {};

    if (isActive !== undefined) {
      whereClause.isActive = isActive === "true";
    }

    if (guestLimit) {
      whereClause.guestLimit = guestLimit;
    }

    if (photoCapLimit) {
      whereClause.photoCapLimit = photoCapLimit;
    }

    if (createdBy) {
      whereClause.createdBy = createdBy;
    }

    if (upcoming === "true") {
      whereClause.eventDate = {
        [Op.gt]: new Date(),
      };
    }

    const { count, rows: events } = await Event.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: "creator",
          attributes: ["id", "fullname", "email"],
        },
      ],
      order: [["createdAt", "DESC"]],
      limit: limitNum,
      offset: offset,
    });

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Events retrieved successfully",
      events,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: count,
        totalPages: Math.ceil(count / limitNum),
      },
    });
  } catch (error) {
    console.error("Get events error:", error);
    next(error);
  }
};

// Get event by ID
export const getEventById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const event = await Event.findByPk(id, {
      include: [
        {
          model: User,
          as: "creator",
          attributes: ["id", "fullname", "email"],
        },
      ],
    });

    if (!event) {
      throw new NotFoundError("Event not found");
    }

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Event retrieved successfully",
      event,
    });
  } catch (error) {
    console.error("Get event by ID error:", error);
    next(error);
  }
};

// Update event
export const updateEvent = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      eventFlyer,
      guestLimit,
      photoCapLimit,
      eventDate,
      isActive,
    } = req.body;

    const userId = req.user?.id;
    if (!userId) {
      throw new BadRequestError("User authentication required");
    }

    const event = await Event.findByPk(id);
    if (!event) {
      throw new NotFoundError("Event not found");
    }

    // Check if user is the creator of the event
    if (event.createdBy !== userId) {
      throw new UnAuthorizedError("You can only update your own events");
    }

    // Validate enums if provided
    if (guestLimit && !Object.values(GuestLimit).includes(guestLimit)) {
      throw new BadRequestError(
        "Invalid guest limit. Must be one of: 10, 100, 250, 500, 800, 1000+"
      );
    }

    if (
      photoCapLimit &&
      !Object.values(PhotoCapLimit).includes(photoCapLimit)
    ) {
      throw new BadRequestError(
        "Invalid photo capture limit. Must be one of: 5, 10, 15, 20, 25"
      );
    }

    // Validate event date if provided
    if (eventDate && new Date(eventDate) < new Date()) {
      throw new BadRequestError("Event date must be in the future");
    }

    // Update the event
    const updatedEvent = await event.update({
      ...(title && { title }),
      ...(description && { description }),
      ...(eventFlyer !== undefined && { eventFlyer }),
      ...(guestLimit && { guestLimit }),
      ...(photoCapLimit && { photoCapLimit }),
      ...(eventDate && { eventDate: new Date(eventDate) }),
      ...(isActive !== undefined && { isActive }),
    });

    // Fetch the updated event with creator details
    const eventWithCreator = await Event.findByPk(updatedEvent.id, {
      include: [
        {
          model: User,
          as: "creator",
          attributes: ["id", "fullname", "email"],
        },
      ],
    });

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Event updated successfully",
      event: eventWithCreator,
    });
  } catch (error) {
    console.error("Update event error:", error);
    next(error);
  }
};

// Delete event
export const deleteEvent = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      throw new BadRequestError("User authentication required");
    }

    const event = await Event.findByPk(id);
    if (!event) {
      throw new NotFoundError("Event not found");
    }

    // Check if user is the creator of the event
    if (event.createdBy !== userId) {
      throw new UnAuthorizedError("You can only delete your own events");
    }

    await event.destroy();

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Event deleted successfully",
    });
  } catch (error) {
    console.error("Delete event error:", error);
    next(error);
  }
};

// Get user's events
export const getUserEvents = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw new BadRequestError("User authentication required");
    }

    const { page = 1, limit = 10, isActive } = req.query;
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const offset = (pageNum - 1) * limitNum;

    const whereClause: any = { createdBy: userId };
    if (isActive !== undefined) {
      whereClause.isActive = isActive === "true";
    }

    const { count, rows: events } = await Event.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: "creator",
          attributes: ["id", "fullname", "email"],
        },
      ],
      order: [["createdAt", "DESC"]],
      limit: limitNum,
      offset: offset,
    });

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "User events retrieved successfully",
      events,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: count,
        totalPages: Math.ceil(count / limitNum),
      },
    });
  } catch (error) {
    console.error("Get user events error:", error);
    next(error);
  }
};

// Get event statistics
export const getEventStats = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const totalEvents = await Event.count();
    const activeEvents = await Event.count({ where: { isActive: true } });
    const upcomingEvents = await Event.count({
      where: {
        eventDate: {
          [Op.gt]: new Date(),
        },
        isActive: true,
      },
    });

    // Get guest limit distribution
    const guestLimitStats = await Event.findAll({
      attributes: [
        "guestLimit",
        [Event.sequelize!.fn("COUNT", Event.sequelize!.col("id")), "count"],
      ],
      group: ["guestLimit"],
      raw: true,
    });

    // Get photo limit distribution
    const photoLimitStats = await Event.findAll({
      attributes: [
        "photoCapLimit",
        [Event.sequelize!.fn("COUNT", Event.sequelize!.col("id")), "count"],
      ],
      group: ["photoCapLimit"],
      raw: true,
    });

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Event statistics retrieved successfully",
      stats: {
        totalEvents,
        activeEvents,
        upcomingEvents,
        guestLimitDistribution: guestLimitStats,
        photoLimitDistribution: photoLimitStats,
      },
    });
  } catch (error) {
    console.error("Get event stats error:", error);
    next(error);
  }
};

// Access event via slug (for QR code/URL access)
export const getEventBySlug = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { slug } = req.params;
    const { password } = req.body;
    const userId = req.user?.id; // Optional authentication

    const event = await Event.findOne({
      where: { eventSlug: slug, isActive: true },
      include: [
        {
          model: User,
          as: "creator",
          attributes: ["id", "fullname", "email"],
        },
        {
          model: EventMedia,
          as: "media",
          where: { isActive: true },
          required: false,
          include: [
            {
              model: User,
              as: "uploader",
              attributes: ["id", "fullname"],
            },
          ],
          order: [["createdAt", "DESC"]],
          limit: 10, // Show only recent 10 media items
        },
      ],
    });

    if (!event) {
      throw new NotFoundError("Event not found or inactive");
    }

    // Check if user is the event creator (bypass password requirement)
    const isEventCreator = userId && event.createdBy === userId;

    // Check if password is required (only if not the creator)
    if (event.isPasswordProtected && event.accessPassword && !isEventCreator) {
      if (!password) {
        return res.status(StatusCodes.UNAUTHORIZED).json({
          success: false,
          message: "Password required",
          requiresPassword: true,
        });
      }

      const isPasswordValid = await verifyEventPassword(
        password,
        event.accessPassword
      );
      if (!isPasswordValid) {
        throw new BadRequestError("Invalid password");
      }
    }

    // Remove sensitive data from response
    const eventData = event.toJSON();
    delete eventData.accessPassword;

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Event accessed successfully",
      event: {
        ...eventData,
        accessUrl: getEventAccessUrl(event.eventSlug),
      },
    });
  } catch (error) {
    console.error("Get event by slug error:", error);
    next(error);
  }
};

// Verify event password (separate endpoint for better UX)
export const verifyEventAccess = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { slug } = req.params;
    const { password } = req.body;
    const userId = req.user?.id; // Optional authentication

    const event = await Event.findOne({
      where: { eventSlug: slug, isActive: true },
      attributes: [
        "id",
        "eventSlug",
        "title",
        "isPasswordProtected",
        "createdBy",
        "accessPassword",
      ],
    });

    if (!event) {
      throw new NotFoundError("Event not found or inactive");
    }

    // Check if user is the event creator (bypass password requirement)
    const isEventCreator = userId && event.createdBy === userId;

    if (!event.isPasswordProtected) {
      return res.status(StatusCodes.OK).json({
        success: true,
        message: "Event access granted",
        requiresPassword: false,
      });
    }

    // If user is the creator, grant access without password
    if (isEventCreator) {
      return res.status(StatusCodes.OK).json({
        success: true,
        message: "Event access granted (creator)",
        requiresPassword: false,
      });
    }

    if (!password) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "Password is required",
        requiresPassword: true,
      });
    }

    if (!event.accessPassword) {
      throw new BadRequestError("Event configuration error");
    }

    const isPasswordValid = await verifyEventPassword(
      password,
      event.accessPassword
    );

    return res.status(StatusCodes.OK).json({
      success: isPasswordValid,
      message: isPasswordValid ? "Access granted" : "Invalid password",
      requiresPassword: !isPasswordValid,
    });
  } catch (error) {
    console.error("Verify event access error:", error);
    next(error);
  }
};

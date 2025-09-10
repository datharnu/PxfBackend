"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.moderateMedia = exports.getMediaForModeration = exports.getPaymentHistory = exports.getAdminStats = exports.toggleEventActive = exports.getEvents = exports.toggleUserActive = exports.getUsers = void 0;
const sequelize_1 = require("sequelize");
const models_1 = require("../models");
const getUsers = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page || "1", 10);
        const limit = parseInt(req.query.limit || "20", 10);
        const offset = (page - 1) * limit;
        const search = req.query.search || "";
        const where = {};
        if (search) {
            where[sequelize_1.Op.or] = [
                { fullname: { [sequelize_1.Op.iLike]: `%${search}%` } },
                { email: { [sequelize_1.Op.iLike]: `%${search}%` } },
            ];
        }
        const { rows, count } = await models_1.User.findAndCountAll({
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
    }
    catch (error) {
        next(error);
    }
};
exports.getUsers = getUsers;
const toggleUserActive = async (req, res, next) => {
    try {
        const { userId } = req.params;
        const user = await models_1.User.findByPk(userId);
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
    }
    catch (error) {
        next(error);
    }
};
exports.toggleUserActive = toggleUserActive;
const getEvents = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page || "1", 10);
        const limit = parseInt(req.query.limit || "20", 10);
        const offset = (page - 1) * limit;
        const search = req.query.search || "";
        const where = {};
        if (search) {
            where.title = { [sequelize_1.Op.iLike]: `%${search}%` };
        }
        const { rows, count } = await models_1.Event.findAndCountAll({
            where,
            order: [["createdAt", "DESC"]],
            limit,
            offset,
            include: [
                { model: models_1.User, as: "creator", attributes: ["id", "fullname", "email"] },
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
    }
    catch (error) {
        next(error);
    }
};
exports.getEvents = getEvents;
const toggleEventActive = async (req, res, next) => {
    try {
        const { eventId } = req.params;
        const event = await models_1.Event.findByPk(eventId);
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
    }
    catch (error) {
        next(error);
    }
};
exports.toggleEventActive = toggleEventActive;
const getAdminStats = async (_req, res, next) => {
    try {
        const [usersCount, eventsCount, mediaCount] = await Promise.all([
            models_1.User.count(),
            models_1.Event.count(),
            models_1.EventMedia.count(),
        ]);
        // Recent activity (last 7 days)
        const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const [newUsers, newEvents, newMedia] = await Promise.all([
            models_1.User.count({ where: { createdAt: { [sequelize_1.Op.gte]: since } } }),
            models_1.Event.count({ where: { createdAt: { [sequelize_1.Op.gte]: since } } }),
            models_1.EventMedia.count({ where: { createdAt: { [sequelize_1.Op.gte]: since } } }),
        ]);
        // Payment stats
        const [paidEvents, pendingEvents, freeEvents] = await Promise.all([
            models_1.Event.count({ where: { paymentStatus: "PAID" } }),
            models_1.Event.count({ where: { paymentStatus: "PENDING" } }),
            models_1.Event.count({ where: { paymentStatus: "FREE" } }),
        ]);
        // Revenue calculation
        const revenueResult = (await models_1.Event.findOne({
            where: { paymentStatus: "PAID" },
            attributes: [[(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("planPrice")), "totalRevenue"]],
            raw: true,
        }));
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
    }
    catch (error) {
        next(error);
    }
};
exports.getAdminStats = getAdminStats;
// Payment Management
const getPaymentHistory = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page || "1", 10);
        const limit = parseInt(req.query.limit || "20", 10);
        const offset = (page - 1) * limit;
        const { rows, count } = await models_1.Event.findAndCountAll({
            where: {
                paymentStatus: { [sequelize_1.Op.in]: ["PAID", "PENDING"] },
            },
            include: [
                { model: models_1.User, as: "creator", attributes: ["id", "fullname", "email"] },
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
    }
    catch (error) {
        next(error);
    }
};
exports.getPaymentHistory = getPaymentHistory;
// Media Moderation
const getMediaForModeration = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page || "1", 10);
        const limit = parseInt(req.query.limit || "20", 10);
        const offset = (page - 1) * limit;
        const mediaType = req.query.mediaType;
        const where = {};
        if (mediaType && ["image", "video"].includes(mediaType)) {
            where.mediaType = mediaType;
        }
        const { rows, count } = await models_1.EventMedia.findAndCountAll({
            where,
            include: [
                { model: models_1.Event, as: "event", attributes: ["id", "title", "eventSlug"] },
                {
                    model: models_1.User,
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
    }
    catch (error) {
        next(error);
    }
};
exports.getMediaForModeration = getMediaForModeration;
const moderateMedia = async (req, res, next) => {
    try {
        const { mediaId } = req.params;
        const { action } = req.body; // "approve", "reject", "delete"
        if (!["approve", "reject", "delete"].includes(action)) {
            return res
                .status(400)
                .json({ success: false, message: "Invalid action" });
        }
        const media = await models_1.EventMedia.findByPk(mediaId);
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
    }
    catch (error) {
        next(error);
    }
};
exports.moderateMedia = moderateMedia;

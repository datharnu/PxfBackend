"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        // plan_pricing: standard plan prices keyed by guestLimit-photoCapLimit
        await queryInterface.createTable("plan_pricing", {
            id: {
                type: Sequelize.UUID,
                defaultValue: Sequelize.fn("gen_random_uuid"),
                allowNull: false,
                primaryKey: true,
            },
            guestLimit: {
                type: Sequelize.STRING,
                allowNull: false,
            },
            photoCapLimit: {
                type: Sequelize.STRING,
                allowNull: false,
            },
            priceNgn: {
                type: Sequelize.INTEGER,
                allowNull: false,
            },
            createdAt: {
                allowNull: false,
                type: Sequelize.DATE,
                defaultValue: Sequelize.fn("NOW"),
            },
            updatedAt: {
                allowNull: false,
                type: Sequelize.DATE,
                defaultValue: Sequelize.fn("NOW"),
            },
        });
        await queryInterface.addIndex("plan_pricing", ["guestLimit", "photoCapLimit"], {
            unique: true,
            name: "plan_pricing_guest_photo_unique",
        });

        // Seed initial standard plan prices
        await queryInterface.bulkInsert("plan_pricing", [
            { guestLimit: "10", priceNgn: 0, photoCapLimit: "5" },
            { guestLimit: "100", priceNgn: 7000, photoCapLimit: "10" },
            { guestLimit: "250", priceNgn: 12000, photoCapLimit: "15" },
            { guestLimit: "500", priceNgn: 18000, photoCapLimit: "20" },
            { guestLimit: "800", priceNgn: 23000, photoCapLimit: "25" },
            { guestLimit: "1000", priceNgn: 28000, photoCapLimit: "25" },
        ]);

        // custom_pricing_tiers: piecewise tiers for custom guests pricing
        await queryInterface.createTable("custom_pricing_tiers", {
            id: {
                type: Sequelize.UUID,
                defaultValue: Sequelize.fn("gen_random_uuid"),
                allowNull: false,
                primaryKey: true,
            },
            minGuests: { type: Sequelize.INTEGER, allowNull: false },
            maxGuests: { type: Sequelize.INTEGER, allowNull: true },
            priceNgn: { type: Sequelize.INTEGER, allowNull: false },
            createdAt: {
                allowNull: false,
                type: Sequelize.DATE,
                defaultValue: Sequelize.fn("NOW"),
            },
            updatedAt: {
                allowNull: false,
                type: Sequelize.DATE,
                defaultValue: Sequelize.fn("NOW"),
            },
        });
        await queryInterface.addIndex("custom_pricing_tiers", ["minGuests", "maxGuests"], {
            unique: false,
            name: "custom_pricing_tiers_range_idx",
        });

        // Seed initial tiers: >1000 up to 1500, 2500, 4000, 6000
        await queryInterface.bulkInsert("custom_pricing_tiers", [
            { minGuests: 1001, maxGuests: 1500, priceNgn: 35000 },
            { minGuests: 1501, maxGuests: 2500, priceNgn: 45000 },
            { minGuests: 2501, maxGuests: 4000, priceNgn: 60000 },
            { minGuests: 4001, maxGuests: 6000, priceNgn: 80000 },
            // Open-ended tier marker (null max) to indicate use of base price + increments
            { minGuests: 6001, maxGuests: null, priceNgn: 80000 },
        ]);
    },

    async down(queryInterface) {
        await queryInterface.bulkDelete("custom_pricing_tiers", null, {});
        await queryInterface.dropTable("custom_pricing_tiers");
        await queryInterface.bulkDelete("plan_pricing", null, {});
        await queryInterface.dropTable("plan_pricing");
    },
};



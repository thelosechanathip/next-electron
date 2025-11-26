package routes

import (
	"backend/config"
	"backend/handlers"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

// SetupRoutes ตั้งค่า routes ทั้งหมด
func SetupRoutes(app *fiber.App, db *gorm.DB, config config.Config, dbConnected bool) {
	// Hello API
	app.Get("/api/hello", func(c *fiber.Ctx) error {
		return handlers.HelloHandler(c, db, config, dbConnected)
	})

	// Test Database API
	app.Get("/api/test-db", func(c *fiber.Ctx) error {
		return handlers.TestDBHandler(c, db, config, dbConnected)
	})

	// Health Check API
	app.Get("/api/health", func(c *fiber.Ctx) error {
		return handlers.HealthHandler(c, db, config, dbConnected)
	})

	// Test Connection API (ใช้ก่อน save config)
	app.Post("/api/test-connection", handlers.TestConnectionHandler)

	// 404 Handler
	app.Use(func(c *fiber.Ctx) error {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"status":  "error",
			"message": "Endpoint not found",
		})
	})
}

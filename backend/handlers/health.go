package handlers

import (
	"time"

	"backend/config"
	"backend/models"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

// HealthHandler จัดการ request ไปยัง /api/health
func HealthHandler(c *fiber.Ctx, db *gorm.DB, config config.Config, dbConnected bool) error {
	healthStatus := models.HealthResponse{
		Status:    "healthy",
		Timestamp: time.Now().Format(time.RFC3339),
		Service:   "go-backend-fiber",
		Database: map[string]interface{}{
			"connected": dbConnected,
			"host":      config.DBHost,
			"port":      config.DBPort,
			"database":  config.DBName,
		},
	}

	if !dbConnected {
		healthStatus.Status = "unhealthy"
		healthStatus.Database["error"] = "Database not connected"
		return c.Status(fiber.StatusServiceUnavailable).JSON(healthStatus)
	}

	return c.JSON(healthStatus)
}

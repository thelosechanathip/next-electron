package handlers

import (
	"fmt"

	"backend/config"
	"backend/models"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

// HelloHandler จัดการ request ไปยัง /api/hello
func HelloHandler(c *fiber.Ctx, db *gorm.DB, config config.Config, dbConnected bool) error {
	resp := models.Response{
		Message:     fmt.Sprintf("Hello from Go Fiber! DB: %s, Connected: %v", config.DBName, dbConnected),
		Status:      "OK",
		DBConnected: dbConnected,
	}
	return c.JSON(resp)
}

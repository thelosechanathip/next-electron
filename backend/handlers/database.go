package handlers

import (
	"fmt"

	"backend/config"
	"backend/models"

	"github.com/gofiber/fiber/v2"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
	gormLogger "gorm.io/gorm/logger"
)

// TestDBHandler จัดการ request ไปยัง /api/test-db
func TestDBHandler(c *fiber.Ctx, db *gorm.DB, config config.Config, dbConnected bool) error {
	if !dbConnected {
		return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{
			"status":  "error",
			"message": "Database not connected",
		})
	}

	var result string
	err := db.Raw("SELECT NOW()").Scan(&result).Error
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"status":  "error",
			"message": fmt.Sprintf("Query failed: %v", err),
		})
	}

	return c.JSON(fiber.Map{
		"status":      "success",
		"message":     "Database is working!",
		"server_time": result,
	})
}

// TestConnectionHandler จัดการ request ไปยัง /api/test-connection
func TestConnectionHandler(c *fiber.Ctx) error {
	var req models.TestConnectionRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"status":  "error",
			"message": "Invalid request body",
		})
	}

	// ทดสอบการเชื่อมต่อ database
	testDSN := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?charset=utf8mb4&parseTime=True&loc=Local",
		req.DBUser, req.DBPassword, req.DBHost, req.DBPort, req.DBName)

	testDB, err := gorm.Open(mysql.Open(testDSN), &gorm.Config{
		Logger: gormLogger.Default.LogMode(gormLogger.Silent),
	})
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"status":  "error",
			"message": fmt.Sprintf("Database connection failed: %v", err),
		})
	}

	// Test connection
	sqlDB, err := testDB.DB()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"status":  "error",
			"message": fmt.Sprintf("Database connection test failed: %v", err),
		})
	}
	defer sqlDB.Close()

	err = sqlDB.Ping()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"status":  "error",
			"message": fmt.Sprintf("Cannot connect to database: %v", err),
		})
	}

	// ทดสอบ query พื้นฐาน
	var result string
	err = testDB.Raw("SELECT NOW()").Scan(&result).Error
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"status":  "error",
			"message": fmt.Sprintf("Database query test failed: %v", err),
		})
	}

	return c.JSON(fiber.Map{
		"status":      "success",
		"message":     "Database connection test passed!",
		"server_time": result,
	})
}

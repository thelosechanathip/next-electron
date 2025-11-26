package main

import (
	"flag"
	"fmt"
	"log"

	"backend/config"
	"backend/routes"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
)

func main() {
	// 1. ประกาศรับ Flag ให้ตรงกับ Config ใน Electron
	serverPort := flag.String("serverPort", "9000", "Port for Golang Server")
	dbHost := flag.String("dbHost", "localhost", "Database Host")
	dbUser := flag.String("dbUser", "root", "Database User")
	dbPass := flag.String("dbPass", "", "Database Password")
	dbName := flag.String("dbName", "test_db", "Database Name")
	dbPort := flag.String("dbPort", "3306", "Database Port")

	flag.Parse()

	// 2. โหลด Configuration
	appConfig := config.Config{
		ServerPort: *serverPort,
		DBHost:     *dbHost,
		DBUser:     *dbUser,
		DBPassword: *dbPass,
		DBName:     *dbName,
		DBPort:     *dbPort,
	}

	// 3. สร้าง Fiber App
	app := fiber.New(fiber.Config{
		AppName: "Go Backend API",
	})

	// 4. Middleware
	app.Use(cors.New(cors.Config{
		AllowOrigins: "*",
		AllowHeaders: "Origin, Content-Type, Accept",
		AllowMethods: "GET, POST, OPTIONS",
	}))

	app.Use(logger.New())

	// 5. เชื่อมต่อ Database
	db := config.ConnectDatabase(appConfig)
	dbConnected := db != nil

	// 6. ตั้งค่า Routes
	routes.SetupRoutes(app, db, appConfig, dbConnected)

	// 7. เริ่มรัน Server
	fmt.Printf("🚀 Golang Backend (Fiber) running on port %s\n", appConfig.ServerPort)
	fmt.Printf("📊 Database: %s@%s:%s/%s\n", appConfig.DBUser, appConfig.DBHost, appConfig.DBPort, appConfig.DBName)

	err := app.Listen(":" + appConfig.ServerPort)
	if err != nil {
		log.Printf("❌ Error starting server: %s\n", err)
	}
}

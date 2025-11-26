package config

import (
	"fmt"
	"log"

	"gorm.io/driver/mysql"
	"gorm.io/gorm"
	gormLogger "gorm.io/gorm/logger"
)

// ConnectDatabase เชื่อมต่อกับ Database
func ConnectDatabase(config Config) *gorm.DB {
	if config.DBHost == "" || config.DBUser == "" || config.DBName == "" {
		fmt.Println("ℹ️  Database config incomplete, skipping connection")
		return nil
	}

	dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?charset=utf8mb4&parseTime=True&loc=Local",
		config.DBUser, config.DBPassword, config.DBHost, config.DBPort, config.DBName)

	db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{
		Logger: gormLogger.Default.LogMode(gormLogger.Silent),
	})

	if err != nil {
		log.Printf("❌ Database connection failed: %v\n", err)
		return nil
	}

	// Test connection
	sqlDB, err := db.DB()
	if err != nil {
		log.Printf("❌ Database connection test failed: %v\n", err)
		return nil
	}

	err = sqlDB.Ping()
	if err != nil {
		log.Printf("❌ Database ping failed: %v\n", err)
		return nil
	}

	fmt.Printf("✅ Database connected successfully to %s@%s:%s/%s\n",
		config.DBUser, config.DBHost, config.DBPort, config.DBName)
	return db
}

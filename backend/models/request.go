package models

// TestConnectionRequest โครงสร้างสำหรับรับ Request การทดสอบการเชื่อมต่อ
type TestConnectionRequest struct {
	DBHost     string `json:"db_host"`
	DBUser     string `json:"db_user"`
	DBPassword string `json:"db_password"`
	DBName     string `json:"db_name"`
	DBPort     string `json:"db_port"`
}

package models

// Response โครงสร้างสำหรับส่ง Response กลับไป
type Response struct {
	Message     string `json:"message"`
	Status      string `json:"status"`
	DBConnected bool   `json:"db_connected"`
}

// HealthResponse โครงสร้างสำหรับ Health Check
type HealthResponse struct {
	Status    string                 `json:"status"`
	Timestamp string                 `json:"timestamp"`
	Service   string                 `json:"service"`
	Database  map[string]interface{} `json:"database"`
}

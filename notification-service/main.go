package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/smtp"
	"os"
	"time"

	"github.com/joho/godotenv"
	"github.com/streadway/amqp"
)

// --- Structs for RabbitMQ message parsing ---
type NotificationPayload struct {
	RecipientID    string          `json:"recipientId"`
	RecipientEmail string          `json:"recipientEmail"`
	RecipientType  string          `json:"recipientType"`
	NotificationID string          `json:"notificationId"`
	Title          string          `json:"title"`
	Message        string          `json:"message"`
	HtmlBody       string          `json:"htmlBody"` // ✅ Added to support professional HTML
	Type           string          `json:"type"`
	Metadata       json.RawMessage `json:"metadata,omitempty"`
}

type MessageWrapper struct {
	Pattern string              `json:"pattern"`
	Data    NotificationPayload `json:"data"`
}

func main() {
	err := godotenv.Load()
	if err != nil {
		log.Println("Warning: .env file not found. Relying on system environment variables.")
	}

	const (
		smtpHost = "smtp.zoho.in"
		smtpPort = "587"
	)

	var (
		rabbitMQURL  = os.Getenv("RABBITMQ_URL")
		smtpUser     = os.Getenv("ZOHO_EMAIL")
		smtpPassword = os.Getenv("ZOHO_APP_PASSWORD")
	)

	log.Println("🚀 Notification Service Starting...")

	if rabbitMQURL == "" || smtpUser == "" || smtpPassword == "" {
		log.Fatalln("Error: Missing required environment variables.")
	}

	// RabbitMQ connection logic
	var conn *amqp.Connection
	for i := 0; i < 5; i++ {
		conn, err = amqp.Dial(rabbitMQURL)
		if err == nil {
			break
		}
		log.Printf("Failed to connect to RabbitMQ, retrying... (%v)", err)
		time.Sleep(5 * time.Second)
	}
	if err != nil {
		log.Fatalf("Could not connect to RabbitMQ: %s", err)
	}
	defer conn.Close()

	ch, err := conn.Channel()
	if err != nil {
		log.Fatalf("Failed to open a channel: %s", err)
	}
	defer ch.Close()

	q, err := ch.QueueDeclare("notifications_queue", true, false, false, false, nil)
	if err != nil {
		log.Fatalf("Failed to declare a queue: %s", err)
	}

	msgs, err := ch.Consume(q.Name, "", false, false, false, false, nil)
	if err != nil {
		log.Fatalf("Failed to register a consumer: %s", err)
	}

	go func() {
		for d := range msgs {
			var wrapper MessageWrapper
			if err := json.Unmarshal(d.Body, &wrapper); err != nil {
				log.Printf("Error decoding message: %s. Rejecting.", err)
				d.Reject(false)
				continue
			}

			payload := wrapper.Data
			err = sendEmail(payload, smtpHost, smtpPort, smtpUser, smtpPassword)
			if err != nil {
				log.Printf("❌ Failed email to %s: %s", payload.RecipientEmail, err)
				d.Nack(false, true) // Retry
				continue
			}

			log.Printf("✅ Email sent to %s for %s", payload.RecipientEmail, payload.Title)
			d.Ack(false)
		}
	}()

	log.Println(" [*] Waiting for messages. To exit press CTRL+C")
	select {}
}

func sendEmail(payload NotificationPayload, host, port, user, pass string) error {
	var body string
	contentType := "text/plain"

	// ✅ Logic: If HTML body is present, use it and set correct headers
	if payload.HtmlBody != "" {
		contentType = "text/html"
		body = payload.HtmlBody
	} else {
		body = payload.Message
	}

	// Build the MIME email message
	header := make(map[string]string)
	header["From"] = user
	header["To"] = payload.RecipientEmail
	header["Subject"] = payload.Title
	header["MIME-Version"] = "1.0"
	header["Content-Type"] = fmt.Sprintf("%s; charset=\"utf-8\"", contentType)

	message := ""
	for k, v := range header {
		message += fmt.Sprintf("%s: %s\r\n", k, v)
	}
	message += "\r\n" + body

	auth := smtp.PlainAuth("", user, pass, host)

	err := smtp.SendMail(host+":"+port, auth, user, []string{payload.RecipientEmail}, []byte(message))
	if err != nil {
		return fmt.Errorf("smtp error: %w", err)
	}

	return nil
}

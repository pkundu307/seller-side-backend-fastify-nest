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

	// --- THIS IS THE CRITICAL CHANGE ---
	// Define constants for the correct SMTP server for a FREE organization account in the INDIA data center.
	const (
		smtpHost = "smtp.zoho.in" // Use the free server for the .in data center
		smtpPort = "587"
	)
	// --- END OF CHANGE ---

	var (
		rabbitMQURL  = os.Getenv("RABBITMQ_URL")
		smtpUser     = os.Getenv("ZOHO_EMAIL")
		smtpPassword = os.Getenv("ZOHO_APP_PASSWORD")
	)

	log.Println("Starting Notification Service...")

	if rabbitMQURL == "" || smtpUser == "" || smtpPassword == "" {
		log.Fatalln("Error: Missing required environment variables.")
	}
	log.Printf("Connecting to Zoho with User: [%s] on Host: [%s]", smtpUser, smtpHost)

	// --- RabbitMQ connection logic (no changes) ---
	var conn *amqp.Connection
	for i := 0; i < 5; i++ {
		conn, err = amqp.Dial(rabbitMQURL)
		if err == nil {
			break
		}
		log.Printf("Failed to connect to RabbitMQ, retrying in 5 seconds... (%v)", err)
		time.Sleep(5 * time.Second)
	}
	if err != nil {
		log.Fatalf("Could not connect to RabbitMQ: %s", err)
	}
	defer conn.Close()
	log.Println("Successfully connected to RabbitMQ")

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

	forever := make(chan bool)

	go func() {
		for d := range msgs {
			var wrapper MessageWrapper
			err := json.Unmarshal(d.Body, &wrapper)
			if err != nil {
				log.Printf("Error decoding message: %s. Rejecting.", err)
				d.Reject(false)
				continue
			}

			payload := wrapper.Data
			log.Printf("Received notification %s for %s <%s>", payload.NotificationID, payload.RecipientType, payload.RecipientEmail)

			err = sendEmail(payload, smtpHost, smtpPort, smtpUser, smtpPassword)
			if err != nil {
				log.Printf("Failed to send email for notification %s: %s. Nacking to retry.", payload.NotificationID, err)
				d.Nack(false, true)
				continue
			}

			log.Printf("Successfully sent email to %s for notification %s", payload.RecipientEmail, payload.NotificationID)
			d.Ack(false)
		}
	}()

	log.Println(" [*] Waiting for messages. To exit press CTRL+C")
	<-forever
}

// --- Email Sending Logic (Updated to accept config as arguments) ---
func sendEmail(payload NotificationPayload, host, port, user, pass string) error {

	emailBody := fmt.Sprintf("From: %s\r\nTo: %s\r\nSubject: %s\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n%s", user, payload.RecipientEmail, payload.Title, payload.Message)

	auth := smtp.PlainAuth("", user, pass, host)

	err := smtp.SendMail(host+":"+port, auth, user, []string{payload.RecipientEmail}, []byte(emailBody))
	if err != nil {
		return fmt.Errorf("smtp error: %w", err)
	}

	return nil
}

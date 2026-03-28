package main

import (
	"bytes"
	"context"
	"fmt"
	"log"
	"os"
	"os/exec"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

func main() {
	// 1. Load Configuration
	dbURL := os.Getenv("DATABASE_URL")
	r2AccountID := os.Getenv("R2_ACCOUNT_ID")
	r2AccessKey := os.Getenv("R2_ACCESS_KEY")
	r2SecretKey := os.Getenv("R2_SECRET_KEY")
	r2Bucket := os.Getenv("R2_BUCKET")

	if dbURL == "" || r2AccountID == "" || r2AccessKey == "" || r2SecretKey == "" || r2Bucket == "" {
		log.Fatal("❌ Error: Missing required environment variables (DB_URL or R2 Credentials)")
	}

	log.Println("🚀 Backup Service Starting...")

	// 2. ✅ STARTUP TEST: Run one backup immediately to verify credentials/connection
	log.Println("🏃 Running immediate startup backup test to verify Cloudflare R2...")
	if err := performBackup(dbURL, r2AccountID, r2AccessKey, r2SecretKey, r2Bucket); err != nil {
		log.Printf("❌ Startup Backup Test Failed: %v", err)
	} else {
		log.Println("✅ Startup Backup Test Successful! File sent to R2. Check your dashboard.")
	}

	log.Println("⏰ Entering scheduled mode. Backup set for: Daily at 03:00 AM UTC")

	// 3. Schedule Loop
	for {
		now := time.Now().UTC()
		// Calculate time until next 03:00 AM UTC
		nextRun := time.Date(now.Year(), now.Month(), now.Day(), 3, 0, 0, 0, time.UTC)
		if now.After(nextRun) {
			nextRun = nextRun.Add(24 * time.Hour)
		}
		duration := nextRun.Sub(now)

		log.Printf("💤 Sleeping for %v until next scheduled backup...", duration)
		time.Sleep(duration)

		log.Println("⏰ Starting scheduled backup process...")
		if err := performBackup(dbURL, r2AccountID, r2AccessKey, r2SecretKey, r2Bucket); err != nil {
			log.Printf("❌ Scheduled Backup Failed: %v", err)
		} else {
			log.Println("✅ Scheduled Backup Completed Successfully")
		}
	}
}

func performBackup(dbURL, accountID, accessKey, secretKey, bucket string) error {
	timestamp := time.Now().Format("2006-01-02_15-04-05")
	fileName := fmt.Sprintf("backup_%s.sql.gz", timestamp)
	localPath := "/tmp/" + fileName

	// Step A: Clean URI for pg_dump (Strip Prisma ?schema=public)
	cleanURL := strings.Split(dbURL, "?")[0]

	// Step B: Run pg_dump and pipe to Gzip
	log.Println("📦 Dumping database and compressing...")
	cmdStr := fmt.Sprintf("pg_dump --dbname='%s' --no-owner --clean | gzip > %s", cleanURL, localPath)
	cmd := exec.Command("sh", "-c", cmdStr)

	var stderr bytes.Buffer
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil {
		return fmt.Errorf("pg_dump failed: %v | stderr: %s", err, stderr.String())
	}

	// Step C: Verify file is not empty (20 bytes is usually just the gzip header)
	fileInfo, err := os.Stat(localPath)
	if err != nil {
		return err
	}
	if fileInfo.Size() < 200 {
		return fmt.Errorf("backup failed: produced file is too small (%d bytes), likely empty", fileInfo.Size())
	}

	log.Printf("📁 Backup file created locally: %s (%d bytes)", fileName, fileInfo.Size())

	// Step D: Upload to R2
	log.Println("☁️  Uploading to Cloudflare R2...")
	file, err := os.Open(localPath)
	if err != nil {
		return err
	}
	defer file.Close()
	defer os.Remove(localPath) // Clean up /tmp file after upload attempt

	r2Resolver := aws.EndpointResolverWithOptionsFunc(func(service, region string, options ...interface{}) (aws.Endpoint, error) {
		return aws.Endpoint{
			URL: fmt.Sprintf("https://%s.r2.cloudflarestorage.com", accountID),
		}, nil
	})

	cfg, err := config.LoadDefaultConfig(context.TODO(),
		config.WithEndpointResolverWithOptions(r2Resolver),
		config.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(accessKey, secretKey, "")),
		config.WithRegion("auto"),
	)
	if err != nil {
		return err
	}

	client := s3.NewFromConfig(cfg)

	_, err = client.PutObject(context.TODO(), &s3.PutObjectInput{
		Bucket:      aws.String(bucket),
		Key:         aws.String("db-backups/" + fileName),
		Body:        file,
		ContentType: aws.String("application/gzip"),
	})

	return err
}

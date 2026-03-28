package main

import (
	"bytes"
	"context"
	"fmt"
	"log"
	"os"
	"os/exec"
	"strings" // ✅ Added for URL cleaning
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

func main() {
	dbURL := os.Getenv("DATABASE_URL")
	r2AccountID := os.Getenv("R2_ACCOUNT_ID")
	r2AccessKey := os.Getenv("R2_ACCESS_KEY")
	r2SecretKey := os.Getenv("R2_SECRET_KEY")
	r2Bucket := os.Getenv("R2_BUCKET")

	if dbURL == "" || r2AccountID == "" || r2AccessKey == "" || r2SecretKey == "" {
		log.Fatal("Error: Missing required environment variables")
	}

	log.Println("🚀 Backup Service Started. Schedule: Daily at 03:00 AM UTC")

	for {
		now := time.Now()
		nextRun := time.Date(now.Year(), now.Month(), now.Day(), 3, 0, 0, 0, time.UTC)
		if now.After(nextRun) {
			nextRun = nextRun.Add(24 * time.Hour)
		}
		duration := nextRun.Sub(now)

		log.Printf("Sleeping for %v until next backup...", duration)
		time.Sleep(duration)

		log.Println("⏰ Starting Backup Process...")
		if err := performBackup(dbURL, r2AccountID, r2AccessKey, r2SecretKey, r2Bucket); err != nil {
			log.Printf("❌ Backup Failed: %v", err)
		} else {
			log.Println("✅ Backup Completed Successfully")
		}
	}
}

func performBackup(dbURL, accountID, accessKey, secretKey, bucket string) error {
	timestamp := time.Now().Format("2006-01-02_15-04-05")
	fileName := fmt.Sprintf("backup_%s.sql.gz", timestamp)
	localPath := "/tmp/" + fileName

	// ✅ FIX 1: Strip Prisma-specific query parameters (?schema=public)
	// pg_dump strictly requires a clean URI
	cleanURL := strings.Split(dbURL, "?")[0]

	// ✅ FIX 2: Use --dbname flag and wrap in quotes to handle special characters
	cmdStr := fmt.Sprintf("pg_dump --dbname='%s' --no-owner --clean | gzip > %s", cleanURL, localPath)
	cmd := exec.Command("sh", "-c", cmdStr)

	var stderr bytes.Buffer
	cmd.Stderr = &stderr

	log.Println("Dump & Compress: In Progress...")
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("pg_dump failed: %v | stderr: %s", err, stderr.String())
	}

	// ✅ FIX 3: Verify the file size (20 bytes = empty gzip header)
	fileInfo, err := os.Stat(localPath)
	if err != nil {
		return err
	}
	if fileInfo.Size() < 200 {
		return fmt.Errorf("backup failed: produced file is too small (%d bytes), check logs for URI errors", fileInfo.Size())
	}

	log.Printf("✅ Backup file created: %s (%d bytes)", fileName, fileInfo.Size())

	// Step B: Upload to R2
	log.Println("Upload: Sending to Cloudflare R2...")
	file, err := os.Open(localPath)
	if err != nil {
		return err
	}
	defer file.Close()
	defer os.Remove(localPath)

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

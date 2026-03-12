# Build Stage
FROM golang:1.24-alpine AS builder
WORKDIR /app
COPY . .
RUN go build -o backup-service main.go

# Final Stage
FROM alpine:latest
WORKDIR /app

# ✅ CRITICAL: Install postgresql-client (and gzip/ca-certificates)
RUN apk add --no-cache postgresql17-client gzip ca-certificates

COPY --from=builder /app/backup-service .

# Create the tmp directory for backups
RUN mkdir -p /tmp

CMD ["./backup-service"]
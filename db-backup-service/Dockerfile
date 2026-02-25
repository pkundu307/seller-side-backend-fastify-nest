# --- Build Stage ---
FROM golang:1.24-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o backup-service .

# --- Runtime Stage ---
# We use Alpine because we need to install 'postgresql-client'
FROM alpine:latest

# Install pg_dump (postgresql-client) and certificates
RUN apk add --no-cache postgresql-client ca-certificates

WORKDIR /root/
COPY --from=builder /app/backup-service .

CMD ["./backup-service"]
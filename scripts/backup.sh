#!/bin/bash

# Backup script for Agenda PMS
set -e

# Configuration
BACKUP_DIR="backups"
RETENTION_DAYS=30
LOG_FILE="backup.log"
DATE=$(date +%Y%m%d-%H%M%S)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}" | tee -a $LOG_FILE
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}" | tee -a $LOG_FILE
    exit 1
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}" | tee -a $LOG_FILE
}

# Create backup directory
create_backup_dir() {
    mkdir -p "$BACKUP_DIR"
    log "Backup directory created: $BACKUP_DIR"
}

# Database backup
backup_database() {
    log "Starting database backup..."
    
    if [ -z "$DATABASE_URL" ]; then
        warn "DATABASE_URL not set, skipping database backup"
        return
    fi
    
    local db_backup_file="$BACKUP_DIR/database-$DATE.sql"
    
    # Create database backup
    if command -v pg_dump >/dev/null 2>&1; then
        log "Creating database backup with pg_dump..."
        pg_dump "$DATABASE_URL" > "$db_backup_file" || error "Database backup failed"
        
        # Compress the backup
        gzip "$db_backup_file"
        log "Database backup completed: ${db_backup_file}.gz"
    else
        warn "pg_dump not found, skipping database backup"
    fi
}

# File backup (uploaded files, receipts, etc.)
backup_files() {
    log "Starting file backup..."
    
    local files_backup_file="$BACKUP_DIR/files-$DATE.tar.gz"
    local upload_dirs=("uploads" "receipts" "exports")
    local backup_paths=()
    
    # Check which directories exist
    for dir in "${upload_dirs[@]}"; do
        if [ -d "$dir" ]; then
            backup_paths+=("$dir")
        fi
    done
    
    if [ ${#backup_paths[@]} -eq 0 ]; then
        log "No file directories found to backup"
        return
    fi
    
    # Create file backup
    tar -czf "$files_backup_file" "${backup_paths[@]}" 2>/dev/null || warn "Some files may not have been backed up"
    
    if [ -f "$files_backup_file" ]; then
        log "File backup completed: $files_backup_file"
    else
        warn "File backup may have failed"
    fi
}

# Configuration backup
backup_config() {
    log "Starting configuration backup..."
    
    local config_backup_file="$BACKUP_DIR/config-$DATE.tar.gz"
    local config_files=(
        ".env.production"
        "package.json"
        "package-lock.json"
        "next.config.js"
        "tailwind.config.ts"
        "tsconfig.json"
        "supabase/migrations"
    )
    
    local existing_files=()
    
    # Check which config files exist
    for file in "${config_files[@]}"; do
        if [ -e "$file" ]; then
            existing_files+=("$file")
        fi
    done
    
    if [ ${#existing_files[@]} -eq 0 ]; then
        warn "No configuration files found to backup"
        return
    fi
    
    # Create configuration backup
    tar -czf "$config_backup_file" "${existing_files[@]}" 2>/dev/null || warn "Some config files may not have been backed up"
    
    if [ -f "$config_backup_file" ]; then
        log "Configuration backup completed: $config_backup_file"
    else
        warn "Configuration backup may have failed"
    fi
}

# Cleanup old backups
cleanup_old_backups() {
    log "Cleaning up old backups (older than $RETENTION_DAYS days)..."
    
    # Remove old backup files
    find "$BACKUP_DIR" -name "*.sql.gz" -mtime +$RETENTION_DAYS -delete 2>/dev/null || true
    find "$BACKUP_DIR" -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete 2>/dev/null || true
    
    log "Old backup cleanup completed"
}

# Verify backup integrity
verify_backups() {
    log "Verifying backup integrity..."
    
    local backup_files=($(find "$BACKUP_DIR" -name "*-$DATE.*" -type f))
    local verified=0
    local failed=0
    
    for file in "${backup_files[@]}"; do
        if [ "${file##*.}" = "gz" ]; then
            if gzip -t "$file" 2>/dev/null; then
                log "✓ Backup verified: $(basename "$file")"
                ((verified++))
            else
                warn "✗ Backup verification failed: $(basename "$file")"
                ((failed++))
            fi
        else
            # For non-compressed files, just check if they exist and are not empty
            if [ -s "$file" ]; then
                log "✓ Backup verified: $(basename "$file")"
                ((verified++))
            else
                warn "✗ Backup verification failed: $(basename "$file")"
                ((failed++))
            fi
        fi
    done
    
    log "Backup verification completed: $verified verified, $failed failed"
    
    if [ $failed -gt 0 ]; then
        warn "Some backups failed verification"
    fi
}

# Send backup notification (optional)
send_notification() {
    if [ ! -z "$BACKUP_NOTIFICATION_URL" ]; then
        log "Sending backup notification..."
        
        local message="Backup completed successfully at $(date)"
        local payload="{\"text\":\"$message\"}"
        
        curl -X POST -H 'Content-type: application/json' \
             --data "$payload" \
             "$BACKUP_NOTIFICATION_URL" >/dev/null 2>&1 || warn "Failed to send notification"
    fi
}

# Main backup function
main() {
    log "Starting backup process..."
    
    # Load environment variables if available
    if [ -f ".env.production" ]; then
        source .env.production
    fi
    
    # Create log file
    touch $LOG_FILE
    
    # Run backup steps
    create_backup_dir
    backup_database
    backup_files
    backup_config
    verify_backups
    cleanup_old_backups
    send_notification
    
    log "🎉 Backup process completed successfully!"
    
    # Display backup summary
    log "Backup summary:"
    ls -lh "$BACKUP_DIR"/*-$DATE.* 2>/dev/null || log "No backups created for this run"
}

# Handle script interruption
trap 'error "Backup interrupted"' INT TERM

# Check if running as scheduled backup
if [ "$1" = "--scheduled" ]; then
    log "Running scheduled backup..."
fi

# Run main function
main "$@"
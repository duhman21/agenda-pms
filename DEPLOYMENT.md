# Deployment Guide

This guide covers the deployment process for the Agenda PMS application.

## Pre-Deployment Checklist

### Environment Setup
- [ ] Copy `.env.production.template` to `.env.production`
- [ ] Configure all required environment variables
- [ ] Set up Supabase project and database
- [ ] Configure authentication providers
- [ ] Set up email service (SMTP)
- [ ] Configure file storage (if using external storage)

### Security
- [ ] Generate secure `NEXTAUTH_SECRET` (minimum 32 characters)
- [ ] Configure HTTPS/SSL certificates
- [ ] Set up proper CORS policies
- [ ] Review and configure CSP headers
- [ ] Enable rate limiting
- [ ] Configure security headers

### Database
- [ ] Run database migrations
- [ ] Set up database backups
- [ ] Configure connection pooling
- [ ] Set up monitoring for database performance
- [ ] Test database connectivity

### Performance
- [ ] Run performance tests with Lighthouse
- [ ] Optimize images and assets
- [ ] Configure CDN (if applicable)
- [ ] Set up caching strategies
- [ ] Test application under load

### Monitoring
- [ ] Set up application monitoring
- [ ] Configure error tracking (Sentry, etc.)
- [ ] Set up log aggregation
- [ ] Configure health checks
- [ ] Set up alerting

## Deployment Methods

### Method 1: Vercel (Recommended)

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Deploy**
   ```bash
   vercel --prod
   ```

4. **Configure Environment Variables**
   - Go to Vercel dashboard
   - Add all production environment variables
   - Redeploy if needed

### Method 2: Docker Deployment

1. **Build Docker Image**
   ```bash
   npm run docker:build
   ```

2. **Run with Docker Compose**
   ```bash
   npm run docker:compose
   ```

3. **Or run standalone**
   ```bash
   npm run docker:run
   ```

### Method 3: Manual Deployment

1. **Run Deployment Script**
   ```bash
   npm run deploy
   ```

2. **Follow the script prompts**
   - The script will run all pre-deployment checks
   - Create backups
   - Build the application
   - Deploy to your chosen platform

## Environment Variables

### Required Variables
```env
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-domain.com
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXTAUTH_SECRET=your-nextauth-secret-min-32-chars
NEXTAUTH_URL=https://your-domain.com
DATABASE_URL=postgresql://postgres:password@db.your-project.supabase.co:5432/postgres
```

### Optional Variables
```env
SMTP_HOST=smtp.your-provider.com
SMTP_PORT=587
SMTP_USER=your-email@domain.com
SMTP_PASSWORD=your-email-password
SMTP_FROM=noreply@your-domain.com
LOG_LEVEL=info
RATE_LIMIT_REQUESTS_PER_MINUTE=60
BACKUP_ENABLED=true
```

## Database Setup

### 1. Supabase Setup
1. Create a new Supabase project
2. Copy the project URL and anon key
3. Generate a service role key
4. Configure RLS policies

### 2. Run Migrations
```bash
# If using Supabase CLI
supabase db push

# Or run the SQL files manually in Supabase dashboard
```

### 3. Set up Backups
```bash
# Configure automated backups
npm run backup
```

## Monitoring and Maintenance

### Health Checks
The application includes a health check endpoint at `/api/health`:

```bash
curl https://your-domain.com/api/health
```

### Monitoring Setup
1. **Application Performance**
   - Set up Lighthouse CI for performance monitoring
   - Configure alerts for performance degradation

2. **Error Tracking**
   - Integrate with Sentry or similar service
   - Set up error alerting

3. **Uptime Monitoring**
   - Use services like Pingdom, UptimeRobot
   - Monitor critical endpoints

### Backup Strategy
1. **Automated Backups**
   ```bash
   # Set up cron job for daily backups
   0 2 * * * /path/to/your/app/scripts/backup.sh --scheduled
   ```

2. **Backup Verification**
   - Test backup restoration regularly
   - Monitor backup success/failure

### Log Management
1. **Log Levels**
   - Production: `info` or `warn`
   - Development: `debug`

2. **Log Rotation**
   - Configure log rotation to prevent disk space issues
   - Archive old logs

## Scaling Considerations

### Horizontal Scaling
- Use load balancers
- Configure session storage (Redis)
- Implement database connection pooling

### Performance Optimization
- Enable compression
- Use CDN for static assets
- Implement caching strategies
- Optimize database queries

### Security Hardening
- Regular security updates
- Penetration testing
- Security headers configuration
- Rate limiting implementation

## Troubleshooting

### Common Issues

1. **Build Failures**
   - Check environment variables
   - Verify dependencies
   - Check TypeScript errors

2. **Database Connection Issues**
   - Verify connection string
   - Check firewall settings
   - Validate credentials

3. **Performance Issues**
   - Check database query performance
   - Monitor memory usage
   - Analyze bundle size

### Debug Commands
```bash
# Check application health
npm run health-check

# Analyze bundle size
npm run analyze

# Run performance tests
npm run test:e2e

# Check logs
docker logs agenda-pms
```

## Rollback Procedure

1. **Identify the Issue**
   - Check monitoring dashboards
   - Review error logs
   - Verify health checks

2. **Quick Rollback**
   ```bash
   # For Vercel
   vercel rollback

   # For Docker
   docker-compose down
   docker-compose up -d --scale app=0
   # Deploy previous version
   ```

3. **Database Rollback**
   ```bash
   # Restore from backup if needed
   ./scripts/restore-backup.sh backup-file.sql
   ```

## Support and Maintenance

### Regular Tasks
- [ ] Monitor application performance
- [ ] Review error logs
- [ ] Update dependencies
- [ ] Security patches
- [ ] Backup verification
- [ ] Performance optimization

### Emergency Contacts
- Development Team: [contact-info]
- Infrastructure Team: [contact-info]
- Database Administrator: [contact-info]

### Documentation
- API Documentation: `/api/docs`
- User Manual: `/docs/user-manual`
- Admin Guide: `/docs/admin-guide`
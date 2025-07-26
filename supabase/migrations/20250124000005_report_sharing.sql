-- Create shared_reports table for secure report sharing
CREATE TABLE shared_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
    report_id UUID NOT NULL,
    share_token UUID DEFAULT gen_random_uuid() NOT NULL UNIQUE,
    shared_with_email VARCHAR(255),
    shared_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    expires_at TIMESTAMP,
    access_count INTEGER DEFAULT 0,
    max_access_count INTEGER,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create email_report_schedules table for automated report emails
CREATE TABLE email_report_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
    owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    property_ids UUID[],
    schedule_type VARCHAR(20) NOT NULL CHECK (schedule_type IN ('monthly', 'weekly', 'quarterly')),
    day_of_month INTEGER CHECK (day_of_month >= 1 AND day_of_month <= 31),
    day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6),
    is_active BOOLEAN DEFAULT TRUE,
    last_sent TIMESTAMP,
    next_send TIMESTAMP NOT NULL,
    format VARCHAR(10) DEFAULT 'pdf' CHECK (format IN ('pdf', 'csv')),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_shared_reports_tenant_id ON shared_reports(tenant_id);
CREATE INDEX idx_shared_reports_share_token ON shared_reports(share_token);
CREATE INDEX idx_shared_reports_expires_at ON shared_reports(expires_at);
CREATE INDEX idx_email_report_schedules_tenant_id ON email_report_schedules(tenant_id);
CREATE INDEX idx_email_report_schedules_owner_id ON email_report_schedules(owner_id);
CREATE INDEX idx_email_report_schedules_next_send ON email_report_schedules(next_send);

-- Enable RLS
ALTER TABLE shared_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_report_schedules ENABLE ROW LEVEL SECURITY;

-- RLS policies for shared_reports
CREATE POLICY "Users can only access their tenant's shared reports" ON shared_reports
    FOR ALL USING (tenant_id = (auth.jwt() ->> 'tenant_id')::UUID);

-- RLS policies for email_report_schedules
CREATE POLICY "Users can only access their tenant's email schedules" ON email_report_schedules
    FOR ALL USING (tenant_id = (auth.jwt() ->> 'tenant_id')::UUID);

-- Property owners can only see their own schedules
CREATE POLICY "Property owners can only see their own schedules" ON email_report_schedules
    FOR SELECT USING (
        CASE 
            WHEN (auth.jwt() ->> 'role') = 'owner' THEN owner_id = auth.uid()
            ELSE TRUE
        END
    );

-- Only admins and staff can create/update schedules
CREATE POLICY "Only admins and staff can modify schedules" ON email_report_schedules
    FOR INSERT WITH CHECK ((auth.jwt() ->> 'role') IN ('admin', 'staff'));

CREATE POLICY "Only admins and staff can update schedules" ON email_report_schedules
    FOR UPDATE USING ((auth.jwt() ->> 'role') IN ('admin', 'staff'));

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_shared_reports_updated_at BEFORE UPDATE ON shared_reports
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_report_schedules_updated_at BEFORE UPDATE ON email_report_schedules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to cleanup expired shared reports
CREATE OR REPLACE FUNCTION cleanup_expired_shared_reports()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM shared_reports 
    WHERE expires_at IS NOT NULL AND expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate next send date for email schedules
CREATE OR REPLACE FUNCTION calculate_next_send_date(
    schedule_type VARCHAR,
    day_of_month INTEGER DEFAULT NULL,
    day_of_week INTEGER DEFAULT NULL,
    from_date TIMESTAMP DEFAULT NOW()
)
RETURNS TIMESTAMP AS $$
DECLARE
    next_date TIMESTAMP;
    current_date TIMESTAMP := from_date;
BEGIN
    CASE schedule_type
        WHEN 'monthly' THEN
            -- Set to the specified day of next month
            next_date := date_trunc('month', current_date) + INTERVAL '1 month' + 
                        (COALESCE(day_of_month, 1) - 1) * INTERVAL '1 day';
            
            -- If the day doesn't exist in the month (e.g., Feb 31), use last day of month
            IF EXTRACT(DAY FROM next_date) != COALESCE(day_of_month, 1) THEN
                next_date := date_trunc('month', next_date) + INTERVAL '1 month' - INTERVAL '1 day';
            END IF;
            
        WHEN 'weekly' THEN
            -- Set to the specified day of next week
            next_date := date_trunc('week', current_date) + INTERVAL '1 week' + 
                        COALESCE(day_of_week, 1) * INTERVAL '1 day';
                        
        WHEN 'quarterly' THEN
            -- Set to the specified day of next quarter
            next_date := date_trunc('quarter', current_date) + INTERVAL '3 months' + 
                        (COALESCE(day_of_month, 1) - 1) * INTERVAL '1 day';
            
            -- If the day doesn't exist in the month, use last day of month
            IF EXTRACT(DAY FROM next_date) != COALESCE(day_of_month, 1) THEN
                next_date := date_trunc('month', next_date) + INTERVAL '1 month' - INTERVAL '1 day';
            END IF;
            
        ELSE
            RAISE EXCEPTION 'Invalid schedule_type: %', schedule_type;
    END CASE;
    
    RETURN next_date;
END;
$$ LANGUAGE plpgsql;
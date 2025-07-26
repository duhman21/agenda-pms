-- Database Functions and Triggers for Automated Tasks

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at columns
CREATE TRIGGER update_tenants_updated_at 
    BEFORE UPDATE ON tenants 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at 
    BEFORE UPDATE ON user_profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_properties_updated_at 
    BEFORE UPDATE ON properties 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at 
    BEFORE UPDATE ON bookings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at 
    BEFORE UPDATE ON tasks 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_expenses_updated_at 
    BEFORE UPDATE ON expenses 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically set completed_at when task status changes to completed
CREATE OR REPLACE FUNCTION set_task_completed_at()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        NEW.completed_at = NOW();
    ELSIF NEW.status != 'completed' THEN
        NEW.completed_at = NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_task_completed_at_trigger
    BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION set_task_completed_at();

-- Function to create audit log entries
CREATE OR REPLACE FUNCTION create_audit_log()
RETURNS TRIGGER AS $$
DECLARE
    tenant_id_val UUID;
BEGIN
    -- Get tenant_id from the record
    IF TG_OP = 'DELETE' THEN
        tenant_id_val := OLD.tenant_id;
    ELSE
        tenant_id_val := NEW.tenant_id;
    END IF;

    -- Insert audit log entry
    INSERT INTO audit_logs (
        tenant_id,
        table_name,
        record_id,
        action,
        old_values,
        new_values,
        user_id
    ) VALUES (
        tenant_id_val,
        TG_TABLE_NAME,
        CASE 
            WHEN TG_OP = 'DELETE' THEN OLD.id
            ELSE NEW.id
        END,
        TG_OP,
        CASE 
            WHEN TG_OP = 'DELETE' THEN row_to_json(OLD)
            WHEN TG_OP = 'UPDATE' THEN row_to_json(OLD)
            ELSE NULL
        END,
        CASE 
            WHEN TG_OP = 'INSERT' THEN row_to_json(NEW)
            WHEN TG_OP = 'UPDATE' THEN row_to_json(NEW)
            ELSE NULL
        END,
        auth.uid()
    );

    RETURN CASE 
        WHEN TG_OP = 'DELETE' THEN OLD
        ELSE NEW
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create audit triggers for key tables
CREATE TRIGGER audit_properties_trigger
    AFTER INSERT OR UPDATE OR DELETE ON properties
    FOR EACH ROW EXECUTE FUNCTION create_audit_log();

CREATE TRIGGER audit_bookings_trigger
    AFTER INSERT OR UPDATE OR DELETE ON bookings
    FOR EACH ROW EXECUTE FUNCTION create_audit_log();

CREATE TRIGGER audit_expenses_trigger
    AFTER INSERT OR UPDATE OR DELETE ON expenses
    FOR EACH ROW EXECUTE FUNCTION create_audit_log();

-- Function to automatically generate cleaning tasks after booking checkout
CREATE OR REPLACE FUNCTION generate_cleaning_tasks()
RETURNS TRIGGER AS $$
BEGIN
    -- Only generate tasks for new bookings or when check_out date changes
    IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.check_out != NEW.check_out) THEN
        -- Insert cleaning task
        INSERT INTO tasks (
            tenant_id,
            property_id,
            title,
            description,
            due_date,
            status,
            auto_generated
        ) VALUES (
            NEW.tenant_id,
            NEW.property_id,
            'Cleaning after checkout - ' || COALESCE(NEW.guest_name, 'Guest'),
            'Clean and prepare property after guest checkout on ' || NEW.check_out::text,
            NEW.check_out::timestamp + INTERVAL '2 hours',
            'pending',
            TRUE
        );

        -- Insert maintenance check task
        INSERT INTO tasks (
            tenant_id,
            property_id,
            title,
            description,
            due_date,
            status,
            auto_generated
        ) VALUES (
            NEW.tenant_id,
            NEW.property_id,
            'Maintenance check - ' || COALESCE(NEW.guest_name, 'Guest'),
            'Perform maintenance check after guest checkout on ' || NEW.check_out::text,
            NEW.check_out::timestamp + INTERVAL '4 hours',
            'pending',
            TRUE
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER generate_cleaning_tasks_trigger
    AFTER INSERT OR UPDATE ON bookings
    FOR EACH ROW EXECUTE FUNCTION generate_cleaning_tasks();

-- Function to prevent booking overlaps
CREATE OR REPLACE FUNCTION prevent_booking_overlaps()
RETURNS TRIGGER AS $$
BEGIN
    -- Check for overlapping bookings on the same property
    IF EXISTS (
        SELECT 1 FROM bookings 
        WHERE property_id = NEW.property_id 
        AND tenant_id = NEW.tenant_id
        AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID)
        AND (
            (NEW.check_in >= check_in AND NEW.check_in < check_out) OR
            (NEW.check_out > check_in AND NEW.check_out <= check_out) OR
            (NEW.check_in <= check_in AND NEW.check_out >= check_out)
        )
    ) THEN
        RAISE EXCEPTION 'Booking dates overlap with existing booking for this property';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_booking_overlaps_trigger
    BEFORE INSERT OR UPDATE ON bookings
    FOR EACH ROW EXECUTE FUNCTION prevent_booking_overlaps();

-- Function to validate property ownership percentages
CREATE OR REPLACE FUNCTION validate_ownership_percentages()
RETURNS TRIGGER AS $$
DECLARE
    total_percentage DECIMAL(5,2);
BEGIN
    -- Calculate total ownership percentage for the property
    SELECT COALESCE(SUM(ownership_percentage), 0) INTO total_percentage
    FROM property_owners 
    WHERE property_id = NEW.property_id 
    AND tenant_id = NEW.tenant_id
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID);

    -- Add the new/updated percentage
    total_percentage := total_percentage + NEW.ownership_percentage;

    -- Check if total exceeds 100%
    IF total_percentage > 100 THEN
        RAISE EXCEPTION 'Total ownership percentage cannot exceed 100%% for property';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_ownership_percentages_trigger
    BEFORE INSERT OR UPDATE ON property_owners
    FOR EACH ROW EXECUTE FUNCTION validate_ownership_percentages();

-- Function to get tenant statistics
CREATE OR REPLACE FUNCTION get_tenant_stats(tenant_uuid UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'properties_count', (SELECT COUNT(*) FROM properties WHERE tenant_id = tenant_uuid),
        'active_bookings', (SELECT COUNT(*) FROM bookings WHERE tenant_id = tenant_uuid AND check_out >= CURRENT_DATE),
        'pending_tasks', (SELECT COUNT(*) FROM tasks WHERE tenant_id = tenant_uuid AND status = 'pending'),
        'total_revenue_this_month', (
            SELECT COALESCE(SUM(revenue), 0) 
            FROM bookings 
            WHERE tenant_id = tenant_uuid 
            AND check_in >= date_trunc('month', CURRENT_DATE)
            AND check_in < date_trunc('month', CURRENT_DATE) + INTERVAL '1 month'
        ),
        'total_expenses_this_month', (
            SELECT COALESCE(SUM(amount), 0) 
            FROM expenses 
            WHERE tenant_id = tenant_uuid 
            AND expense_date >= date_trunc('month', CURRENT_DATE)::date
            AND expense_date < (date_trunc('month', CURRENT_DATE) + INTERVAL '1 month')::date
        )
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up old audit logs (keep last 6 months)
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM audit_logs 
    WHERE created_at < NOW() - INTERVAL '6 months';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
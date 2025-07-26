-- Performance optimization indexes
-- These indexes will significantly improve query performance for common operations

-- Properties table indexes
CREATE INDEX IF NOT EXISTS idx_properties_tenant_id ON properties(tenant_id);
CREATE INDEX IF NOT EXISTS idx_properties_name ON properties(name);
CREATE INDEX IF NOT EXISTS idx_properties_tenant_name ON properties(tenant_id, name);

-- Property owners indexes
CREATE INDEX IF NOT EXISTS idx_property_owners_tenant_id ON property_owners(tenant_id);
CREATE INDEX IF NOT EXISTS idx_property_owners_property_id ON property_owners(property_id);
CREATE INDEX IF NOT EXISTS idx_property_owners_owner_id ON property_owners(owner_id);
CREATE INDEX IF NOT EXISTS idx_property_owners_tenant_property ON property_owners(tenant_id, property_id);

-- Bookings table indexes
CREATE INDEX IF NOT EXISTS idx_bookings_tenant_id ON bookings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_bookings_property_id ON bookings(property_id);
CREATE INDEX IF NOT EXISTS idx_bookings_check_in ON bookings(check_in);
CREATE INDEX IF NOT EXISTS idx_bookings_check_out ON bookings(check_out);
CREATE INDEX IF NOT EXISTS idx_bookings_tenant_property ON bookings(tenant_id, property_id);
CREATE INDEX IF NOT EXISTS idx_bookings_tenant_dates ON bookings(tenant_id, check_in, check_out);
CREATE INDEX IF NOT EXISTS idx_bookings_property_dates ON bookings(property_id, check_in, check_out);
CREATE INDEX IF NOT EXISTS idx_bookings_revenue ON bookings(revenue) WHERE revenue IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_source ON bookings(source);
CREATE INDEX IF NOT EXISTS idx_bookings_ical_uid ON bookings(ical_uid) WHERE ical_uid IS NOT NULL;

-- Tasks table indexes
CREATE INDEX IF NOT EXISTS idx_tasks_tenant_id ON tasks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tasks_property_id ON tasks(property_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_tenant_assigned ON tasks(tenant_id, assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_tenant_status ON tasks(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_property_status ON tasks(property_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_status ON tasks(due_date, status);
CREATE INDEX IF NOT EXISTS idx_tasks_auto_generated ON tasks(auto_generated);

-- Expenses table indexes
CREATE INDEX IF NOT EXISTS idx_expenses_tenant_id ON expenses(tenant_id);
CREATE INDEX IF NOT EXISTS idx_expenses_property_id ON expenses(property_id);
CREATE INDEX IF NOT EXISTS idx_expenses_expense_date ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
CREATE INDEX IF NOT EXISTS idx_expenses_tenant_property ON expenses(tenant_id, property_id);
CREATE INDEX IF NOT EXISTS idx_expenses_tenant_dates ON expenses(tenant_id, expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_property_dates ON expenses(property_id, expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_amount ON expenses(amount);

-- User profiles indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_tenant_id ON user_profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_tenant_role ON user_profiles(tenant_id, role);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_bookings_revenue_reporting ON bookings(tenant_id, check_in, property_id, revenue) WHERE revenue IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_expenses_reporting ON expenses(tenant_id, expense_date, property_id, amount, category);
CREATE INDEX IF NOT EXISTS idx_tasks_dashboard ON tasks(tenant_id, assigned_to, status, due_date);

-- Partial indexes for better performance on filtered queries
CREATE INDEX IF NOT EXISTS idx_bookings_active ON bookings(tenant_id, property_id, check_in, check_out) WHERE check_out >= CURRENT_DATE;
CREATE INDEX IF NOT EXISTS idx_tasks_pending ON tasks(tenant_id, assigned_to, due_date) WHERE status IN ('pending', 'in_progress');
CREATE INDEX IF NOT EXISTS idx_tasks_overdue ON tasks(tenant_id, assigned_to, due_date) WHERE status != 'completed' AND due_date < NOW();

-- Text search indexes for better search performance
CREATE INDEX IF NOT EXISTS idx_properties_name_text ON properties USING gin(to_tsvector('english', name));
CREATE INDEX IF NOT EXISTS idx_tasks_title_text ON tasks USING gin(to_tsvector('english', title));
CREATE INDEX IF NOT EXISTS idx_expenses_description_text ON expenses USING gin(to_tsvector('english', description)) WHERE description IS NOT NULL;

-- Covering indexes for read-heavy queries
CREATE INDEX IF NOT EXISTS idx_properties_list_covering ON properties(tenant_id, name) INCLUDE (id, address, description, created_at);
CREATE INDEX IF NOT EXISTS idx_bookings_calendar_covering ON bookings(property_id, check_in, check_out) INCLUDE (id, guest_name, revenue, source);
CREATE INDEX IF NOT EXISTS idx_tasks_list_covering ON tasks(tenant_id, assigned_to, status) INCLUDE (id, title, due_date, property_id);

-- Performance monitoring views
CREATE OR REPLACE VIEW performance_stats AS
SELECT 
  schemaname,
  tablename,
  attname,
  n_distinct,
  correlation,
  most_common_vals,
  most_common_freqs
FROM pg_stats 
WHERE schemaname = 'public' 
  AND tablename IN ('properties', 'bookings', 'tasks', 'expenses', 'user_profiles', 'property_owners')
ORDER BY tablename, attname;

-- Query performance monitoring function
CREATE OR REPLACE FUNCTION get_slow_queries()
RETURNS TABLE(
  query text,
  calls bigint,
  total_time double precision,
  mean_time double precision,
  rows bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pg_stat_statements.query,
    pg_stat_statements.calls,
    pg_stat_statements.total_exec_time as total_time,
    pg_stat_statements.mean_exec_time as mean_time,
    pg_stat_statements.rows
  FROM pg_stat_statements
  WHERE pg_stat_statements.mean_exec_time > 100 -- queries taking more than 100ms
  ORDER BY pg_stat_statements.mean_exec_time DESC
  LIMIT 20;
END;
$$ LANGUAGE plpgsql;

-- Index usage monitoring
CREATE OR REPLACE VIEW index_usage_stats AS
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_tup_read,
  idx_tup_fetch,
  idx_scan,
  CASE 
    WHEN idx_scan = 0 THEN 'Unused'
    WHEN idx_scan < 10 THEN 'Low usage'
    ELSE 'Active'
  END as usage_status
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;
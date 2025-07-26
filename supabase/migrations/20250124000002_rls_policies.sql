-- Row Level Security (RLS) Policies for Multi-tenant Data Isolation

-- Enable RLS on all tables
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user's tenant_id from JWT
CREATE OR REPLACE FUNCTION get_current_tenant_id()
RETURNS UUID AS $$
BEGIN
    RETURN (auth.jwt() ->> 'tenant_id')::UUID;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE id = auth.uid() 
        AND role = 'admin'
        AND tenant_id = get_current_tenant_id()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user is staff or admin
CREATE OR REPLACE FUNCTION is_staff_or_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE id = auth.uid() 
        AND role IN ('admin', 'staff')
        AND tenant_id = get_current_tenant_id()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Tenants table policies
CREATE POLICY "Users can view their own tenant" ON tenants
    FOR SELECT USING (id = get_current_tenant_id());

CREATE POLICY "Admins can update their tenant" ON tenants
    FOR UPDATE USING (id = get_current_tenant_id() AND is_admin());

-- User profiles table policies
CREATE POLICY "Users can view profiles in their tenant" ON user_profiles
    FOR SELECT USING (tenant_id = get_current_tenant_id());

CREATE POLICY "Users can view their own profile" ON user_profiles
    FOR SELECT USING (id = auth.uid());

CREATE POLICY "Users can update their own profile" ON user_profiles
    FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Admins can manage all profiles in their tenant" ON user_profiles
    FOR ALL USING (tenant_id = get_current_tenant_id() AND is_admin());

-- Properties table policies
CREATE POLICY "Users can view properties in their tenant" ON properties
    FOR SELECT USING (tenant_id = get_current_tenant_id());

CREATE POLICY "Staff and admins can manage properties" ON properties
    FOR ALL USING (tenant_id = get_current_tenant_id() AND is_staff_or_admin());

CREATE POLICY "Property owners can view their properties" ON properties
    FOR SELECT USING (
        tenant_id = get_current_tenant_id() 
        AND EXISTS (
            SELECT 1 FROM property_owners po 
            WHERE po.property_id = id 
            AND po.owner_id = auth.uid()
        )
    );

-- Property owners table policies
CREATE POLICY "Users can view property ownership in their tenant" ON property_owners
    FOR SELECT USING (tenant_id = get_current_tenant_id());

CREATE POLICY "Staff and admins can manage property ownership" ON property_owners
    FOR ALL USING (tenant_id = get_current_tenant_id() AND is_staff_or_admin());

-- Bookings table policies
CREATE POLICY "Users can view bookings in their tenant" ON bookings
    FOR SELECT USING (tenant_id = get_current_tenant_id());

CREATE POLICY "Staff and admins can manage bookings" ON bookings
    FOR ALL USING (tenant_id = get_current_tenant_id() AND is_staff_or_admin());

CREATE POLICY "Property owners can view their property bookings" ON bookings
    FOR SELECT USING (
        tenant_id = get_current_tenant_id() 
        AND EXISTS (
            SELECT 1 FROM property_owners po 
            WHERE po.property_id = bookings.property_id 
            AND po.owner_id = auth.uid()
        )
    );

-- Tasks table policies
CREATE POLICY "Users can view tasks in their tenant" ON tasks
    FOR SELECT USING (tenant_id = get_current_tenant_id());

CREATE POLICY "Staff and admins can manage all tasks" ON tasks
    FOR ALL USING (tenant_id = get_current_tenant_id() AND is_staff_or_admin());

CREATE POLICY "Staff can view and update their assigned tasks" ON tasks
    FOR SELECT USING (
        tenant_id = get_current_tenant_id() 
        AND assigned_to = auth.uid()
    );

CREATE POLICY "Staff can update their assigned tasks" ON tasks
    FOR UPDATE USING (
        tenant_id = get_current_tenant_id() 
        AND assigned_to = auth.uid()
    );

-- Expenses table policies
CREATE POLICY "Users can view expenses in their tenant" ON expenses
    FOR SELECT USING (tenant_id = get_current_tenant_id());

CREATE POLICY "Staff and admins can manage expenses" ON expenses
    FOR ALL USING (tenant_id = get_current_tenant_id() AND is_staff_or_admin());

CREATE POLICY "Property owners can view their property expenses" ON expenses
    FOR SELECT USING (
        tenant_id = get_current_tenant_id() 
        AND EXISTS (
            SELECT 1 FROM property_owners po 
            WHERE po.property_id = expenses.property_id 
            AND po.owner_id = auth.uid()
        )
    );

-- Audit logs table policies
CREATE POLICY "Admins can view audit logs in their tenant" ON audit_logs
    FOR SELECT USING (tenant_id = get_current_tenant_id() AND is_admin());

CREATE POLICY "System can insert audit logs" ON audit_logs
    FOR INSERT WITH CHECK (tenant_id = get_current_tenant_id());
-- Create iCal sync status table
CREATE TABLE ical_sync_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE NOT NULL,
    last_sync TIMESTAMP,
    last_sync_status VARCHAR(20) CHECK (last_sync_status IN ('success', 'error', 'in_progress')),
    last_error TEXT,
    next_sync TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(property_id)
);

-- Enable RLS
ALTER TABLE ical_sync_status ENABLE ROW LEVEL SECURITY;

-- RLS policy for ical_sync_status
CREATE POLICY "Users can only access their tenant's sync status" ON ical_sync_status
    FOR ALL USING (tenant_id = (auth.jwt() ->> 'tenant_id')::UUID);

-- Index for performance
CREATE INDEX idx_ical_sync_status_tenant_id ON ical_sync_status(tenant_id);
CREATE INDEX idx_ical_sync_status_next_sync ON ical_sync_status(next_sync) WHERE next_sync IS NOT NULL;
CREATE INDEX idx_ical_sync_status_property_id ON ical_sync_status(property_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_ical_sync_status_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_ical_sync_status_updated_at
    BEFORE UPDATE ON ical_sync_status
    FOR EACH ROW
    EXECUTE FUNCTION update_ical_sync_status_updated_at();
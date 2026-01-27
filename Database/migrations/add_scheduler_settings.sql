-- Add scheduler_settings table
-- Run this migration to add the scheduler settings functionality

-- Create the scheduler_settings table
CREATE TABLE IF NOT EXISTS scheduler_settings (
    id SERIAL PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value VARCHAR(500) NOT NULL,
    setting_type VARCHAR(20) DEFAULT 'string',
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_scheduler_settings_type CHECK (setting_type IN ('string', 'integer', 'float', 'boolean'))
);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_scheduler_settings_updated_at 
    BEFORE UPDATE ON scheduler_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default scheduler settings
INSERT INTO scheduler_settings (setting_key, setting_value, setting_type, description) VALUES
    ('max_workers', '600', 'integer', 'Maximum number of workers available in the factory'),
    ('time_limit_seconds', '60', 'integer', 'Time limit for the scheduler optimization in seconds'),
    ('horizon_days', '365', 'integer', 'Planning horizon in days')
ON CONFLICT (setting_key) DO NOTHING;

-- Add comments
COMMENT ON TABLE scheduler_settings IS 'Configuration settings for the scheduler';
COMMENT ON COLUMN scheduler_settings.setting_key IS 'Unique key for the setting (e.g., max_workers, time_limit_seconds)';
COMMENT ON COLUMN scheduler_settings.setting_value IS 'Value of the setting stored as string';
COMMENT ON COLUMN scheduler_settings.setting_type IS 'Data type of the value for proper parsing';

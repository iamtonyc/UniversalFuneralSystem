-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create app_users table for login
CREATE TABLE IF NOT EXISTS public.app_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default admin user
INSERT INTO public.app_users (username, password)
VALUES ('admin', 'admin123')
ON CONFLICT (username) DO NOTHING;

-- 2. Create ashes_locations table
CREATE TABLE IF NOT EXISTS public.ashes_locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert some default locations
INSERT INTO public.ashes_locations (name, description)
VALUES 
    ('Section A', 'Main storage area'),
    ('Section B', 'Secondary storage area'),
    ('Section C', 'Annex storage area')
ON CONFLICT (name) DO NOTHING;

-- 3. Create/Alter ashes_storage table
-- If the table already exists, we ensure it has the correct columns
CREATE TABLE IF NOT EXISTS public.ashes_storage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    storage_number TEXT NOT NULL,
    location TEXT,
    deceased_name TEXT NOT NULL,
    burial_register_number TEXT,
    renter_name TEXT,
    storage_start_date TEXT,
    retrieval_date TEXT,
    cremation_date TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for common search fields
CREATE INDEX IF NOT EXISTS idx_ashes_storage_deceased_name ON public.ashes_storage (deceased_name);
CREATE INDEX IF NOT EXISTS idx_ashes_storage_storage_number ON public.ashes_storage (storage_number);
CREATE INDEX IF NOT EXISTS idx_ashes_storage_location ON public.ashes_storage (location);

-- Enable Row Level Security (RLS) - Optional but recommended
-- ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.ashes_locations ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.ashes_storage ENABLE ROW LEVEL SECURITY;

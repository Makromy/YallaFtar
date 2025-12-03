-- YallaFtar Database Schema
-- Run this in your Supabase SQL Editor

-- 1. Create Users Table
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    mobile TEXT UNIQUE NOT NULL,
    "instapayUsername" TEXT,
    "isBlocked" BOOLEAN DEFAULT FALSE,
    "createdAt" TIMESTAMP DEFAULT NOW()
);

-- 2. Create Restaurants Table
CREATE TABLE IF NOT EXISTS restaurants (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    menu JSONB DEFAULT '[]'::jsonb,
    "createdAt" TIMESTAMP DEFAULT NOW()
);

-- 3. Create Sessions Table
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    "creatorId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    "createdAt" BIGINT NOT NULL,
    "expiresAt" BIGINT NOT NULL,
    "isActive" BOOLEAN DEFAULT TRUE,
    orders JSONB DEFAULT '[]'::jsonb,
    "restaurantId" TEXT NOT NULL REFERENCES restaurants(id),
    fees JSONB DEFAULT '{"vatPercentage": 0, "serviceFeePercentage": 0, "deliveryFeeRaw": 0}'::jsonb,
    "menuUrl" TEXT,
    "accessCode" TEXT NOT NULL UNIQUE
);

-- 4. Create Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_users_mobile ON users(mobile);
CREATE INDEX IF NOT EXISTS idx_sessions_creator ON sessions("creatorId");
CREATE INDEX IF NOT EXISTS idx_sessions_active ON sessions("isActive");
CREATE INDEX IF NOT EXISTS idx_sessions_access_code ON sessions("accessCode");
CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON sessions("createdAt");

-- 5. Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- 6. Create Permissive Policies (Public Access)
-- Note: This allows public access. In production, implement proper auth policies.

-- Users policies
DROP POLICY IF EXISTS "Public Access Users" ON users;
CREATE POLICY "Public Access Users" ON users 
FOR ALL TO anon, authenticated 
USING (true) 
WITH CHECK (true);

-- Restaurants policies
DROP POLICY IF EXISTS "Public Access Restaurants" ON restaurants;
CREATE POLICY "Public Access Restaurants" ON restaurants 
FOR ALL TO anon, authenticated 
USING (true) 
WITH CHECK (true);

-- Sessions policies
DROP POLICY IF EXISTS "Public Access Sessions" ON sessions;
CREATE POLICY "Public Access Sessions" ON sessions 
FOR ALL TO anon, authenticated 
USING (true) 
WITH CHECK (true);

-- 7. Insert Default Restaurant
INSERT INTO restaurants (id, name, menu) VALUES (
    'default_01',
    'Sunrise Café (Default)',
    '[
        {
            "id": "1",
            "name": "Classic Breakfast Burrito",
            "category": "Mains",
            "price": 12.50,
            "description": "Scrambled eggs, cheese, potatoes, and salsa in a flour tortilla."
        },
        {
            "id": "2",
            "name": "Avocado Toast",
            "category": "Mains",
            "price": 14.00,
            "description": "Sourdough, smashed avocado, radish, chili flakes, and microgreens."
        },
        {
            "id": "3",
            "name": "Bagel with Cream Cheese",
            "category": "Mains",
            "price": 5.50,
            "description": "Toasted everything bagel with plain whipped cream cheese."
        },
        {
            "id": "4",
            "name": "Greek Yogurt Parfait",
            "category": "Sides",
            "price": 8.00,
            "description": "Vanilla greek yogurt, granola, and seasonal berries."
        },
        {
            "id": "5",
            "name": "Hash Brown Patty",
            "category": "Sides",
            "price": 3.00,
            "description": "Crispy golden potato patty."
        },
        {
            "id": "6",
            "name": "Cold Brew Coffee",
            "category": "Drinks",
            "price": 4.50,
            "description": "Steeped for 12 hours, smooth and bold."
        },
        {
            "id": "7",
            "name": "Orange Juice",
            "category": "Drinks",
            "price": 4.00,
            "description": "Freshly squeezed."
        },
        {
            "id": "8",
            "name": "Oat Milk Latte",
            "category": "Drinks",
            "price": 5.50,
            "description": "Espresso with steamed oat milk."
        }
    ]'::jsonb
) ON CONFLICT (id) DO NOTHING;

-- 8. Create Functions for Auto-cleanup (Optional)
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
    -- Mark sessions as inactive if they've expired
    UPDATE sessions 
    SET "isActive" = false 
    WHERE "isActive" = true 
    AND "expiresAt" < EXTRACT(EPOCH FROM NOW()) * 1000;
END;
$$ LANGUAGE plpgsql;

-- 9. Create a trigger to auto-generate access codes (Optional)
CREATE OR REPLACE FUNCTION generate_access_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW."accessCode" IS NULL OR NEW."accessCode" = '' THEN
        NEW."accessCode" := LPAD(FLOOR(RANDOM() * 9000 + 1000)::TEXT, 4, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_generate_access_code ON sessions;
CREATE TRIGGER trigger_generate_access_code
    BEFORE INSERT ON sessions
    FOR EACH ROW
    EXECUTE FUNCTION generate_access_code();

-- 10. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- Success message
SELECT 'YallaFtar database schema created successfully!' as message;
#!/bin/bash
# Tsuya App — development environment setup

echo "Setting up Tsuya..."

echo "Installing dependencies..."
npm install

echo "Checking Expo configuration..."
npx expo doctor

echo ""
echo "Setup complete."
echo ""
echo "Create a .env file with your Supabase credentials:"
echo "  EXPO_PUBLIC_SUPABASE_URL=your_supabase_url"
echo "  EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key"
echo ""
echo "Then run: npm start"

# Tsuya — Habit Tracker App

Tsuya is a gamified habit tracking mobile application built with Expo and Supabase. Users build streaks, earn XP, level up, and unlock rewards by completing daily and weekly habits.

## Features

- Create and track daily or weekly habits
- Gamification system: XP, levels, coins, badges
- Activity heatmap (9-week view) and monthly calendar
- Public challenges — share habits and compete with others
- Local notifications: daily reminders and milestone alerts
- Reward shop with customizable packs

## Tech Stack

- **Framework**: Expo SDK 56 + expo-router (file-based routing)
- **Language**: TypeScript
- **Backend**: Supabase (PostgreSQL + Auth + RLS)
- **UI**: React Native 0.85.3

## Prerequisites

- Node.js 18+
- A Supabase project

## Installation

```bash
# Clone the repository
git clone <repository-url>
cd tsuya-app

# Run the setup script
bash setup.sh
```

Or manually:

```bash
npm install
```

## Environment Variables

Create a `.env` file at the root of the project:

```
EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Running the App

```bash
# Start the development server
npm start

# Android
npm run android

# iOS
npm run ios
```

## Build

This project uses EAS (Expo Application Services) for builds.

```bash
# Development build (with native modules)
eas build --profile development --platform android

# Preview build (internal testing)
eas build --profile preview --platform android

# Production build
eas build --profile production --platform android
```

## Project Structure

```
src/
  app/          # Screens (expo-router file-based routing)
  components/   # Reusable UI components
  context/      # React Context (Auth, Habits)
  lib/          # Utilities (Supabase client, notifications)
assets/         # Images, fonts
```

## Security

Data is secured at the database level using Supabase Row Level Security (RLS). Each user can only read and write their own data.

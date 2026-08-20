[English](README.md) | Français

# Tsuya — Application de suivi d'habitudes

Tsuya est une application mobile de suivi d'habitudes gamifiée, développée avec Expo et Supabase. Les utilisateurs construisent des séries (streaks), gagnent de l'XP, montent de niveau et débloquent des récompenses en complétant leurs habitudes quotidiennes et hebdomadaires.

## Fonctionnalités

- Créer et suivre des habitudes quotidiennes ou hebdomadaires
- Système de gamification : XP, niveaux, pièces, badges
- Heatmap d'activité (vue sur 9 semaines) et calendrier mensuel
- Défis publics — partager ses habitudes et se mesurer aux autres
- Notifications locales : rappels quotidiens et alertes de paliers
- Boutique de récompenses avec des packs personnalisables

## Stack technique

- **Framework** : Expo SDK 56 + expo-router (routage basé sur les fichiers)
- **Langage** : TypeScript
- **Backend** : Supabase (PostgreSQL + Auth + RLS)
- **UI** : React Native 0.85.3

## Prérequis

- Node.js 18+
- Un projet Supabase

## Installation

```bash
# Cloner le dépôt
git clone <repository-url>
cd tsuya-app

# Lancer le script d'installation
bash setup.sh
```

Ou manuellement :

```bash
npm install
```

## Variables d'environnement

Créer un fichier `.env` à la racine du projet :

```
EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Lancer l'application

```bash
# Démarrer le serveur de développement
npm start

# Android
npm run android

# iOS
npm run ios
```

## Build

Ce projet utilise EAS (Expo Application Services) pour les builds.

```bash
# Build de développement (avec modules natifs)
eas build --profile development --platform android

# Build de prévisualisation (tests internes)
eas build --profile preview --platform android

# Build de production
eas build --profile production --platform android
```

## Structure du projet

```
src/
  app/          # Écrans (routage basé sur les fichiers, expo-router)
  components/   # Composants UI réutilisables
  context/      # React Context (Auth, Habits)
  lib/          # Utilitaires (client Supabase, notifications)
assets/         # Images, polices
```

## Sécurité

Les données sont sécurisées au niveau de la base grâce à Row Level Security (RLS) de Supabase. Chaque utilisateur ne peut lire et écrire que ses propres données.

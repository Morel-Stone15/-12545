-- ==========================================
-- SCRIPT SQL POUR SUPABASE - PRESTIGE EVENT (Version Robuste)
-- ==========================================

-- 1. Table des Réservations
CREATE TABLE IF NOT EXISTS public.reservations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    "event-type" TEXT NOT NULL,
    "event-date" DATE NOT NULL,
    guests INTEGER NOT NULL,
    budget TEXT NOT NULL,
    notes TEXT,
    user_id UUID REFERENCES auth.users(id)
);

-- Activer la RLS sur reservations
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

-- Nettoyage des anciennes politiques (pour idempotence)
DROP POLICY IF EXISTS "Permettre l'insertion publique des réservations" ON public.reservations;
DROP POLICY IF EXISTS "Permettre aux utilisateurs de voir leurs réservations" ON public.reservations;
DROP POLICY IF EXISTS "admin_all" ON public.reservations;

-- Politique d'insertion publique (tout le monde peut créer une réservation)
CREATE POLICY "Permettre l'insertion publique des réservations"
    ON public.reservations FOR INSERT TO public WITH CHECK (true);

-- Politique client : lecture seulement sur ses propres réservations
CREATE POLICY "Permettre aux utilisateurs de voir leurs réservations"
    ON public.reservations FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Politique admin : accès complet (SELECT, UPDATE, DELETE) pour les admins
CREATE POLICY "admin_all"
    ON public.reservations FOR ALL TO authenticated USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- 2. Table des Profils
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    full_name TEXT,
    role TEXT DEFAULT 'client',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Activer la RLS sur profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Nettoyage des politiques profils
DROP POLICY IF EXISTS "Voir son propre profil" ON public.profiles;
DROP POLICY IF EXISTS "Modifier son propre profil" ON public.profiles;
DROP POLICY IF EXISTS "admin_profile_view" ON public.profiles;
DROP POLICY IF EXISTS "admin_profile_update" ON public.profiles;

-- Politique client : voir son propre profil
CREATE POLICY "Voir son propre profil"
    ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);

-- Politique client : modifier son propre profil
CREATE POLICY "Modifier son propre profil"
    ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Politiques admin sur profiles (lecture et modification de tous les profils)
CREATE POLICY "admin_profile_view"
    ON public.profiles FOR SELECT TO authenticated USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "admin_profile_update"
    ON public.profiles FOR UPDATE TO authenticated USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- 3. Déclencheur (Trigger) : création automatique du profil lors de l'inscription
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, role)
    VALUES (new.id, new.raw_user_meta_data->>'full_name', 'client');
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

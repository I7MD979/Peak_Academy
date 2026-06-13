-- Arabic display names for subscription plans (parent notifications, UI copy)
ALTER TABLE public.subscription_plans ADD COLUMN IF NOT EXISTS name_ar text;

UPDATE public.subscription_plans SET name_ar = 'الفئة الفضية' WHERE name = 'silver' AND name_ar IS NULL;
UPDATE public.subscription_plans SET name_ar = 'الفئة الذهبية' WHERE name = 'gold' AND name_ar IS NULL;

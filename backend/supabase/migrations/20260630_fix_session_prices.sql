-- تحديث كل الجلسات المجدولة والمباشرة لسعر 80 جنيه
UPDATE public.sessions
SET price_per_student = 80
WHERE status IN ('scheduled', 'live')
  AND price_per_student != 80;

-- تأكيد (log only — لا constraint حتى نقدر نعدّل السعر من platform_config مستقبلاً)
DO $$
DECLARE
  cnt int;
BEGIN
  SELECT COUNT(*) INTO cnt
  FROM public.sessions
  WHERE status IN ('scheduled', 'live')
    AND price_per_student != 80;

  IF cnt > 0 THEN
    RAISE WARNING '% جلسة لا تزال بسعر مختلف عن 80 — راجع البيانات يدوياً', cnt;
  ELSE
    RAISE NOTICE 'تم تثبيت سعر الجلسات على 80 جنيه بنجاح';
  END IF;
END $$;

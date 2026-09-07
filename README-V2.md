# PC Inventory V2

این نسخه برای همان دیتابیس فعلی Supabase طراحی شده و داده های `inventory` را حذف نمی کند.

## ترتیب اجرا

1. از دیتابیس فعلی یک backup بگیرید.
2. فایل `supabase-migration.sql` را در Supabase SQL Editor اجرا کنید.
3. در Supabase Dashboard > Edge Functions، تابع `admin-users` را با فایل `supabase/functions/admin-users/index.ts` deploy کنید.
4. کلید `service_role` فقط به عنوان Secret خود Edge Function استفاده می شود و هرگز داخل `script.js` قرار نگیرد.
5. اولین مدیر را از طریق Edge Function بسازید؛ چون بعد از migration هنوز مدیر نداریم.
6. سپس `index.html`, `style.css`, `script.js` را روی هاست/Cloudflare Pages جایگزین کنید.
7. `worker.js` قدیمی را از مسیر سایت حذف کنید؛ V2 به آن وابسته نیست.

## معماری

- کاربران عمومی: فقط SELECT روی inventory و config.
- مدیران: Supabase Auth + profiles + permissions.
- ثبت فعالیت: trigger روی inventory و جدول audit_logs.
- همگام سازی: Supabase Realtime.
- جلوگیری از overwrite: ستون version و update شرطی روی version قبلی.
- مدیریت مدیران: Edge Function با service role؛ service role هرگز به مرورگر ارسال نمی شود.
- Excel backup: نام فایل با روز هفته، تاریخ شمسی و ساعت.

## اولین مدیر

برای ساخت اولین مدیر، موقتاً باید یک حساب اولیه ایجاد شود. پیشنهاد امن: تابع Edge را deploy کنید و فقط یک بار یک درخواست ساخت مدیر با مجوز bootstrap داشته باشید، یا اولین user را در Supabase Auth بسازید و سپس برای او یک رکورد در `profiles` با `manage_admins=true` ایجاد کنید. برای جلوگیری از باز کردن مسیر bootstrap دائمی، بعد از ساخت اولین مدیر، تنها مدیر دارای permission `manage_admins` باید حساب های بعدی را بسازد.

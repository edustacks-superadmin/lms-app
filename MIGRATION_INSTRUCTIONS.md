# Applying Exam Fields Migration

## Method 1: Manual (Recommended for Schema Changes)

1. Open Supabase Dashboard: https://supabase.com/dashboard
2. Go to your project: **LMS APP**
3. Click **SQL Editor** in the left sidebar
4. Click **New query**
5. Copy and paste the contents of `migrations/add_exam_fields.sql`
6. Click **Run** to execute

## Method 2: Using Supabase CLI (if installed)

```bash
supabase db push
```

## Verification

After running the migration, you can verify by running:

```bash
node check_show_answers.js
```

All six fields should show as ✅ YES:
- show_answers
- show_score  
- show_percentile
- show_pass_or_fail
- slug
- enable_ranks

## Migration File Location

The SQL migration is located at:
`D:\dev\LMS APP\migrations\add_exam_fields.sql`

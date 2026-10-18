# Testpress to LMS Migration Guide

This guide explains how to migrate your Exams, Questions, and Folders from Testpress to your new LMS App using the provided script.

## Prerequisites

1.  **Node.js**: Ensure you have Node.js installed.
2.  **Testpress Credentials**: You need your Testpress username/password or an API Token.
3.  **Supabase Credentials**: The script is pre-filled with your project's URL and Anon Key.

## Step 1: Configure the Script

Open `import_testpress.js` in your code editor.

1.  **Update Testpress URL**:
    Change `TESTPRESS_BASE_URL` to your institute's URL (e.g., `https://myinstitute.testpress.in`).

2.  **Update Credentials**:
    *   If you have a username/password, update `TESTPRESS_USERNAME` and `TESTPRESS_PASSWORD`.
    *   **OR** if you have a permanent API Token, paste it directly into the `runMigration` function at the bottom:
        ```javascript
        const token = 'YOUR_ACTUAL_TOKEN_HERE';
        ```

## Step 2: Verify API Endpoints

Testpress API endpoints might vary. The script assumes:
*   Folders: `/api/v2.5/folders/`
*   Exams: `/api/v2.5/exams/`
*   Questions: Fetched via the `questions_url` provided in the Exam object.

**If the script fails to fetch data:**
1.  Log in to your Testpress account in a browser.
2.  Open Developer Tools (F12) -> Network tab.
3.  Navigate to the "Exams" or "Questions" page.
4.  Look for the API request (usually starts with `/api/`).
5.  Update the endpoints in `import_testpress.js` to match what you see.

## Step 3: Run the Migration

Open your terminal and run:

```bash
node import_testpress.js
```

## Troubleshooting

*   **Login Failed**: Check your username/password. If Testpress uses 2FA or SSO, you must use an API Token instead.
*   **Fetch Failed**: The endpoint might be wrong. Check the Network tab as described in Step 2.
*   **Database Errors**: If you see "Row-level security policy violation", you might need to use the `SERVICE_ROLE_KEY` instead of the Anon Key in the `SUPABASE_KEY` variable. You can find this in your Supabase Dashboard -> Settings -> API.

## Customizing the Mapping

If your Testpress data has different field names (e.g., `name` instead of `title`), update the mapping in the `insert` functions:

```javascript
// Example: Mapping Testpress 'exam_name' to Supabase 'title'
title: tpExam.exam_name, 
```

# Supabase Edge Functions

This directory contains Deno-based edge functions for server-side operations.

## Functions

### create-razorpay-order
Creates a Razorpay order and stores it in the database.

### verify-razorpay-payment  
Verifies Razorpay payment signature and completes the order.

## Deployment

```bash
# Deploy all functions
supabase functions deploy

# Deploy specific function
supabase functions deploy create-razorpay-order
supabase functions deploy verify-razorpay-payment
```

## Environment Variables

Set these secrets using Supabase CLI:

```bash
supabase secrets set RAZORPAY_KEY_ID=your_key_id
supabase secrets set RAZORPAY_KEY_SECRET=your_key_secret
```

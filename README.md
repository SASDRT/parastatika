# Παραστατικά — Οδηγίες Εγκατάστασης

## Βήμα 1: Δημιουργία πίνακα στο Supabase

1. Πήγαινε στο supabase.com → project PARASTATIKA
2. Αριστερά πάτα **"SQL Editor"**
3. Αντέγραψε το περιεχόμενο του αρχείου `supabase-schema.sql`
4. Πάτα **"Run"**

## Βήμα 2: Ανέβασμα στο Vercel

1. Πήγαινε στο **github.com** και φτιάξε δωρεάν λογαριασμό
2. Φτιάξε νέο repository με όνομα `parastatika`
3. Ανέβασε όλα τα αρχεία (εκτός από node_modules και .env.local)
4. Πήγαινε στο **vercel.com** → "Add New Project"
5. Επίλεξε το repository `parastatika`
6. Στο "Environment Variables" πρόσθεσε:
   - `NEXT_PUBLIC_SUPABASE_URL` = https://tfumnuirfbilkcobxfcv.supabase.co
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = sb_publishable_hQDfeQAfuwLWPnY_ItO7Iw_SbfUCdIj
   - `ANTHROPIC_API_KEY` = (το κλειδί σου από anthropic.com)
7. Πάτα **"Deploy"**

## Βήμα 3: Anthropic API Key

1. Πήγαινε στο **console.anthropic.com**
2. Φτιάξε λογαριασμό
3. Πήγαινε στο API Keys → Create Key
4. Αντέγραψε το κλειδί και βάλτο στο Vercel

## Έτοιμο!

Η εφαρμογή θα είναι στο: `https://parastatika-xxx.vercel.app`

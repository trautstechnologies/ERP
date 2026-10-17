# Mobile Money payment method

The shared payment selector now offers Cash, Card, Bank transfer, Mobile Money, and Other for sales, expenses, and recording refunds. The API value for Mobile Money is `mobile_money`; histories display the readable label. It records an externally performed payment, not a provider transfer or collection. No operator-specific payment integration is implied.

## Required database update

Before submitting Mobile Money transactions, run the entire `database/patches/20261017_mobile_money.sql` in the Supabase SQL Editor. Existing rows, amounts, RLS and function privileges are preserved. The patch updates the three method allowlists and the existing sale/refund function validators, retaining active-return and non-cash reference guards. It supports the private refund core introduced by the return-void migration, or the original public implementation before that migration. If a required table/function or expected validator is missing, the transaction fails instead of partially applying.

The patch was applied twice successfully in an isolated PostgreSQL test database. Tests exercised a Mobile Money sale, expense, refund, rejection without a non-cash refund reference, invalid-method rejection, existing return/void protections, and the earlier return regression checks. This has not been executed against the user's hosted project.

This is a manual SQL patch, not a complete Supabase migration history. After applying it, capture it through the project's established migration workflow; do not mark an unrelated migration applied. Redeploy the frontend branch on Netlify if automatic deployment is disabled.

Mobile Money refunds require a reference for the payment already performed, exactly as other non-cash refund methods do. Existing cash/card/bank-transfer/other records and workflows remain valid.

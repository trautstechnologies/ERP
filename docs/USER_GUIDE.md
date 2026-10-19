# TRAUTS Shop Manager — User Guide

For store managers and ordinary workers. Updated 19 October 2026.

This guide describes the current app. Your account determines which pages and buttons you can use. Some actions also depend on the features your administrator has enabled.

## 1. Getting started

### Sign in

1. Open your store's app address in a browser.
2. Enter the email address and password provided for your account.
3. Select **Login**.
4. Check the store name shown at the top of the screen before recording anything.

There is no public signup form. A manager creates ordinary worker accounts. An administrator creates managers and assigns stores. In the updated account-creation process, new workers can sign in without confirming an email.

If your password does not work, contact your manager or administrator. You cannot reset another person's password or change their login email from the team page.

### Your role

| Page or action | Ordinary worker | Manager |
| --- | --- | --- |
| Dashboard | Your own sales and store availability | Store sales and stock alerts |
| Products | View active products and prices | Add, edit and activate/deactivate products |
| Sales | Record sales and view your own sales | Record sales, view store sales and cancel eligible sales |
| Inventory | View main and sellable stock | Also view return holding, adjust stock and set reorder levels |
| Suppliers and Purchases | Not available | Manage suppliers and receive/cancel purchases |
| Expenses | Not available | Record expenses; cancel only if enabled |
| Manage Accounts | Not available | Create and edit ordinary workers |
| Batches & Expiry | No management page | Manage tracking, batches, expiry holds and adjustments |
| Returns & Refunds | Not available | Record returns, process holding, record refunds and void eligible mistakes |
| Reports and Operating Summary | Not available | View store reports and export report data |
| Audit History and Settings | Not available | View history/store settings and set the timezone |

A manager's access is limited to their own store. Being in the same organization does not give access to other stores. There is no store-switching button in this version.

### Moving around

- Use the left menu to open a page. On a phone, select **Menu** first.
- Select the current page again in the menu to reload its saved information. Successful changes update the page automatically.
- Use a page's search box to find records. Clear the search to show the full list again.
- On small screens, swipe wide tables sideways to see columns and action buttons on the right.
- Read the success or error message after saving. A button becoming available again does not, by itself, prove that a record was saved.
- Select **Cancel**, **Close**, or the **×** in a form to leave it before saving. That does not undo something already saved.
- Select **Logout** when finished, especially on a shared device. You may need to scroll down inside the menu to reach it.

Dropdown menus are searchable: open a menu, type part of a name in **Type to search…**, then select a matching option. Clear the search to see all options. Searching alone does not change your selection. On a keyboard, use the arrow keys and Enter to select; Escape closes the menu.

Refreshing, navigating away, or closing a form can lose unsaved entries. Avoid doing this while a save is in progress.

## 2. Dashboard

The Dashboard gives a quick view of activity. A worker sees their own completed sales; a manager sees completed sales for the store.

### What you can see

- **Today's gross sales:** value of completed sales today, before customer returns are deducted.
- **Today's transactions:** number of completed sales today.
- **Active products:** products currently available in the catalog.
- **Low-stock products:** manager alert count based on stock that can actually be sold.
- **Products available:** the worker's count of products with sellable stock.
- A sales chart for the last seven days. Dates use labels such as **12 Oct** and **Today**, based on your store timezone.
- Restock alerts for managers, or available inventory for workers.
- A short list of recent sales.

### Actions

- Select **Record sale** to go straight to the sale form in Sales.
- Select **Dashboard** in the menu again to reload the figures.
- Open **Sales** for the full sales history. Open **Inventory** or **Reports** for more stock detail.

The dashboard lists are summaries, not the complete history. Gross sales are not profit and are not the same as money left after expenses or refunds.

## 3. Products

Use Products to look up names, SKUs, categories, units, prices, sellable quantities and status. A **SKU** is the store's short code for a product, such as SOAP-001. Buying prices are visible to ordinary workers in this app.

### Find a product — workers and managers

1. Open **Products**.
2. Use the search box to search by a name, SKU or category.
3. Check the selling unit and price before recording a sale.

### Add a product — managers

1. Select **Add product**.
2. Enter the **Product name**. **SKU** is optional: enter your own unique product code, or leave it blank and the app generates one.
3. Add a category if useful, such as Groceries or Clothing.
4. Enter the **Selling price** and **Buying price** for one item or pack.
5. Choose a supplier if applicable.
6. Select **Save** and check the success message.

Adding a product does not add stock. Receive stock through Purchases, or use an authorized stock adjustment for an appropriate opening balance/correction.

Stock is counted in whole items. For different sizes, colours or packs, create separate products with clear names, such as Cola 500 ml and Cola 2 L. There is no group or attribute setup. New products use the internal selling unit **each**. A pack sold as one product counts as one item; the app does not automatically split packs into individual pieces. Existing product units and historical information are retained.

### Edit or change availability — managers

- Select **Edit** to change the allowed product details, prices or supplier, then **Save**. Clearing the SKU field keeps the existing code.
- Select **Deactivate** and confirm with **Save** to stop offering a product for new sales.
- Select **Activate** and **Save** to make an eligible inactive product active again.

Deactivation does not remove stock or erase past transactions. Do not deactivate a product as a substitute for recording damaged or missing stock.

## 4. Sales

Use Sales to record customer purchases and review sale history. Workers see their own sales; managers see their store's sales.

### Record a sale

1. Select **Record sale**.
2. Choose the payment method: **Cash**, **Card**, **Bank transfer**, **Mobile Money**, or **Other**.
3. Choose a product and enter the quantity being sold.
4. Select **Add item** for more products. Select **Remove item** to remove an unwanted line.
5. Use one line per product. If a product appears twice, combine the quantities into one line.
6. Check products, units, quantities and payment method. Confirm payment using your store's normal process.
7. Select **Record sale** and wait for confirmation.
8. Find the saved sale in the history and use **Details** to check its total and items.

The app uses the current selling prices automatically. You cannot type a different price, discount or tax adjustment in this sale form. The saved total is the final amount recorded by the system.

Selecting a payment method records how payment was made. It does not charge a card, collect Mobile Money or transfer money. There is no cash-tender/change calculation in this form.

Enter whole quantities such as 1, 2 or 3. Fractional quantities such as 0.5 are not accepted. Prices and payment amounts still allow cents.

If any item is invalid or has insufficient sellable stock, the sale is rejected as a whole. Another user may sell the last unit while your form is open; refresh availability if the app reports insufficient stock.

### Find a sale and inspect details

Use the search box to find products, staff names, payment methods or status. Select **Details** to see the status, total, quantities, original unit prices and line totals. Technical references are available under **Support references**. For a tracked product, the details also show the original batches used.

### Cancel an entire sale — managers

1. Find the incorrect sale and select **Cancel sale**.
2. Enter the reason.
3. Select **Save** and confirm that the sale becomes cancelled.

Cancellation reverses the whole sale and restores its original stock allocation when allowed. It does not delete the history or send money to the customer. Handle any real payment reversal separately.

Use cancellation for an eligible erroneous whole sale. If a customer is returning goods from a genuine completed sale, use **Returns & Refunds** instead. A sale with an active customer return cannot be cancelled. If all its returns were legitimately voided, cancellation may become available again, subject to the app's checks.

## 5. Inventory

Inventory helps explain where stock is and what can be sold. Search for a product to check its position.

| Term | Meaning |
| --- | --- |
| Main stock | Goods recorded in the main inventory; some may be blocked from sale |
| Return quarantine | Returned goods held separately while awaiting a decision |
| Total physical | Main stock plus return quarantine for that product |
| Sellable | Quantity currently eligible for sale |

For example, main stock can be 10 and return quarantine 2, making total physical 12. If three main-stock units are expired or blocked, only seven may be sellable. Workers see main and sellable stock; managers also see return quarantine and total physical.

### Set a reorder level — managers

1. Find the product and select **Reorder level**.
2. Enter the quantity at which the store should receive a low-stock alert.
3. Select **Save**.

A low-stock alert is based on sellable stock at or below that level. A reorder level of zero is allowed. Setting a level does not receive or order any goods.

### Adjust stock — managers, untracked products

1. Count/check the actual stock and determine the difference to correct.
2. Select **Adjust stock**.
3. Enter a positive number to add units, or a negative number to remove units.
4. Enter a clear reason, such as Damaged stock or Count correction.
5. Select **Save** and check the new balance.

Example: the app shows 10, but a verified count is eight. Enter **-2**, not 8. An adjustment cannot make stock negative.

For a tracked product, use **Manage batches** to open Batches & Expiry and adjust the actual batch. Use Purchases for received supplier stock rather than replacing purchase history with a manual adjustment.

## 6. Suppliers — managers

Use Suppliers to maintain supplier details and contact numbers. The **Phone numbers** column shows all saved numbers, or **Not added** if none are saved. Search by supplier details or phone number before adding another supplier.

### Add or edit a supplier

1. Select **Add supplier**, or **Edit** beside an existing supplier.
2. Enter/update the name, optional email and optional address.
3. Select **Save**.

### Manage phone numbers

1. Select **Phone numbers** beside the supplier.
2. To add a number, enter it in **Add phone number** and select **Add number**.
3. To change a number, select **Edit number**, enter the corrected number and **Save**.
4. To remove a number, select **Remove number** and confirm with **Remove number**.

You can save more than one number per supplier. Numbers keep their leading zero or international prefix, such as 0971234567 or +260 97 123 4567. After saving a number, the supplier table updates automatically. Removing a contact number does not remove the supplier or their purchase history.

### Activate or deactivate

Select **Deactivate** or **Activate**, then **Save**. An inactive supplier is not offered for a new purchase. Past purchases remain visible. The app does not provide a supplier-history deletion action.

## 7. Purchases — managers

Use Purchases to record goods actually received from suppliers. Recording a purchase increases stock and saves the received quantities and costs.

### Receive a purchase

1. Ensure the supplier and products have already been added and are active.
2. Select **Receive purchase** and choose the supplier.
3. Select the product, received quantity and unit cost.
4. Select **Add item** for other products, or **Remove item** to remove a line.
5. For each tracked product, complete its batch entries before saving.
6. Select **Receive stock** and wait for confirmation.
7. Use **Details** to check the saved purchase and totals.

Use one line per product. The unit cost is the cost of one selling unit. The system calculates and rounds the line totals. It saves the purchase and its stock changes together; an invalid item prevents the complete purchase from being saved.

### Receive batches

When a tracked product is selected, batch fields appear. For each batch, enter its number, quantity and expiry date where required. Use **Add batch** or **Remove batch** as needed.

All batch quantities for one product must add up exactly to that product's received quantity. For example, receiving five units could be split into two in Batch A and three in Batch B. Do not enter five in both batches. Required expiry dates cannot be omitted; the app rejects ineligible expired receipts.

### View or cancel a purchase

- Use search to find a supplier, product or status.
- Select **Details** to see received items, quantities, unit costs and totals.
- For an incorrect eligible purchase, select **Cancel purchase**, enter a reason and **Save**.

Cancellation removes the originally received quantities when the required stock is still available. It may be rejected after goods were sold, disposed of or otherwise made unavailable. It does not erase the purchase, pay the supplier, reverse a bank transaction or record a supplier return/credit note.

## 8. Expenses — managers

Use Expenses to record store spending such as rent, transport or utilities.

### Record an expense

1. Select **Record expense**.
2. Enter a category and a useful description.
3. Enter an amount greater than zero, with no more than two decimal places.
4. Choose **Cash**, **Card**, **Bank transfer**, **Mobile Money**, or **Other**.
5. Select **Save** and check the new record.

The entry receives its recorded date/time when saved. Recording an expense does not make the payment. Use search to find expenses by their recorded details and payment method.

### Cancel an incorrect expense, if available

If **Cancel** appears beside a recorded expense, select it, enter a reason and **Save**. The cancelled entry remains in history and is excluded from recorded-expense totals.

Some installations show a message that expense cancellation is unavailable. In that case, contact the administrator to enable the verified cancellation feature. Do not create an extra positive expense to try to undo an existing one. There is no expense delete or general edit action on this page.

## 9. Manage Accounts — managers

Use this page to create ordinary workers and manage their names, phone numbers and active status. Search by the profile details shown in the table. Login emails are not displayed in this team table.

### Create a worker

1. Select **Create worker**.
2. Enter the worker's name, login email and a unique temporary password of at least 12 characters.
3. Enter a phone number if needed.
4. Select **Create worker** once and wait for the result.
5. Share the login details securely with the intended worker.

The account is automatically an active ordinary worker in your store. You cannot select a different store or give it the manager role. With the updated setup, no confirmation email is sent and the worker can sign in immediately.

If creation fails or the connection drops, do not repeatedly create the same worker. Ask the administrator to check whether the account already exists. The form restricts repeated attempts to avoid duplicate/uncertain account creation.

### Edit a worker

1. Find the worker and select **Edit worker**.
2. Update the name, phone or status.
3. Select **Save**.

Set status to **Inactive** to remove access to protected store features. Set it back to **Active** to restore eligible access. An already-open login session does not override an inactive profile.

Manager rows are administrative accounts and cannot be edited through this worker form. Contact the administrator for manager creation, store reassignment, email/password changes or account recovery. Staff and transaction history are not deleted here.

## 10. Batches & Expiry — managers

A batch is a separately identified group of units of the same product. Batch tracking helps control expiry, recalls and traceability. Use the search box to find a product, batch number or other displayed detail.

### Turn tracking on for a product with no stock

1. Select **Enable tracking / migrate stock**.
2. Choose an active product that is not already tracked.
3. Tick **Require expiry on every batch** if that product must always have an expiry date.
4. Confirm that existing main stock is zero.
5. Select **Enable on empty stock**.

Future purchases for this product must include batch allocations. Tracking cannot be switched off or reconfigured through this screen after activation, so check the choice first.

### Convert existing stock into batches

1. Select **Enable tracking / migrate stock** and choose the product with existing stock.
2. Choose the expiry requirement before continuing.
3. Select **Migrate existing stock** when it appears.
4. Add the actual batch numbers, quantities, dates and initial statuses.
5. Enter a reason for the conversion.
6. Check that the batch quantities add up exactly to the existing main stock.
7. Select **Migrate existing stock** to save.

This organizes stock already present. It does not create a purchase, add extra goods or change the total quantity. Never zero live stock simply to enable tracking. Previous sales without batch records do not gain invented batch history; some later corrections may therefore require administrator help.

### Batch statuses

| Status | Meaning |
| --- | --- |
| Available | Can contribute to sellable stock if it is not expired |
| Quarantined | Main-stock batch is on hold and cannot be sold |
| Recalled | Batch is blocked because of a recall |

To change a status, select **Set status**, choose the status, enter a reason and **Save**. A recalled batch cannot be released back to available through this workflow. Expired batches cannot be released for sale.

Putting a batch on hold does not physically remove its quantity from main inventory. It changes whether it can be sold. A main-stock batch hold is different from customer-return quarantine.

### Adjust a batch

Select **Adjust batch**, enter the positive or negative quantity change and reason, then **Save**. Apply the difference to the correct batch. The app updates its quantity and the product's main balance together, and will not allow a negative batch balance.

### How the app chooses stock for sales

The app selects eligible batches with the earliest expiry first. This is often called first-expiring, first-out. Staff do not choose a sale batch manually. Expired, recalled and quarantined batches are excluded. Expiry uses the store's business date; goods are not considered past their expiry merely because the browser uses another timezone.

## 11. Returns & Refunds — managers

Use this page for goods returned from a real completed sale. Stock handling and recording a refund are separate steps.

### Find the right records

Use search or the **Show** list:

- **Active returns:** current valid return records, including those already refunded.
- **Pending refunds (active only):** active returns with a positive refund still to be recorded as paid.
- **Voided entries:** erroneous returns that were voided, retained for audit.
- **All audit history:** active and voided returns together.

Select **Details** to inspect original sale references, products, quantities, refund amounts, holding balances, original batch numbers and quarantine actions. Voided details show who voided the entry, when, and why. A recorded refund shows its method, reference and time.

### Record a customer return

1. Select **Record return**.
2. Choose the **Original completed sale** and wait for its details to load.
3. Choose the **Original sale item**, then enter the quantity being returned.
4. For a tracked sale, select the actual **Original sold batch**.
5. Choose the disposition — what should happen to the returned goods.
6. Tick **Inspected and approved for restocking** only when goods are genuinely approved for resale and restocking is selected.
7. Use **Add return item** for more items, or **Remove item** to remove a line.
8. Enter a clear reason, then select **Record return**.

The app limits returns to the quantity originally sold, less previous active returns. For batched sales it also checks the quantity from the selected original batch. It uses the original sale prices, even if today's catalog price is different.

A return of a zero-priced item can have a refund amount of zero. Across a full return, the app preserves the original sale total. A zero-amount return is marked **not_required** for refund payment and does not need a payment record.

### Choose the disposition

| Choice | What happens |
| --- | --- |
| Quarantine | Holds goods separately; they do not become sellable |
| Restock after inspection | Adds eligible inspected goods back to main stock |
| Discard | Records direct disposal for ordinary retail; does not add sellable stock |

For pharmacies, returns must enter quarantine and cannot be released for resale. If disposal is appropriate, record quarantine first and then dispose through **Process holding**. The pharmacy restriction remains attached to the return even if the store type changes later.

Ordinary retail restocking can also be blocked for expired/recalled batches or an unknown original batch. Keep such goods in holding or use the appropriate disposal process; do not invent a batch to force restocking.

### Process returned goods in holding

1. Find the active return and select **Process holding**.
2. Choose the held return item.
3. Choose **Dispose**, or **Release to main stock** where offered and permitted.
4. Enter the quantity to process; it cannot exceed the amount still held.
5. For release, confirm inspection and approval for resale.
6. Enter the reason and select **Save**.

You may process part of a held quantity and handle the rest later. Disposal reduces return quarantine without adding main stock. Release moves eligible units into main stock. Pharmacy returns do not offer release.

### Record a refund payment

1. Find an active pending return and select **Record refund**.
2. Check the full refund amount shown.
3. Perform the actual refund outside this app using your approved payment process.
4. Select the method used: Cash, Card, Bank transfer, Mobile Money, or Other.
5. Enter the payment reference. A reference is required for every non-cash method, including Mobile Money.
6. Tick the confirmation that payment has already been performed.
7. Select **Record paid refund**.

This records payment of the displayed return amount; the form does not provide installment/partial-payment entry. It does not send money, charge a wallet or reverse a bank/card transaction. A return cannot be recorded as refunded twice.

### Void a mistaken return entry

Use **Void mistake** only when the return entry itself was erroneous and no actual goods should remain in return quarantine.

1. Check the return's **Details** and verify the mistake.
2. Select **Void mistake** if offered.
3. Enter the reason and tick the confirmation.
4. Select **Void mistaken entry**.

Only untouched, unrefunded quarantine returns are eligible. Restocked, discarded, refunded or already processed returns cannot be voided. Some earlier decimal returns cannot be voided while doing so would make later refund rounding incorrect; follow the message or ask the administrator for help.

Voiding keeps the original record and amounts for audit, marks it voided and clears the erroneous holding balance. It does not dispose of real goods or reverse a payment. If needed, enter a new correct return afterward. Voided entries cannot be processed/refunded and are excluded from the active refund queue, even if an old refund label still says pending.

## 12. Reports — managers

Use Reports for database-calculated store totals and CSV exports.

### View a report

1. Choose a report from the **Report** list.
2. Select the **Start date** and **End date**.
3. Select **Apply filters**.
4. Check that the chosen report and period are correct before using the figures.

| Report | What it shows |
| --- | --- |
| Net sales | Gross sales less active return amounts |
| Gross sales | Completed sales before returns are deducted |
| Return entitlements | Amounts approved by active return records, grouped by return date |
| Recorded refund payments | Refunds recorded as paid, grouped by refund-payment date |
| Expenses | Recorded expenses grouped by day and category |
| Low stock | Current products at or below their sellable reorder levels |

Low stock is a current snapshot: changing dates does not turn it into a historical inventory report. Days without activity may have no row. Business dates use the store timezone, not necessarily the phone's timezone.

Returns and refund payments are different measures. Net sales already deducts active return amounts, so do not subtract recorded refunds from it again. A later day can show negative net sales when returns relate to sales made on earlier days. Voiding an error can change the affected historical report totals.

### Export a report

After applying filters, select **Export CSV**. Open the downloaded file in Excel or another spreadsheet app. It contains the selected report rows; it is not a full database backup. If there are no rows, the app reports that there is nothing to export.

## 13. Operating Summary — managers

This page replaces the earlier demo Profit & Loss screen.

1. Select the start/end dates.
2. Select **Apply period**.
3. Review **Net sales**, **Recorded expenses**, and **Sales less expenses**.

Example: gross sales of 1,000 less active returns of 100 gives net sales of 900. With recorded expenses of 200, sales less expenses is 700.

The 700 is not net profit. The summary does not deduct historical cost of goods sold, tax and all other accounting costs. Do not treat current buying prices as a complete historical profit calculation. Use the figures with that limitation in mind and ask your accountant/administrator for additional accounting reports where needed.

## 14. Audit History — managers

Audit History is a read-only record of stock and related actions. It helps explain what changed and check whether an uncertain save actually succeeded.

1. Choose a **Record type**.
2. Use the search box to find a product, reason or full action/request ID.
3. Review product names, batch numbers, quantities, reasons and the person/time recorded. Select **Details** for more information; expand **Support references** only when you need technical references.

| Record type | Use it to review |
| --- | --- |
| Stock movements | Stock additions, deductions and transaction-related changes |
| Batch allocations | Which batches were involved in a movement |
| Batch status changes | Holds, recalls and other status decisions |
| Existing-stock migrations | Conversions of already-held stock into batch tracking |
| Migration batch allocations | The quantities assigned to each batch during conversion |
| Return quarantine actions | Releases and disposals from returned-goods holding |

You cannot edit, delete or directly export audit rows from this page. Use the Reports page for its available CSV exports. Contact the administrator if a history discrepancy needs investigation rather than trying to remove evidence of an error.

## 15. Settings — managers

Settings displays the organization, store, store type, timezone, currency setting and your account details. Expand **Support references** to find the store and account reference numbers when support needs them.

### Set the store timezone

1. Select **Set timezone**.
2. Choose the correct timezone.
3. Select **Save**.

For Zambia use **Africa/Lusaka**, which is CAT, UTC+2. The timezone affects report business dates and expiry decisions, so change it only when appropriate. A change may regroup historical reports into different business dates.

Other displayed details are not editable through this screen. Ask the administrator to change organization/store details, store type, currency, manager accounts or store assignments. If no currency is configured, the app shows numeric amounts without assuming a currency symbol.

## 16. Useful daily workflows

### A manager setting up products and stock

1. Add the supplier and contact numbers.
2. Give different sizes or packs separate, clear product names.
3. Add each product with its prices. Enter a SKU if you use your own product codes, or leave it blank.
4. Enable batch/expiry tracking before receiving stock if required; migrate existing stock instead if it is already present.
5. Receive supplier purchases and their batch details.
6. Set useful reorder levels and check sellable quantities.
7. Create worker accounts and share credentials securely.

### A worker serving customers

1. Sign in and confirm the store.
2. Check the product, unit and selling price.
3. Complete the store's payment process.
4. Record the sale once and confirm it appears in your history.
5. Ask the manager to handle returns, stock corrections or a sale cancellation.
6. Log out when leaving a shared device.

### A manager reviewing the day

1. Review the Dashboard and full Sales history.
2. Check active pending refunds and goods still in return holding.
3. Review low stock, expiry concerns and held/recalled batches.
4. Record genuine store expenses.
5. Review dated sales/return/refund/expense reports and export CSVs where useful.
6. Investigate discrepancies through Audit History and keep test records separate from genuine business activity when interpreting reports.

## 17. If something goes wrong

| What you see | What to do |
| --- | --- |
| Invalid login or inactive account | Recheck the credentials; ask the manager/administrator to confirm the account and store status |
| Insufficient stock | Reopen Inventory and check sellable stock, not just physical stock; check held or expired batches |
| Quantity precision error | Use whole numbers such as 1, 2 or 3 |
| Duplicate SKU | Search first; use the existing record or a different unique SKU |
| Missing batch/expiry details | Choose the real batch and complete the required dates and quantities |
| Return exceeds sold quantity | Check the original sale and previous active returns; do not choose a different sale just to bypass the limit |
| Non-cash refund requires a reference | Enter the reference for the actual refund already performed |
| Mobile Money rejected as an invalid method | Ask the administrator to apply the Mobile Money database update; do not silently record it as Cash |
| Cancellation/void is blocked | Read the reason; the goods/payment may already have been processed and need a different approved correction |
| No permission, blank table or missing button | Check your role/store, filters and account status; contact the manager if access is unexpected |
| Could not load the app or a function is unavailable | Give the administrator the page, time and error text so they can check the deployed version |

### A save times out or its result is unclear

1. Do not repeatedly submit a fresh transaction.
2. Expand **Support references** on the form and copy the **Request ID** before closing it, if present.
3. Check the relevant sales, purchases, return or audit history for that ID and compare the items/quantities.
4. Select the affected page again in the menu. Ask the manager/administrator to investigate if you cannot confirm the result.
5. Only start a new action once the outcome is understood.

Some forms keep the original entries locked after an uncertain response to prevent a changed retry from becoming a different transaction. A duplicate or state error on retry does not automatically mean the original action failed. Worker creation also needs an account check before another attempt.

Do not send passwords or payment credentials in screenshots or support messages. Useful support details are the store name, page, time, exact error text, and sale/purchase/return/request reference.

## 18. Quick reference

| Word or label | Plain meaning |
| --- | --- |
| Active | Currently enabled; for returns, a valid entry rather than a voided error |
| Completed sale | A saved sale that has not been cancelled |
| Received purchase | A saved supplier receipt whose goods were added to stock |
| Cancelled | A reversed transaction retained in history |
| Pending refund | A positive return amount not yet recorded as paid |
| Refunded | The app has a record that the external refund was performed |
| not_required | No refund payment record is needed because the return amount is zero |
| Voided | A mistaken eligible return entry marked invalid but retained for audit |
| SKU | Your store's product code |
| Batch | A separately identified group of units of a product |
| Quarantine | Goods held out of sale pending a decision; batch holds and return holding are separate |
| Reorder level | Sellable quantity at/below which a low-stock alert is raised |
| Request ID / transaction ID | A long unique reference used to locate and reconcile an action |

The app records business activity. Real payments, safe handling/disposal of goods, account administration and any additional industry requirements still follow your store's approved processes.

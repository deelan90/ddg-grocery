# n8n shop reminder

`ddg-shop-reminder.json` is an importable n8n workflow. Once a day (6 pm Brisbane) it:

1. Reads `data.json` from this repo.
2. Predicts your next Coles shop (same rule as the app: typical gap between your last 8 shops).
3. If the shop is within 2 days, sends a phone push through [ntfy](https://ntfy.sh) saying the shop is coming up and which items look low.
4. Remembers it sent one, so you get one reminder per shop.

## Set up

1. In n8n choose **Import from file** and pick `ddg-shop-reminder.json`.
2. Open **Send phone push (ntfy)** and change `ddg-grocery-CHANGE-ME` to your own long random topic name.
3. Install the ntfy app on your phone and subscribe to that topic.
4. Open **Work out reminder**, set `FORCE_SEND = true`, run the workflow once to test, then set it back to `false`.
5. Switch the workflow to **Active**.

Optional: enable **Send email (optional)** after adding your Gmail login and address.

## Notes

- The reminder is only as fresh as `data.json`. If the data feed stops updating, the message says so.
- The low-item list is approximate. n8n can't see items you tick off in the app.
- "Remember it was sent" only saves while the workflow is Active, so a manual test run can send again.

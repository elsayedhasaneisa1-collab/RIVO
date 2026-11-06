# RIVO Telegram product publishing

## Required Vercel environment variables

- `RIVO_TELEGRAM_BOT_TOKEN`: token of the RIVO bot.
- `RIVO_TELEGRAM_CHANNEL_ID`: `@RivoStoreChannel`.
- `NEXT_PUBLIC_TELEGRAM_CHANNEL_URL`: `https://t.me/RivoStoreChannel`.
- `NEXT_PUBLIC_SITE_URL`: the canonical public store URL.
- `RIVO_TELEGRAM_GROUP_ID`: keep the existing private admin group ID for order notifications.
- `RIVO_TELEGRAM_WEBHOOK_SECRET`: keep the existing webhook secret if the webhook is enabled.

Never commit `.env.local` or expose the bot token.

## Telegram permissions

1. Add the same bot whose token is configured in Vercel as an administrator of `@RivoStoreChannel`.
2. Enable **Post Messages**. Enable **Edit Messages** and **Delete Messages** if Telegram presents those options.
3. Save the administrator settings.

## Database migration

Run the SQL in `db/rivo-telegram-product-posts.sql` once against the production PostgreSQL database (for example, in the Supabase SQL Editor). It adds `products.telegram_message_id`, which stores the channel message ID so the app can edit or delete the correct post.

## Behavior

- Creating an active product publishes it automatically to the public channel.
- Updating an active product edits its existing post, including its image when Telegram permits it. If the post cannot be edited, the integration attempts to replace it.
- Deactivating a product removes its channel post.
- Deleting a product removes its channel post before deleting the database record.
- Order and customer notifications continue to use the configured private admin group, not the public channel.
- The storefront footer includes a Telegram channel icon and the `Developed by EL-sayed Hasan` credit. The credit links to WhatsApp when a store WhatsApp/support number is configured.

If a Telegram API operation fails, check the Vercel function logs for `telegram_api_*` or `telegram_product_*` errors.

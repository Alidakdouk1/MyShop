-- Migration 051: WhatsApp order-notification templates.
-- Seeded as a JSON blob in app_settings so the admin can edit templates
-- without an extra table — same pattern as bank_transfer, whish, etc.
--
-- Uses MySQL JSON_OBJECT() to produce valid JSON (preserves escape sequences
-- inside string literals). A naive INSERT of a JSON-shaped string with literal
-- newlines would store unescaped \n characters that json_decode() rejects.
INSERT INTO `app_settings` (`setting_key`, `setting_value`)
VALUES ('whatsapp_notifications', JSON_OBJECT(
  'enabled', 1,
  'templates', JSON_OBJECT(
    'order_placed', JSON_OBJECT(
      'enabled', 1,
      'text', 'Hi {customer_name}, thanks for your order at Pick&Go LB! Order #{order_id} - Total: {total}. Reference: {reference}. We will confirm payment and ship soon. Reply if you have any questions.'
    ),
    'payment_confirmed', JSON_OBJECT(
      'enabled', 1,
      'text', 'Hi {customer_name}, payment received for Order #{order_id}. We are preparing your items and you will hear from us once it ships.'
    ),
    'shipped', JSON_OBJECT(
      'enabled', 1,
      'text', 'Hi {customer_name}, your Order #{order_id} is on its way! Expect it within 2-4 business days. Reply if anything comes up.'
    ),
    'delivered', JSON_OBJECT(
      'enabled', 1,
      'text', 'Hi {customer_name}, hope your order arrived safely! We would love a quick review when you have a moment. Thanks for shopping with Pick&Go LB.'
    ),
    'cancelled', JSON_OBJECT(
      'enabled', 1,
      'text', 'Hi {customer_name}, your Order #{order_id} has been cancelled. Any questions or refund concerns, just reply here.'
    )
  )
))
ON DUPLICATE KEY UPDATE `setting_value` = VALUES(`setting_value`);

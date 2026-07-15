# Notifications UX Audit

## Summary
Notifications are now treated as an inbox-first experience for teachers, admins, and parents, with urgent items able to surface as toast-style prompts.

## What improved
- Bell dropdown now supports loading, error, empty, and unread states.
- Keyboard and focus behavior are improved for mobile and desktop use.
- High-priority items can appear as temporary toasts without losing the inbox context.
- Read state is persisted locally in the browser so the UI still works with the current Supabase schema.

## Recommendations for next iteration
1. Add a dedicated notification detail view for longer messages.
2. Support server-side read state if a `read_at` column is added later.
3. Add analytics for open, dismiss, and mark-all-read actions.

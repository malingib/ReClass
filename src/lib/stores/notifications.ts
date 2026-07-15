import { writable } from 'svelte/store';
import type { NotificationItem } from '$lib/notifications';

export const notificationItems = writable<NotificationItem[]>([]);
export const notificationCount = writable(0);
export const notificationLoading = writable(false);
export const notificationError = writable<string | null>(null);
export const notificationOpen = writable(false);

import { Capacitor } from "@capacitor/core";
import {
  LocalNotifications,
  type PermissionStatus,
} from "@capacitor/local-notifications";
import type { FinancialEvent } from "@/db/database";

function getNotificationIdForEvent(eventId: string): number {
  // Convierte el id string en un número estable para la notificación
  let hash = 0;
  for (let i = 0; i < eventId.length; i++) {
    hash = (hash * 31 + eventId.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) || 1;
}

function getNextTriggerDate(dayOfMonth: number, hour: number, minute: number): Date {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  const daysInCurrentMonth = new Date(year, month + 1, 0).getDate();
  const safeDayCurrent = Math.min(dayOfMonth, daysInCurrentMonth);

  let trigger = new Date(year, month, safeDayCurrent, hour, minute, 0, 0);

  if (trigger <= now) {
    const nextMonthDate = new Date(year, month + 1, 1);
    const nextYear = nextMonthDate.getFullYear();
    const nextMonth = nextMonthDate.getMonth();
    const daysInNextMonth = new Date(nextYear, nextMonth + 1, 0).getDate();
    const safeDayNext = Math.min(dayOfMonth, daysInNextMonth);

    trigger = new Date(nextYear, nextMonth, safeDayNext, hour, minute, 0, 0);
  }

  return trigger;
}

export async function ensureNotificationPermissions() {
  if (!Capacitor.isNativePlatform()) return true;

  const permissions: PermissionStatus =
    await LocalNotifications.checkPermissions();

  if (permissions.display === "granted") return true;

  const requested = await LocalNotifications.requestPermissions();
  return requested.display === "granted";
}

export async function scheduleFinancialEventNotification(event: FinancialEvent) {
  if (!Capacitor.isNativePlatform()) return;

  const granted = await ensureNotificationPermissions();
  if (!granted) return;

  const notificationId = getNotificationIdForEvent(event.id);
  const scheduleAt = getNextTriggerDate(
  event.day_of_month,
  event.hour ?? 9,
  event.minute ?? 0
); 

  await LocalNotifications.cancel({
    notifications: [{ id: notificationId }],
  });

  await LocalNotifications.schedule({
    notifications: [
      {
        id: notificationId,
        title: `Pago programado: ${event.name}`,
        body: `Hoy vence ${event.name} por ${event.amount}.`,
        schedule: {
          at: scheduleAt,
        },
        extra: {
          eventId: event.id,
          type: event.type,
        },
      },
    ],
  });
}

export async function cancelFinancialEventNotification(eventId: string) {
  if (!Capacitor.isNativePlatform()) return;

  const notificationId = getNotificationIdForEvent(eventId);

  await LocalNotifications.cancel({
    notifications: [{ id: notificationId }],
  });
}

export async function rescheduleAllFinancialEventNotifications(
  events: FinancialEvent[]
) {
  if (!Capacitor.isNativePlatform()) return;

  const granted = await ensureNotificationPermissions();
  if (!granted) return;

  for (const event of events) {
    if (!event.is_active) continue;
    await scheduleFinancialEventNotification(event);
  }
}

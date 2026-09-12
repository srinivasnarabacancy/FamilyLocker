import { Reminder } from '@prisma/client';
import { ReminderView } from '../../mail/templates';
import { daysUntil, nextOccurrence } from '../../common/reminder-logic';

/** Adapts a Reminder row into the shape the e-mail templates expect. */
export function toReminderView(r: Reminder, now: Date = new Date()): ReminderView {
  return {
    title: r.title,
    type: r.type,
    description: r.description,
    recursYearly: r.recursYearly,
    remindDaysBefore: r.remindDaysBefore,
    nextOccurrence: nextOccurrence(r.occasionDate, r.recursYearly, now),
    daysUntil: daysUntil(r.occasionDate, r.recursYearly, now),
  };
}

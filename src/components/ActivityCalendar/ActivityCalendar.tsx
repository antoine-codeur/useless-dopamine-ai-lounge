import { subDays } from "date-fns";
import "./ActivityCalendar.css";

type ActivityCalendarProps = {
  activityByDate: Record<string, number>;
  planLabel?: string;
};

export function ActivityCalendar({ activityByDate, planLabel = "Guest" }: ActivityCalendarProps) {
  const days = Array.from({ length: 35 }, (_, index) => {
    const date = subDays(new Date(), 34 - index);
    const key = date.toISOString().slice(0, 10);
    const value = activityByDate[key] ?? 0;
    const level = Math.min(4, Math.ceil(value / 3));

    return { key, level, value };
  });

  return (
    <div className="activity-calendar" aria-label="Local activity">
      {days.map((day) => (
        <span
          aria-label={`${day.key}: ${day.value} points on ${planLabel}`}
          className="activity-calendar__cell"
          data-level={day.level}
          data-tooltip={`${day.key} · ${day.value} points · ${planLabel} plan`}
          key={day.key}
        />
      ))}
    </div>
  );
}

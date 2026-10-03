import { endOfDay, format, startOfDay, subDays } from 'date-fns'

export function formatDateTime(value: string) {
  const date = new Date(value)
  return {
    date: format(date, 'd MMM yyyy'),
    time: format(date, 'h:mm a'),
    friendlyDate: format(date, 'EEE, d MMM')
  }
}

export function toLocalDateTimeInput(date = new Date()) {
  const offset = date.getTimezoneOffset()
  const local = new Date(date.getTime() - offset * 60_000)
  return local.toISOString().slice(0, 16)
}

export function rollingWeek(offset = 0) {
  const end = endOfDay(subDays(new Date(), offset * 7))
  const start = startOfDay(subDays(end, 6))
  return { start, end }
}

export function formatPeriod(start: Date, end: Date) {
  return format(start, 'd MMM') + ' – ' + format(end, 'd MMM yyyy')
}

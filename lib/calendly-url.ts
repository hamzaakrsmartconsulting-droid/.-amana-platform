/** URL unique de prise de RDV Calendly (visio / premium / conseil). */
export const CALENDLY_BOOKING_URL =
  process.env.NEXT_PUBLIC_CALENDLY_URL ??
  process.env.NEXT_PUBLIC_CALENDLY_PREMIUM_URL ??
  'https://calendly.com/amana-patrimoine/30min'

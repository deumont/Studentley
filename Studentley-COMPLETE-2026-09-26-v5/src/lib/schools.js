export const SCHOOL_OPTIONS = [
  { value: 'ISR', label: 'ISR - International School on the Rhine' },
  { value: 'Other', label: 'Other school' },
  { value: 'Prefer not to say', label: 'Prefer not to say' },
]

export const isIsrEmail = value => /^\d{5}@isr-school[.]de$/i.test(String(value || '').trim())


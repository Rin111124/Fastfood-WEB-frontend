import { format, parseISO } from 'date-fns'

const currencyFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0
})

const numberFormatter = new Intl.NumberFormat('vi-VN')

export const formatCurrency = (value) => currencyFormatter.format(Number(value || 0))

export const formatNumber = (value) => numberFormatter.format(Number(value || 0))

export const formatMonthLabel = (value) => {
  try {
    const parsed = parseISO(`${value}-01`)
    return format(parsed, 'MMM yyyy')
  } catch (error) {
    console.error('formatMonthLabel failed', error)
    return value
  }
}

const toSafeDate = (value) => {
  if (value === undefined || value === null || value === '') return null
  const candidate = typeof value === 'number' ? value : String(value).trim()
  if (!candidate) return null
  const date = new Date(candidate)
  return Number.isNaN(date.getTime()) ? null : date
}

export const formatDateTime = (value) => {
  try {
    const date = toSafeDate(value)
    if (!date) return value ?? '-'
    return format(date, 'dd/MM/yyyy HH:mm')
  } catch (error) {
    console.error('formatDateTime failed', error)
    return value ?? '-'
  }
}

export const formatDate = (value) => {
  try {
    return format(new Date(value), 'dd/MM/yyyy')
  } catch (error) {
    console.error('formatDate failed', error)
    return value
  }
}

export const formatTime = (value) => {
  try {
    return format(new Date(`1970-01-01T${value}`), 'HH:mm')
  } catch (error) {
    console.error('formatTime failed', error)
    return value
  }
}

import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { getCurrencies } from '../api/currencyApi'

const BASE = { code: 'USD', symbol: '$', rate: 1, is_default: 1 }
const STORAGE_KEY = 'myshop_currency'

const CurrencyContext = createContext(null)

export function CurrencyProvider({ children }) {
  const [currencies, setCurrencies] = useState([BASE])
  const [code, setCode] = useState(() => localStorage.getItem(STORAGE_KEY) || '')

  useEffect(() => {
    getCurrencies()
      .then(r => {
        const list = (r.data.data || []).map(c => ({ ...c, rate: Number(c.rate) }))
        if (list.length) {
          setCurrencies(list)
          // Adopt the default if the shopper hasn't chosen one (or chose a now-disabled one).
          setCode(prev => (prev && list.some(c => c.code === prev))
            ? prev
            : (list.find(c => c.is_default)?.code || list[0].code))
        }
      })
      .catch(() => {})
  }, [])

  const current = useMemo(
    () => currencies.find(c => c.code === code) || currencies.find(c => c.is_default) || currencies[0] || BASE,
    [currencies, code]
  )

  const setCurrency = (newCode) => {
    setCode(newCode)
    try { localStorage.setItem(STORAGE_KEY, newCode) } catch { /* ignore */ }
  }

  // Convert a base-currency (USD) amount and format it with the active symbol.
  const format = (usd) => {
    const v = (Number(usd) || 0) * (current.rate || 1)
    return `${current.symbol}${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  const convert = (usd) => (Number(usd) || 0) * (current.rate || 1)

  const value = useMemo(
    () => ({ currencies, current, setCurrency, format, convert }),
    [currencies, current]
  )

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>
}

export function useCurrency() {
  return useContext(CurrencyContext) || {
    currencies: [BASE], current: BASE,
    setCurrency: () => {},
    format: (usd) => `$${(Number(usd) || 0).toFixed(2)}`,
    convert: (usd) => Number(usd) || 0,
  }
}

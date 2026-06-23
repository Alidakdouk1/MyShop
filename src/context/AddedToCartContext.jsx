import { createContext, useCallback, useContext, useState } from 'react'
import AddedToCartPopover from '../components/cart/AddedToCartPopover'

/**
 * Tiny "added to cart" notifier. Wrap the app in <AddedToCartProvider> once;
 * call `useAddedToCart().show({ product, qty, image })` from any add-to-cart
 * handler. One popover at a time — a new show replaces whatever is on screen.
 */
const Ctx = createContext({ show: () => {} })

export function AddedToCartProvider({ children }) {
  const [current, setCurrent] = useState(null)

  const show = useCallback((payload) => {
    // `id` re-keys the popover so a rapid second add re-triggers the slide-in
    // animation instead of leaving the old one frozen on screen.
    setCurrent({ ...payload, id: Date.now() + Math.random() })
  }, [])

  const close = useCallback(() => setCurrent(null), [])

  return (
    <Ctx.Provider value={{ show }}>
      {children}
      {current && (
        <AddedToCartPopover
          key={current.id}
          product={current.product}
          qty={current.qty}
          image={current.image}
          onClose={close}
        />
      )}
    </Ctx.Provider>
  )
}

export const useAddedToCart = () => useContext(Ctx)

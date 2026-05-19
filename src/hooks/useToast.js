import { useDispatch } from 'react-redux'
import { addToast } from '../store/slices/uiSlice'

export function useToast() {
  const dispatch = useDispatch()
  return {
    success: (message) => dispatch(addToast({ type: 'success', message })),
    error:   (message) => dispatch(addToast({ type: 'error',   message })),
    info:    (message) => dispatch(addToast({ type: 'info',    message })),
    warning: (message) => dispatch(addToast({ type: 'warning', message })),
  }
}

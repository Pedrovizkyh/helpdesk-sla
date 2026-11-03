import { useEffect, useState } from 'react'

export function useDebounce<T>(valor: T, ms = 300) {
  const [v, setV] = useState(valor)
  useEffect(() => {
    const id = setTimeout(() => setV(valor), ms)
    return () => clearTimeout(id)
  }, [valor, ms])
  return v
}

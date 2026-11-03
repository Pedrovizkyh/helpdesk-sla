import { useEffect, useState } from 'react'

/** "Agora" que se atualiza sozinho, para os contadores de SLA andarem na tela. */
export function useAgora(intervaloMs = 30_000) {
  const [agora, setAgora] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setAgora(Date.now()), intervaloMs)
    return () => clearInterval(id)
  }, [intervaloMs])
  return agora
}

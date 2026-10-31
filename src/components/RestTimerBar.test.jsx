import { createRef } from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, act, cleanup } from '@testing-library/react'
import RestTimerBar from './RestTimerBar'

const KEY = 'gymtrack.restTimer'
const NOW = new Date('2026-01-01T10:00:00Z').getTime()

beforeEach(() => {
  localStorage.clear()
  vi.useFakeTimers({ now: NOW })
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

const digits = () => document.querySelector('.rest-bar-time').textContent
const caption = () => document.querySelector('.rest-bar-caption').textContent

describe('RestTimerBar', () => {
  it('arranca un descanso desde el formulario', () => {
    const ref = createRef()
    render(<RestTimerBar ref={ref} />)
    act(() => ref.current.restart(30))
    expect(digits()).toBe('00:30')
    expect(caption()).toBe('descansando')
    expect(JSON.parse(localStorage.getItem(KEY)).running).toBe(true)
  })

  it('si no se indica duración, usa el total elegido', () => {
    const ref = createRef()
    render(<RestTimerBar ref={ref} />)
    act(() => ref.current.restart())
    expect(digits()).toBe('01:30')
    expect(caption()).toBe('descansando')
  })

  it('permite pausar y seguir el descanso', () => {
    const ref = createRef()
    render(<RestTimerBar ref={ref} />)
    act(() => ref.current.restart(60))
    act(() => document.querySelector('[aria-label="Pausar descanso"]').click())
    expect(caption()).toBe('en pausa')
    act(() => vi.advanceTimersByTime(500)) // pasa la ventana anti doble toque
    act(() => document.querySelector('[aria-label="Seguir descanso"]').click())
    expect(caption()).toBe('descansando')
  })
})

describe('RestTimerBar: barra global', () => {
  it('no ocupa lugar mientras el descanso está inactivo', () => {
    render(<RestTimerBar onlyWhenActive />)
    expect(document.querySelector('.rest-bar')).toBeNull()
  })

  it('aparece al arrancar y se va al reiniciar', () => {
    const ref = createRef()
    render(<RestTimerBar onlyWhenActive ref={ref} />)
    act(() => ref.current.restart(30))
    expect(document.querySelector('.rest-bar')).not.toBeNull()
    act(() => document.querySelector('[aria-label="Reiniciar descanso"]').click())
    expect(document.querySelector('.rest-bar')).toBeNull()
  })

  it('sigue visible en pausa para poder retomarlo desde otra pantalla', () => {
    const ref = createRef()
    render(<RestTimerBar onlyWhenActive ref={ref} />)
    act(() => ref.current.restart(60))
    act(() => document.querySelector('[aria-label="Pausar descanso"]').click())
    expect(document.querySelector('.rest-bar')).not.toBeNull()
    expect(caption()).toBe('en pausa')
  })
})

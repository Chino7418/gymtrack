import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react'
import RestTimer from './RestTimer'

const KEY = 'gymtrack.restTimer'
const NOW = new Date('2026-01-01T10:00:00Z').getTime()

const digits = () => document.querySelector('.timer-digits').textContent
const caption = () => document.querySelector('.timer-caption').textContent
const guardado = () => JSON.parse(localStorage.getItem(KEY))
const avanzar = (ms) => act(() => { vi.advanceTimersByTime(ms) })
const click = (nombre) => act(() => { fireEvent.click(screen.getByRole('button', { name: nombre })) })

beforeEach(() => {
  localStorage.clear()
  vi.useFakeTimers({ now: NOW })
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('RestTimer: estado inicial', () => {
  it('arranca en 01:30, listo, con el botón Iniciar', () => {
    render(<RestTimer />)
    expect(digits()).toBe('01:30')
    expect(caption()).toBe('listo')
    expect(screen.getByRole('button', { name: /Iniciar/ })).toBeTruthy()
  })

  it('ignora un localStorage corrupto y usa los valores por defecto', () => {
    localStorage.setItem(KEY, '{no es json')
    render(<RestTimer />)
    expect(digits()).toBe('01:30')
  })
})

describe('RestTimer: restaurar desde localStorage', () => {
  it('sigue corriendo con el tiempo que falta si todavía no terminó', () => {
    localStorage.setItem(KEY, JSON.stringify({ total: 90, left: 90, running: true, done: false, endAt: NOW + 45_000 }))
    render(<RestTimer />)
    expect(digits()).toBe('00:45')
    expect(caption()).toBe('descansando')
    expect(screen.getByRole('button', { name: /Pausar/ })).toBeTruthy()
  })

  it('marca como terminado si la hora de fin ya pasó', () => {
    localStorage.setItem(KEY, JSON.stringify({ total: 60, left: 30, running: true, done: false, endAt: NOW - 5_000 }))
    render(<RestTimer />)
    expect(digits()).toBe('00:00')
    expect(caption()).toBe('¡A la serie!')
    expect(screen.getByRole('button', { name: /Iniciar/ })).toBeTruthy()
  })

  it('restaura un temporizador en pausa y ofrece Seguir', () => {
    localStorage.setItem(KEY, JSON.stringify({ total: 90, left: 40, running: false, done: false, endAt: 0 }))
    render(<RestTimer />)
    expect(digits()).toBe('00:40')
    expect(caption()).toBe('en pausa')
    expect(screen.getByRole('button', { name: /Seguir/ })).toBeTruthy()
  })
})

describe('RestTimer: cuenta regresiva', () => {
  it('descuenta el tiempo y guarda el estado', () => {
    render(<RestTimer />)
    click(/Iniciar/)
    avanzar(10_000)
    expect(digits()).toBe('01:20')
    expect(guardado().running).toBe(true)
    expect(guardado().endAt).toBe(NOW + 90_000)
  })

  it('al llegar a cero termina, vibra y queda en "A la serie"', () => {
    const vibrate = vi.fn()
    Object.defineProperty(navigator, 'vibrate', { value: vibrate, configurable: true })
    render(<RestTimer />)
    click(/30 segundos/)
    click(/Iniciar/)
    avanzar(31_000)
    expect(digits()).toBe('00:00')
    expect(caption()).toBe('¡A la serie!')
    expect(vibrate).toHaveBeenCalledTimes(1)
    delete navigator.vibrate
  })

  it('elegir un preset cambia el total y frena el conteo', () => {
    render(<RestTimer />)
    click(/2 minutos/)
    expect(digits()).toBe('02:00')
    expect(guardado().total).toBe(120)
    expect(guardado().running).toBe(false)
  })
})

describe('RestTimer: pausa y +15', () => {
  it('pausa, muestra Seguir tras +15 y retoma desde el tiempo sumado', () => {
    render(<RestTimer />)
    click(/Iniciar/)
    avanzar(1_000)
    avanzar(500) // pasa la ventana anti doble toque
    click(/Pausar/)
    expect(caption()).toBe('en pausa')
    const antes = digits()
    click('+15 segundos')
    expect(digits()).not.toBe(antes)
    expect(screen.getByRole('button', { name: /Seguir/ })).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Iniciar/ })).toBeNull()

    avanzar(500)
    click(/Seguir/)
    expect(caption()).toBe('descansando')
    // quedaban ~88,5 s + 15 s ≈ 103,5 s → se muestra 01:44 (redondea hacia arriba)
    expect(digits()).toBe('01:44')
  })

  it('+15 corriendo suma 15 segundos a la hora de fin', () => {
    render(<RestTimer />)
    click(/Iniciar/)
    click('+15 segundos')
    expect(guardado().endAt).toBe(NOW + 105_000)
  })

  it('+15 con el descanso terminado arranca un nuevo descanso de 15 segundos', () => {
    localStorage.setItem(KEY, JSON.stringify({ total: 60, left: 0, running: false, done: true, endAt: NOW - 1000 }))
    render(<RestTimer />)
    click('+15 segundos')
    expect(digits()).toBe('00:15')
    expect(caption()).toBe('descansando')
  })

  it('reiniciar vuelve al total y detiene el conteo', () => {
    render(<RestTimer />)
    click(/Iniciar/)
    avanzar(5_000)
    click('Reiniciar')
    expect(digits()).toBe('01:30')
    expect(caption()).toBe('listo')
  })
})

describe('RestTimer: doble toque', () => {
  it('ignora el segundo toque rápido: no pausa lo recién iniciado', () => {
    render(<RestTimer />)
    click(/Iniciar/)
    click(/Pausar/) // mismo instante: el botón ya cambió bajo el dedo
    expect(caption()).toBe('descansando')
    expect(screen.getByRole('button', { name: /Pausar/ })).toBeTruthy()
  })

  it('un toque pasada la ventana de 400 ms sí se atiende', () => {
    render(<RestTimer />)
    click(/Iniciar/)
    avanzar(500)
    click(/Pausar/)
    expect(caption()).toBe('en pausa')
  })
})

describe('RestTimer: +15 en reposo', () => {
  it('sin haber iniciado, +15 alarga la duración y no queda "en pausa"', () => {
    render(<RestTimer />)
    click('+15 segundos')
    expect(digits()).toBe('01:45')
    expect(caption()).toBe('listo')
    expect(screen.getByRole('button', { name: /Iniciar/ })).toBeTruthy()
    expect(guardado().total).toBe(105)
  })
})

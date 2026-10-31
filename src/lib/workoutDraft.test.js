import { describe, it, expect, beforeEach } from 'vitest'
import { readWorkoutDraft, writeWorkoutDraft, clearWorkoutDraft } from './workoutDraft'

const draft = { name: 'Pecho', date: '2026-10-31', notes: '', attend: true, items: [{ exercise_id: 'ex-1' }] }

beforeEach(() => localStorage.clear())

describe('workoutDraft', () => {
  it('guarda y lee un borrador por usuario', () => {
    writeWorkoutDraft('u1', draft)
    expect(readWorkoutDraft('u1')).toEqual(draft)
  })

  it('no mezcla borradores de usuarios distintos', () => {
    writeWorkoutDraft('u1', draft)
    expect(readWorkoutDraft('u2')).toBeNull()
  })

  it('devuelve null si no hay borrador', () => {
    expect(readWorkoutDraft('u1')).toBeNull()
  })

  it('ignora un JSON inválido o con forma inesperada', () => {
    localStorage.setItem('unamas.workoutDraft.u1', '{no es json')
    expect(readWorkoutDraft('u1')).toBeNull()
    localStorage.setItem('unamas.workoutDraft.u1', JSON.stringify({ name: 'Pecho' }))
    expect(readWorkoutDraft('u1')).toBeNull()
  })

  it('borra solo el borrador del usuario indicado', () => {
    writeWorkoutDraft('u1', draft)
    writeWorkoutDraft('u2', draft)
    clearWorkoutDraft('u1')
    expect(readWorkoutDraft('u1')).toBeNull()
    expect(readWorkoutDraft('u2')).toEqual(draft)
  })

  it('no falla si no hay usuario', () => {
    expect(readWorkoutDraft()).toBeNull()
    expect(() => writeWorkoutDraft(null, draft)).not.toThrow()
    expect(() => clearWorkoutDraft()).not.toThrow()
  })
})

import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient.js'
import { useAuth } from '../hooks/useAuth.jsx'

export default function WorkoutForm() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const { user } = useAuth()
  const navigate = useNavigate()
  const [exercises, setExercises] = useState([])
  const [form, setForm] = useState({ workout_date: new Date().toISOString().slice(0,10), name:'', notes:'' })
  const [items, setItems] = useState([]) // [{exercise_id, position, notes, sets:[{set_number,weight_kg,reps,notes}]}]
  const [att, setAtt] = useState(true)
  const [loading, setLoading] = useState(false)

  useEffect(()=>{
    if (!user) return
    supabase.from('exercises').select('*').eq('user_id',user.id).eq('is_active',true).order('name').then(({data})=>setExercises(data||[]))
    if (isEdit) {
      supabase.from('workouts').select('*,workout_exercises(*,exercise_id,exercises(id,name),workout_sets(*))').eq('id',id).eq('user_id',user.id).single().then(({data})=>{
        if (data) {
          setForm({ workout_date:data.workout_date, name:data.name||'', notes:data.notes||'' })
          const it = (data.workout_exercises||[]).sort((a,b)=>a.position-b.position).map(we=>({
            id: we.id,
            exercise_id: we.exercise_id,
            position: we.position,
            notes: we.notes||'',
            sets: (we.workout_sets||[]).sort((a,b)=>a.set_number-b.set_number).map(s=>({ id:s.id, set_number:s.set_number, weight_kg:s.weight_kg, reps:s.reps, notes:s.notes||'' }))
          }))
          setItems(it)
        }
      })
    } else {
      setItems([])
    }
  },[user,id,isEdit])

  const addExercise = () => {
    const exId = exercises[0]?.id
    if (!exId) return
    setItems([...items, { exercise_id: exId, position: items.length+1, notes:'', sets: [{set_number:1, weight_kg:'', reps:'', notes:''}] }])
  }

  const removeExercise = (idx) => setItems(items.filter((_,i)=>i!==idx).map((it,i)=>({...it,position:i+1})))

  const addSet = (idx) => {
    const sets = [...items[idx].sets, { set_number: items[idx].sets.length+1, weight_kg:'', reps:'', notes:'' }]
    setItems(items.map((it,i)=> i===idx? {...it, sets}: it))
  }

  const removeSet = (eIdx,sIdx) => {
    const sets = items[eIdx].sets.filter((_,i)=>i!==sIdx).map((s,i)=>({...s,set_number:i+1}))
    setItems(items.map((it,i)=> i===eIdx? {...it, sets}: it))
  }

  const updateItem = (eIdx, field, val) => setItems(items.map((it,i)=> i===eIdx? {...it,[field]:val}: it))
  const updateSet = (eIdx,sIdx, field, val) => setItems(items.map((it,i)=> i===eIdx? {...it, sets: it.sets.map((s,j)=> j===sIdx? {...s,[field]:val}: s)}: it))

  const save = async () => {
    if (!user || items.length===0) return alert('Agrega al menos un ejercicio')
    setLoading(true)
    const payload = {
      workout_id: isEdit ? id : null,
      workout_date: form.workout_date,
      name: form.name||null,
      notes: form.notes||null,
      exercises: items.map(it=>({
        exercise_id: it.exercise_id,
        position: it.position,
        notes: it.notes||null,
        sets: it.sets.map(s=>({ set_number:s.set_number, weight_kg:s.weight_kg===''?0:s.weight_kg, reps:s.reps===''?0:s.reps, notes:s.notes||null }))
      })),
      attendance: { record: att }
    }
    const { data, error } = await supabase.rpc('save_workout', payload)
    setLoading(false)
    if (error) alert(error.message)
    else navigate(`/workouts/${data.id}`)
  }

  return (
    <div className="card p-3">
      <h5>{isEdit?'Editar':'Nuevo'} entrenamiento</h5>
      <div className="row g-2 mb-3">
        <div className="col-md-3"><label className="form-label">Fecha</label><input type="date" className="form-control" value={form.workout_date} onChange={e=>setForm({...form,workout_date:e.target.value})} /></div>
        <div className="col-md-4"><label className="form-label">Nombre (opcional)</label><input className="form-control" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} /></div>
        <div className="col-md-5"><label className="form-label">Observaciones (opcional)</label><input className="form-control" value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} /></div>
      </div>
      {!isEdit && <div className="form-check mb-2"><input className="form-check-input" type="checkbox" checked={att} onChange={e=>setAtt(e.target.checked)}/><label className="form-check-label">Registrar asistencia para esta fecha</label></div>}
      <div className="mb-2">
        <button className="btn btn-sm btn-outline-light" onClick={addExercise}>Agregar ejercicio</button>
      </div>
      {items.map((it,idx)=>(
        <div key={idx} className="border rounded p-2 mb-3">
          <div className="row g-2 mb-2">
            <div className="col-md-4"><label className="form-label">Ejercicio</label>
              <select className="form-select" value={it.exercise_id} onChange={e=>updateItem(idx,'exercise_id',e.target.value)}>
                {exercises.map(ex=><option key={ex.id} value={ex.id}>{ex.name} ({ex.muscle_group})</option>)}
              </select>
            </div>
            <div className="col-md-8"><label className="form-label">Notas</label><input className="form-control" value={it.notes} onChange={e=>updateItem(idx,'notes',e.target.value)} /></div>
          </div>
          <div className="mb-2">
            <button className="btn btn-sm btn-outline-light" onClick={()=>addSet(idx)}>Agregar serie</button>
            <button className="btn btn-sm btn-outline-danger ms-2" onClick={()=>removeExercise(idx)}>Quitar ejercicio</button>
          </div>
          <div className="table-responsive">
            <table className="table table-sm">
              <thead><tr><th>#</th><th>Peso kg</th><th>Reps</th><th>Notas</th><th></th></tr></thead>
              <tbody>
                {it.sets.map((s,sIdx)=>(
                  <tr key={sIdx}>
                    <td>{s.set_number}</td>
                    <td><input type="number" step="0.01" className="form-control form-control-sm" value={s.weight_kg} onChange={e=>updateSet(idx,sIdx,'weight_kg',e.target.value)} /></td>
                    <td><input type="number" className="form-control form-control-sm" value={s.reps} onChange={e=>updateSet(idx,sIdx,'reps',e.target.value)} /></td>
                    <td><input className="form-control form-control-sm" value={s.notes} onChange={e=>updateSet(idx,sIdx,'notes',e.target.value)} /></td>
                    <td><button className="btn btn-sm btn-outline-danger" onClick={()=>removeSet(idx,sIdx)}>X</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
      <button className="btn btn-primary" disabled={loading} onClick={save}>{loading?'Guardando...':'Guardar entrenamiento'}</button>
    </div>
  )
}

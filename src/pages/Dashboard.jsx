import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient.js'
import { useAuth } from '../hooks/useAuth.jsx'
import { Link } from 'react-router-dom'
import dayjs from 'dayjs'

export default function Dashboard() {
  const { user, profile } = useAuth()
  const [stats, setStats] = useState({ lastWeight:null, lastWorkout:null, workoutsMonth:0, attendMonth:0, recent:[] })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    async function load() {
      const startMonth = dayjs().startOf('month').format('YYYY-MM-DD')
      const endMonth = dayjs().endOf('month').format('YYYY-MM-DD')
      const now = dayjs().format('YYYY-MM-DD')

      const [{data:lastW}, {data:lastWo}, {count:wCount}, {count:aCount}, {data:recentEx}] = await Promise.all([
        supabase.from('body_weight_entries').select('weight_kg,recorded_date').eq('user_id',user.id).order('recorded_date',{ascending:false}).limit(1),
        supabase.from('workouts').select('id,workout_date,name').eq('user_id',user.id).order('workout_date',{ascending:false}).limit(1),
        supabase.from('workouts').select('*',{count:'exact',head:true}).eq('user_id',user.id).gte('workout_date',startMonth).lte('workout_date',endMonth),
        supabase.from('gym_attendances').select('*',{count:'exact',head:true}).eq('user_id',user.id).gte('attendance_date',startMonth).lte('attendance_date',endMonth),
        supabase.from('workout_exercises').select('exercise_id,exercises(id,name,muscle_group)').limit(10)
      ])
      // recent: get last 5 unique exercises used by user via workouts
      const {data: recent} = await supabase
        .from('workout_exercises')
        .select('exercises(id,name,muscle_group),workouts!inner(user_id,id,workout_date)')
        .eq('workouts.user_id', user.id)
        .order('workouts.workout_date',{ascending:false})
        .limit(20)
      const seen = new Set()
      const rec = []
      for (const r of recent||[]) {
        const ex = r.exercises
        if (ex && !seen.has(ex.id)) { seen.add(ex.id); rec.push(ex); if (rec.length>=5) break }
      }
      setStats({ lastWeight: lastW?.[0]||null, lastWorkout: lastWo?.[0]||null, workoutsMonth: wCount||0, attendMonth: aCount||0, recent: rec })
      setLoading(false)
    }
    load()
  }, [user])

  if (loading) return <p>Cargando...</p>

  return (
    <div>
      <h4 className="mb-3">Hola, {profile?.first_name || profile?.username}</h4>
      {(!stats.lastWorkout && !stats.lastWeight) && (
        <div className="alert alert-info">Aún no tienes registros. Empezá creando ejercicios y registrando tu primer entrenamiento.</div>
      )}
      <div className="row g-3">
        <div className="col-md-3 col-sm-6"><div className="card p-3"><small className="text-muted">Último peso</small><h5>{stats.lastWeight ? `${stats.lastWeight.weight_kg} kg (${stats.lastWeight.recorded_date})` : '-'}</h5></div></div>
        <div className="col-md-3 col-sm-6"><div className="card p-3"><small className="text-muted">Último entrenamiento</small><h6>{stats.lastWorkout ? `${stats.lastWorkout.workout_date}${stats.lastWorkout.name? ' - '+stats.lastWorkout.name:''}` : '-'}</h6></div></div>
        <div className="col-md-3 col-sm-6"><div className="card p-3"><small className="text-muted">Entrenamientos este mes</small><h5>{stats.workoutsMonth}</h5></div></div>
        <div className="col-md-3 col-sm-6"><div className="card p-3"><small className="text-muted">Asistencias este mes</small><h5>{stats.attendMonth}</h5></div></div>
      </div>
      <div className="mt-4 d-flex flex-wrap gap-2">
        <Link className="btn btn-primary" to="/workouts/new">Registrar entrenamiento</Link>
        <Link className="btn btn-outline-light" to="/attendance">Registrar asistencia</Link>
        <Link className="btn btn-outline-light" to="/weight">Registrar peso</Link>
        <Link className="btn btn-outline-light" to="/exercises">Mis ejercicios</Link>
      </div>
      {stats.recent.length>0 && (
        <div className="card p-3 mt-4">
          <h6>Ejercicios usados recientemente</h6>
          <ul className="mb-0">
            {stats.recent.map(e=> <li key={e.id}>{e.name} <small className="text-muted">({e.muscle_group})</small></li>)}
          </ul>
        </div>
      )}
    </div>
  )
}

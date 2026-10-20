import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { Protected } from './components/Layout'
import { Login, Register, Forgot, Reset } from './pages/AuthPages'
import Dashboard from './pages/Dashboard'
import Workouts from './pages/Workouts'
import WorkoutForm from './pages/WorkoutForm'
import Exercises from './pages/Exercises'
import Attendance from './pages/Attendance'
import Weight from './pages/Weight'
import Profile from './pages/Profile'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot" element={<Forgot />} />
          <Route path="/reset-password" element={<Reset />} />
          <Route element={<Protected />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/workouts" element={<Workouts />} />
            <Route path="/workouts/new" element={<WorkoutForm />} />
            <Route path="/workouts/:id" element={<WorkoutForm />} />
            <Route path="/exercises" element={<Exercises />} />
            <Route path="/attendance" element={<Attendance />} />
            <Route path="/weight" element={<Weight />} />
            <Route path="/profile" element={<Profile />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

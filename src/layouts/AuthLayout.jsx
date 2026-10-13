import { Outlet } from 'react-router-dom'

export default function AuthLayout() {
  return (
    <div className="min-vh-100 d-flex align-items-center">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-md-6 col-lg-4">
            <h3 className="text-center mb-4">GymTrack</h3>
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  )
}

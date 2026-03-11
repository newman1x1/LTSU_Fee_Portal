import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import { DataProvider } from './context/DataContext'
import ProtectedRoute from './components/layout/ProtectedRoute'
import ErrorBoundary from './components/ErrorBoundary'
import Spinner from './components/ui/Spinner'

const LandingPage = lazy(() => import('./pages/LandingPage'))
const StudentFormPage = lazy(() => import('./pages/StudentFormPage'))
const TrackingPage = lazy(() => import('./pages/TrackingPage'))
const LoginPage = lazy(() => import('./pages/LoginPage'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const AdminPage = lazy(() => import('./pages/AdminPage'))
const ActivityLogPage = lazy(() => import('./pages/ActivityLogPage'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <DataProvider>
            <ErrorBoundary>
              <Suspense fallback={<Spinner />}>
                <Routes>
                  <Route path="/" element={<LandingPage />} />
                  <Route path="/submit" element={<StudentFormPage />} />
                  <Route path="/track" element={<TrackingPage />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route
                    path="/dashboard"
                    element={
                      <ProtectedRoute allowedRoles={['cr', 'teacher']}>
                        <DashboardPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="/admin" element={<AdminPage />} />
                  <Route
                    path="/log"
                    element={
                      <ProtectedRoute>
                        <ActivityLogPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="*" element={<NotFoundPage />} />
                </Routes>
              </Suspense>
            </ErrorBoundary>
          </DataProvider>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App

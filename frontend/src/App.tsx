import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AppLayout } from './components/AppLayout';
import { LoginPage } from './pages/LoginPage';
import { RegisterDentistPage } from './pages/RegisterDentistPage';
import { DashboardPage } from './pages/dentist/DashboardPage';
import { PatientsPage } from './pages/dentist/PatientsPage';
import { PatientDetailPage } from './pages/dentist/PatientDetailPage';
import { CalendarPage } from './pages/dentist/CalendarPage';
import { SettingsPage } from './pages/dentist/SettingsPage';
import { PatientDashboardPage } from './pages/patient/PatientDashboardPage';
import { PatientCalendarPage } from './pages/patient/PatientCalendarPage';
import { PatientPlansPage } from './pages/patient/PatientPlansPage';
import { PatientAvailabilityPage } from './pages/patient/PatientAvailabilityPage';

function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === 'DENTIST' ? '/dashboard' : '/portal'} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/registrar" element={<RegisterDentistPage />} />

          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute role="DENTIST">
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/patients"
              element={
                <ProtectedRoute role="DENTIST">
                  <PatientsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/patients/:id"
              element={
                <ProtectedRoute role="DENTIST">
                  <PatientDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/calendar"
              element={
                <ProtectedRoute role="DENTIST">
                  <CalendarPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute role="DENTIST">
                  <SettingsPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/portal"
              element={
                <ProtectedRoute role="PATIENT">
                  <PatientDashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/portal/calendar"
              element={
                <ProtectedRoute role="PATIENT">
                  <PatientCalendarPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/portal/plans"
              element={
                <ProtectedRoute role="PATIENT">
                  <PatientPlansPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/portal/availability"
              element={
                <ProtectedRoute role="PATIENT">
                  <PatientAvailabilityPage />
                </ProtectedRoute>
              }
            />
          </Route>

          <Route path="/" element={<RootRedirect />} />
          <Route path="*" element={<RootRedirect />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Dashboard } from './components';
import { LoginPage } from './components/LoginPage';
import { QuickAddTodo } from './components/QuickAddTodo';
import { useAuth } from './hooks/useAuth';
import './index.css';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoginPage />;
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/add"
          element={
            <ProtectedRoute>
              <QuickAddTodo />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

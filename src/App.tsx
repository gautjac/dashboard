import { Dashboard } from './components';
import { LoginPage } from './components/LoginPage';
import { useAuth } from './hooks/useAuth';
import './index.css';

function App() {
  const { isAuthenticated, isLoading } = useAuth();

  // Show loading state while checking auth
  if (isLoading) {
    return <LoginPage />;
  }

  // Show login page if not authenticated
  if (!isAuthenticated) {
    return <LoginPage />;
  }

  // Show dashboard if authenticated
  return <Dashboard />;
}

export default App;

import { AuthProvider } from './context/AuthProvider';
import { useAuth } from './hooks/useAuth';
import { AuthPage } from './pages/AuthPage';
import { Dashboard } from './pages/Dashboard';

function Gate() {
  const { user, isChecking } = useAuth();

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  return user ? <Dashboard /> : <AuthPage />;
}

function App() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  );
}

export default App;

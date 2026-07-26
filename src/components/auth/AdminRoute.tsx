import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSupabase } from '../../hooks/useSupabase';
import { LoadingSpinner } from '../ui/LoadingSpinner';

interface AdminRouteProps {
  children: React.ReactNode;
}

const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  const { user, isAdmin, loading, profileLoading, profileHydrated } = useSupabase();
  const location = useLocation();

  if (loading || profileLoading || !profileHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export { AdminRoute };
export default AdminRoute;
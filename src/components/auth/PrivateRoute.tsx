import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSupabase } from '../../hooks/useSupabase';

interface PrivateRouteProps {
  children: React.ReactNode;
  requireProfile?: boolean;
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ 
  children, 
  requireProfile = false 
}) => {
  const { user, isProfileComplete, loading, profileHydrated, profileLoading } = useSupabase();
  const location = useLocation();

  // Wait for initial auth hydration
  if (loading) {
    return <div className="p-6 text-grey-700">Chargement...</div>;
  }
  
  // If not authenticated, redirect to login
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If a profile is required, wait until we've attempted to hydrate it at least once.
  if (requireProfile && (!profileHydrated || profileLoading)) {
    return <div className="p-6 text-grey-700">Chargement...</div>;
  }
  
  // If profile is required but not available, redirect to complete profile
  if (requireProfile && !isProfileComplete) {
    return <Navigate to="/complete-profile" state={{ from: location }} replace />;
  }
  
  return <>{children}</>;
};

export { PrivateRoute };
export default PrivateRoute;
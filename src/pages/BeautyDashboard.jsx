import { useContext } from 'react';
import { AuthContext } from '../App';
import BeautyAdminDashboard from './BeautyDashboards/BeautyAdminDashboard';
import BeautyStaffDashboard from './BeautyDashboards/BeautyStaffDashboard';

function isTenantAdminUser(user) {
  if (!user) return false;
  return user.role === 'admin' || user.role === 'manager' || user.is_owner === 1;
}

export default function BeautyDashboard() {
  const { user } = useContext(AuthContext);
  const isAdmin = isTenantAdminUser(user);

  return isAdmin ? <BeautyAdminDashboard /> : <BeautyStaffDashboard />;
}

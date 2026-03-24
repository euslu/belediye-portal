import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login          from './pages/Login';
import Dashboard      from './pages/Dashboard';
import UserDashboard  from './pages/UserDashboard';
import Personel       from './pages/Personel';
import TicketList     from './pages/itsm/TicketList';
import TicketNew      from './pages/itsm/TicketNew';
import TicketDetail   from './pages/itsm/TicketDetail';
import Gruplar        from './pages/Gruplar';
import Profile        from './pages/Profile';
import MyTasks        from './pages/MyTasks';
import AdminCategories from './pages/admin/SubjectManager';
import AdminGroups     from './pages/admin/Groups';
import AdminSettings   from './pages/admin/Settings';
import AdChanges       from './pages/admin/AdChanges';
import Envanter           from './pages/admin/Envanter';
import PendingApprovals     from './pages/manager/PendingApprovals';
import ManagerDashboard     from './pages/manager/ManagerDashboard';
import NewManagerDashboard  from './pages/ManagerDashboard';
import MyTickets            from './pages/MyTickets';
import Departments          from './pages/admin/Departments';
import WorkOrders           from './pages/WorkOrders';
import UlakbellIncidents    from './pages/UlakbellIncidents';
import PDKSDashboard             from './pages/PDKSDashboard';
import DestekHizmetleriTicket   from './pages/DestekHizmetleriTicket';

// Giriş yapılmamışsa /login'e yönlendir
function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center text-sm text-gray-400">
      Yükleniyor...
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

// Role göre index sayfası
function IndexRoute() {
  const { user } = useAuth();
  if (!user) return null;
  if (['admin', 'manager'].includes(user.role)) return <NewManagerDashboard />;
  return <Navigate to="/home" replace />;
}

// Zaten giriş yapılmışsa ana sayfaya yönlendir
function LoginRoute() {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center text-sm text-gray-400">
      Yükleniyor...
    </div>
  );
  if (user) return <Navigate to="/" replace />;
  return <Login />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginRoute />} />
          <Route
            path="/"
            element={<RequireAuth><Dashboard /></RequireAuth>}
          >
            <Route index                  element={<IndexRoute />} />
            <Route path="itsm"            element={<TicketList />} />
            <Route path="itsm/new"        element={<TicketNew />} />
            <Route path="itsm/:id"        element={<TicketDetail />} />
            <Route path="personel"         element={<Personel />} />
            <Route path="gruplar"          element={<Gruplar />} />
            <Route path="admin/groups"     element={<AdminGroups />} />
            <Route path="profile"          element={<Profile />} />
            <Route path="my-tasks"         element={<MyTasks />} />
            <Route path="my-tickets"       element={<MyTickets />} />
            <Route path="admin/categories"  element={<AdminCategories />} />
            <Route path="admin/settings"    element={<AdminSettings />} />
            <Route path="admin/ad-changes"  element={<AdChanges />} />
            <Route path="admin/envanter"     element={<Envanter />} />
            <Route path="admin/departments" element={<Departments />} />
            <Route path="home"              element={<UserDashboard />} />
            <Route path="work-orders"           element={<WorkOrders />} />
            <Route path="ulakbell-incidents"    element={<UlakbellIncidents />} />
            <Route path="pdks"                  element={<PDKSDashboard />} />
            <Route path="tickets/new/destek"    element={<DestekHizmetleriTicket />} />
            <Route path="pending-approvals"  element={<PendingApprovals />} />
            <Route path="manager-dashboard" element={<ManagerDashboard />} />
            <Route path="*"               element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

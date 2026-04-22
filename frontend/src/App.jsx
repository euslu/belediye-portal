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
import UlakBellTalepleri    from './pages/UlakBellTalepleri';
import PDKSDashboard             from './pages/PDKSDashboard';
import DestekHizmetleriTicket   from './pages/DestekHizmetleriTicket';
import GenelSekreterDashboard   from './pages/GenelSekreterDashboard';
import FlexCityPage             from './pages/FlexCityPage';
import PersonelDashboard        from './pages/PersonelDashboard';
import GsmHat                  from './pages/arge/GsmHat';
import TutanakOlustur          from './pages/arge/TutanakOlustur';
import Gelistirme              from './pages/Gelistirme';
import IslemGecmisi            from './pages/IslemGecmisi';
import LisansYonetimi          from './pages/admin/LisansYonetimi';
import MenuYetkilendirme       from './pages/admin/MenuYetkilendirme';
import EnvanterCihazlar        from './pages/admin/EnvanterCihazlar';


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

// Genel Sekreter — sadece yetkili kullanıcılara
const GS_YETKILI = ['ethem.usluoglu', 'tayfun.yilmaz'];
function GenelSekreterRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  const yetkili = GS_YETKILI.includes(user.username);
  if (!yetkili) return <Navigate to="/" replace />;
  return children;
}

const SISTEM_ROL_SEVIYE = { admin:5, daire_baskani:4, mudur:3, sef:2, personel:1 };

// Role göre index sayfası
function IndexRoute() {
  const { user } = useAuth();
  if (!user) return null;
  const seviye = SISTEM_ROL_SEVIYE[user.sistemRol] || (user.role === 'admin' ? 5 : user.role === 'manager' ? 3 : 1);
  if (seviye >= 3) return <NewManagerDashboard />;
  return <PersonelDashboard />;
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
            <Route path="admin/envanter"          element={<Envanter />} />
            <Route path="admin/envanter/cihazlar" element={<EnvanterCihazlar />} />
            <Route path="admin/departments" element={<Departments />} />
            <Route path="home"              element={<PersonelDashboard />} />
            <Route path="work-orders"           element={<WorkOrders />} />
            <Route path="ulakbell-incidents"    element={<UlakBellTalepleri />} />
            <Route path="pdks"                  element={<PDKSDashboard />} />
            <Route path="tickets/new/destek"    element={<DestekHizmetleriTicket />} />
            <Route path="pending-approvals"  element={<PendingApprovals />} />
            <Route path="manager-dashboard" element={<ManagerDashboard />} />
            <Route path="flexcity"        element={<FlexCityPage />} />
            <Route path="arge/gsm-hat"   element={<GsmHat />} />
            <Route path="arge/tutanak"   element={<TutanakOlustur />} />
            <Route path="gelistirme"     element={<Gelistirme />} />
            <Route path="islem-gecmisi"  element={<IslemGecmisi />} />
            <Route path="admin/lisans-yonetimi" element={<LisansYonetimi />} />
            <Route path="admin/menu-yetkilendirme" element={<MenuYetkilendirme />} />

            <Route path="genel-sekreter" element={
              <GenelSekreterRoute><GenelSekreterDashboard /></GenelSekreterRoute>
            } />
            <Route path="*"               element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

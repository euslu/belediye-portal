import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { getToken } from './lib/muhtarlik_api';
import Layout           from './components/Layout';
import Login            from './pages/Login';
import Dashboard        from './pages/Dashboard';
import BasvurularPage   from './pages/BasvurularPage';
import MahalleDetay     from './pages/MahalleDetay';
import MuhtarlarPage    from './pages/MuhtarlarPage';
import RaporlarPage     from './pages/RaporlarPage';
import MuhtarlikAyarlar from './pages/MuhtarlikAyarlar';
import YeniBasvuru      from './pages/YeniBasvuru';
import YeniYatirim      from './pages/YeniYatirim';
import YatirimlarPage   from './pages/YatirimlarPage';

function RequireAuth({ children }) {
  return getToken() ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter basename="/muhtarliksis">
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={<RequireAuth><Layout /></RequireAuth>}
        >
          <Route index                          element={<Dashboard />} />
          <Route path="muhtarlar"               element={<MuhtarlarPage />} />
          <Route path="basvurular"              element={<BasvurularPage />} />
          <Route path="yeni-basvuru"            element={<YeniBasvuru />} />
          <Route path="yatirimlar"              element={<YatirimlarPage />} />
          <Route path="yeni-yatirim"            element={<YeniYatirim />} />
          <Route path="mahalle/:ilce/:mahalle"  element={<MahalleDetay />} />
          <Route path="raporlar"                element={<RaporlarPage />} />
          <Route path="ayarlar"                 element={<MuhtarlikAyarlar />} />
          <Route path="*"                       element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

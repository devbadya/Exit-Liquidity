import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Markets } from './pages/Markets';
import { Coins } from './pages/Coins';
import { CoinDetail } from './pages/CoinDetail';
import { News } from './pages/News';
import { NewsDetail } from './pages/NewsDetail';
import { FearGreed } from './pages/FearGreed';
import { Paper } from './pages/Paper';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/"              element={<Dashboard />} />
          <Route path="/markets"       element={<Markets />} />
          <Route path="/coins"         element={<Coins />} />
          <Route path="/coin/:slug"    element={<CoinDetail />} />
          <Route path="/news"          element={<News />} />
          <Route path="/news/:id"      element={<NewsDetail />} />
          <Route path="/fear-greed"    element={<FearGreed />} />
          <Route path="/paper"         element={<Paper />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

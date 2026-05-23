import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { News } from './pages/News';
import { NewsDetail } from './pages/NewsDetail';
import { FearGreed } from './pages/FearGreed';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/news" element={<News />} />
          <Route path="/news/:id" element={<NewsDetail />} />
          <Route path="/fear-greed" element={<FearGreed />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

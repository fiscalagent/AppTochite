import { createBrowserRouter } from 'react-router-dom'
import Layout from './components/Layout/Layout'
import ClientList from './screens/Clients/ClientList'
import ClientCard from './screens/Clients/ClientCard'
import ClientForm from './screens/Clients/ClientForm'
import HistoryFeed from './screens/History/HistoryFeed'
import SharpeningForm from './screens/Sharpening/SharpeningForm'
import SharpeningDetail from './screens/Sharpening/SharpeningDetail'
import ReferenceScreen from './screens/Reference/ReferenceScreen'
import BackupScreen from './screens/Backup/BackupScreen'
import OAuthCallback from './screens/Backup/OAuthCallback'
import AboutScreen from './screens/About/AboutScreen'
import TrashScreen from './screens/Trash/TrashScreen'
import GamesHub from './screens/Games/GamesHub'
import ProgressionGame from './screens/Games/ProgressionGame'
import AngleGame from './screens/Games/AngleGame'

export const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/',                        element: <ClientList /> },
      { path: '/clients/new',             element: <ClientForm /> },
      { path: '/clients/:id',             element: <ClientCard /> },
      { path: '/clients/:id/edit',        element: <ClientForm /> },
      { path: '/history',                 element: <HistoryFeed /> },
      { path: '/sharpenings/new',         element: <SharpeningForm /> },
      { path: '/sharpenings/:id',         element: <SharpeningDetail /> },
      { path: '/sharpenings/:id/edit',    element: <SharpeningForm /> },
      { path: '/reference/:tab',          element: <ReferenceScreen /> },
      { path: '/backup',                  element: <BackupScreen /> },
      { path: '/oauth/yandex/callback',   element: <OAuthCallback /> },
      { path: '/about',                   element: <AboutScreen /> },
      { path: '/trash',                   element: <TrashScreen /> },
      { path: '/games',                   element: <GamesHub /> },
      { path: '/games/progression',       element: <ProgressionGame /> },
      { path: '/games/angle',             element: <AngleGame /> },
    ],
  },
// PWA живёт на GitHub Pages под /AppTochite/, APK (cap-сборка) — на https://localhost/.
// Без правильного basename роутер в APK не матчит '/' и не рендерит ничего (тёмный экран).
], { basename: import.meta.env.MODE === 'capacitor' ? '/' : '/AppTochite' })

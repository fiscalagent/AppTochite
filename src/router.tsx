import { createBrowserRouter } from 'react-router-dom'
import Layout from './components/Layout/Layout'
import ClientList from './screens/Clients/ClientList'
import ClientCard from './screens/Clients/ClientCard'
import ClientForm from './screens/Clients/ClientForm'
import HistoryFeed from './screens/History/HistoryFeed'
import SharpeningForm from './screens/Sharpening/SharpeningForm'
import SharpeningDetail from './screens/Sharpening/SharpeningDetail'
import ReferenceScreen from './screens/Reference/ReferenceScreen'

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
    ],
  },
])

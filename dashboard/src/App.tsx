import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Layout from './layouts/Layout'
import Dashboard from './pages/Dashboard'
import Metrics from './pages/Metrics'
import Endpoints from './pages/Endpoints'

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/metrics" element={<Metrics />} />
          <Route path="/endpoints" element={<Endpoints />} />
        </Routes>
      </Layout>
    </Router>
  )
}

export default App


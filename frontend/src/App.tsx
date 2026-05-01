import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { Toaster } from 'react-hot-toast'

import { Layout } from './components/layout/Layout'
import { Login } from './components/pages/Login'
import { Dashboard } from './components/pages/Dashboard'
import { DataIngestion } from './components/pages/DataIngestion'
import { Segmentation } from './components/pages/Segmentation'
import { StageClassification } from './components/pages/StageClassification'
import { SICRAssessment } from './components/pages/SICRAssessment'
import { ECLCalc } from './components/pages/ECLCalc'
import { MacroScenarios } from './components/pages/MacroScenarios'
import { ProvisionGL } from './components/pages/ProvisionGL'
import { ManagementOverlays } from './components/pages/ManagementOverlays'
import { Reports } from './components/pages/Reports'
import { ModelGovernance } from './components/pages/ModelGovernance'
import { AuditTrail } from './components/pages/AuditTrail'
import { UserManagement } from './components/pages/admin/UserManagement'
import { RoleManagement } from './components/pages/admin/RoleManagement'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<Layout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/data-ingestion" element={<DataIngestion />} />
            <Route path="/segmentation" element={<Segmentation />} />
            <Route path="/staging" element={<StageClassification />} />
            <Route path="/sicr" element={<SICRAssessment />} />
            <Route path="/ecl-calc" element={<ECLCalc />} />
            <Route path="/macro-scenarios" element={<MacroScenarios />} />
            <Route path="/provision" element={<ProvisionGL />} />
            <Route path="/overlays" element={<ManagementOverlays />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/governance" element={<ModelGovernance />} />
            <Route path="/audit" element={<AuditTrail />} />
            <Route path="/admin/users" element={<UserManagement />} />
            <Route path="/admin/roles" element={<RoleManagement />} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: { fontSize: '13px' },
        }}
      />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}

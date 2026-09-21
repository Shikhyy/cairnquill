import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './Layout'
import QueuePage from '../features/queue/QueuePage'
import CasePage from '../features/case/CasePage'
import DraftPage from '../features/draft/DraftPage'
import ReviewPage from '../features/filing/ReviewPage'
import FilingPage from '../features/filing/FilingPage'
import EvalPage from '../features/eval/EvalPage'
import AskPage from '../features/ask/AskPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/queue" replace />} />
          <Route path="queue" element={<QueuePage />} />
          <Route path="cases/:caseId" element={<CasePage />} />
          <Route path="cases/:caseId/draft" element={<DraftPage />} />
          <Route path="cases/:caseId/review" element={<ReviewPage />} />
          <Route path="filings" element={<FilingPage />} />
          <Route path="eval" element={<EvalPage />} />
          <Route path="ask" element={<AskPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

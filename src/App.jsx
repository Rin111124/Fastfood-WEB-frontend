import { BrowserRouter } from 'react-router-dom'
import { AppRoutes } from './routes'
import './App.css'
import ChatWidget from './components/common/ChatWidget'

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
      <ChatWidget />
    </BrowserRouter>
  )
}

export default App

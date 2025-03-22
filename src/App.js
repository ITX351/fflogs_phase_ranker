import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import './styles/global.css';
import InputPage from './components/InputPage';
import ResultPage from './components/ResultPage';
import Footer from './components/Footer';

function App() {
  return (
    <Router basename="/fflogs_phase_ranker">
      <div className="App">
        <Routes>
          <Route path="/" element={<InputPage />} />
          <Route path="/:logsId" element={<ResultPage />} />
          <Route path="/:logsId/:fightId" element={<ResultPage />} />
        </Routes>
        <Footer />
      </div>
    </Router>
  );
}

export default App;

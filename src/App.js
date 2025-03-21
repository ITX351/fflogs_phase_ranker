import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import InputPage from './components/InputPage';
import ResultPage from './components/ResultPage';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<InputPage />} />
          <Route path="/:logsId" element={<ResultPage />} />
          <Route path="/:logsId/:fightId" element={<ResultPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;

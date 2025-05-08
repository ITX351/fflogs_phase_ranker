import React, { useEffect, useState } from 'react';
import { getLogColor } from '../utils/helpers';
import jobNameMapping from '../utils/jobNameMapping';

function DatasetPage() {
  const [config, setConfig] = useState([]);
  const [raidNames, setRaidNames] = useState([]);
  const [selectedRaid, setSelectedRaid] = useState('');
  const [phases, setPhases] = useState([]);
  const [selectedPhase, setSelectedPhase] = useState('');
  const [datasets, setDatasets] = useState([]);
  const [selectedDataset, setSelectedDataset] = useState(null);
  const [csvData, setCsvData] = useState([]);
  const [csvHeader, setCsvHeader] = useState([]);

  // 加载 config.json
  useEffect(() => {
    fetch('/fflogs_phase_ranker/data/config.json')
      .then(res => res.json())
      .then(data => {
        setConfig(data);
        // 提取所有唯一raidMatchNames
        const raids = Array.from(new Set(data.flatMap(item => item.raidMatchNames)));
        setRaidNames(raids);
        if (raids.length > 0) setSelectedRaid(raids[0]);
      });
  }, []);

  // 根据选中的raid，提取所有phase
  useEffect(() => {
    if (!selectedRaid) return;
    const filtered = config.filter(item => item.raidMatchNames.includes(selectedRaid));
    const phaseNums = Array.from(new Set(filtered.map(item => item.raidLogsPhase))).sort((a, b) => a - b);
    setPhases(phaseNums);
    if (phaseNums.length > 0) setSelectedPhase(phaseNums[0]);
  }, [selectedRaid, config]);

  // 根据raid和phase筛选数据集
  useEffect(() => {
    if (!selectedRaid || !selectedPhase) return;
    const filtered = config.filter(
      item => item.raidMatchNames.includes(selectedRaid) && item.raidLogsPhase === selectedPhase
    );
    setDatasets(filtered);
    setSelectedDataset(filtered.length > 0 ? filtered[0] : null);
  }, [selectedRaid, selectedPhase, config]);

  // 加载csv数据
  useEffect(() => {
    if (!selectedDataset) {
      setCsvData([]);
      setCsvHeader([]);
      return;
    }
    fetch(`/fflogs_phase_ranker/data/${selectedDataset.dataFileName}`)
      .then(res => res.text())
      .then(text => {
        const lines = text.trim().split('\n');
        if (lines.length === 0) return;
        const header = lines[0].split(',');
        const rows = lines.slice(1).map(line => line.split(','));
        setCsvHeader(header);
        setCsvData(rows);
      });
  }, [selectedDataset]);

  return (
    <div className="d-flex" style={{ minHeight: '80vh' }}>
      {/* 侧边栏 */}
      <div style={{ width: 260, borderRight: '1px solid #ddd', background: '#f8f9fa' }}>
        <div className="p-3 border-bottom">
          <label className="form-label">副本：</label>
          <select className="form-select mb-2"
            value={selectedRaid}
            onChange={e => setSelectedRaid(e.target.value)}
          >
            {raidNames.map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
          <label className="form-label">分P：</label>
          <select className="form-select"
            value={selectedPhase}
            onChange={e => setSelectedPhase(Number(e.target.value))}
          >
            {phases.map(phase => (
              <option key={phase} value={phase}>P{phase}</option>
            ))}
          </select>
        </div>
        <div className="p-2">
          <div className="fw-bold mb-2">数据集列表</div>
          {datasets.map(ds => (
            <div
              key={ds.datasetName}
              className={`p-2 mb-1 rounded ${selectedDataset && ds.datasetName === selectedDataset.datasetName ? 'bg-info text-white' : 'bg-light'}`}
              style={{ cursor: 'pointer' }}
              onClick={() => setSelectedDataset(ds)}
            >
              {ds.datasetName} <span className="text-muted" style={{ fontSize: '0.9em' }}>({ds.creationDate})</span>
            </div>
          ))}
        </div>
      </div>
      {/* 主体内容 */}
      <div className="flex-grow-1 p-4">
        {selectedDataset ? (
          <>
            <h4>
              {selectedDataset.datasetName}
              <span className="text-muted ms-3" style={{ fontSize: '1rem' }}>{selectedDataset.creationDate}</span>
            </h4>
            <div className="table-responsive mt-3">
              {csvHeader.length > 0 ? (
                <table className="table table-striped table-bordered align-middle" style={{ fontFamily: 'Consolas' }}>
                  <thead className="table-dark">
                    <tr>
                      {csvHeader.map((col, idx) => {
                        // 题头为数字的列用颜色
                        const num = Number(col);
                        const isNum = !isNaN(num);
                        return (
                          <th
                            key={idx}
                            style={isNum ? { color: getLogColor(num) } : undefined}
                          >
                            {idx === 0 && col === 'Key' ? 'Rdps' : col}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {csvData.map((row, i) => (
                      <tr key={i}>
                        {row.map((cell, j) => {
                          // 第一列为职业英文名，转中文
                          if (j === 0) {
                            return (
                              <td key={j}>
                                {jobNameMapping[cell] || cell}
                              </td>
                            );
                          }
                          return <td key={j}>{cell}</td>;
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div>无数据</div>
              )}
            </div>
          </>
        ) : (
          <div>请选择数据集</div>
        )}
      </div>
    </div>
  );
}

export default DatasetPage;

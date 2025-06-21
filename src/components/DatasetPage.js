import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getLogColor } from '../utils/helpers';
import jobNameMapping from '../utils/jobNameMapping';
import { loadConfig } from '../api/dataProcessor';

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
  const [sortCol, setSortCol] = useState(null);
  const [sidebarWidth, setSidebarWidth] = useState(260); // 默认宽度
  const resizerRef = useRef(null);

  const navigate = useNavigate();

  // 拖拽相关事件
  const handleMouseDown = (e) => {
    e.preventDefault();
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = (e) => {
    const newWidth = Math.min(600, Math.max(150, e.clientX)); // 限制宽度
    setSidebarWidth(newWidth);
  };

  const handleMouseUp = () => {
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  // 加载 config.json（改为调用loadConfig）
  useEffect(() => {
    loadConfig().then(data => {
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
    ).sort((a, b) => new Date(b.creationDate) - new Date(a.creationDate));
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
        // 默认按75分段降序排序
        const idx75 = header.indexOf('75');
        setSortCol(idx75 > 0 ? idx75 : null);
      });
  }, [selectedDataset]);

  // 处理排序
  const getSortedData = () => {
    if (sortCol == null || csvData.length === 0) return csvData;
    // 只对数值列排序
    if (sortCol === 0) return csvData; // 第一列为职业名，不排序
    return [...csvData].sort((a, b) => {
      const va = Number(a[sortCol]) || 0;
      const vb = Number(b[sortCol]) || 0;
      return vb - va; // 降序
    });
  };

  return (
    <div className="d-flex" style={{ minHeight: '80vh' }}>
      {/* 侧边栏 */}
      <div
        style={{
          width: sidebarWidth,
          borderRight: '1px solid #ddd',
          background: '#f8f9fa',
          position: 'relative',
          overflowY: 'auto'
        }}
      >
        {/* 返回按钮，绝对定位在侧边栏左上角 */}
        <button
          className="btn btn-link text-decoration-none"
          onClick={() => navigate('/')}
          style={{
            fontSize: '1.5rem',
            position: 'absolute',
            left: 0,
            top: 0,
            zIndex: 10,
            padding: '0.5rem 0.75rem'
          }}
          title="返回主页"
        >
          ⬅
        </button>
        {/* 用一个空div占位，把内容整体往下推 */}
        <div style={{ height: '2.5rem' }}></div>
        <div className="p-3 border-bottom" style={{ paddingLeft: '2.5rem' }}>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              marginBottom: '0.5rem',
              justifyContent: 'flex-end'
            }}
          >
            <label className="form-label mb-0" style={{ minWidth: 40, marginRight: '0.5rem' }}>副本：</label>
            <select
              className="form-select mb-0"
              style={{
                width: 160,
                minWidth: 0,
                maxWidth: '100%',
                marginLeft: 'auto'
              }}
              value={selectedRaid}
              onChange={e => setSelectedRaid(e.target.value)}
            >
              {raidNames.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'flex-end'
            }}
          >
            <label className="form-label mb-0" style={{ minWidth: 40, marginRight: '0.5rem' }}>分P：</label>
            <select
              className="form-select mb-0"
              style={{
                width: 160,
                minWidth: 0,
                maxWidth: '100%',
                marginLeft: 'auto'
              }}
              value={selectedPhase}
              onChange={e => setSelectedPhase(Number(e.target.value))}
            >
              {phases.map(phase => (
                <option key={phase} value={phase}>P{phase}</option>
              ))}
            </select>
          </div>
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
      {/* 拖拽条 */}
      <div
        ref={resizerRef}
        style={{
          width: '5px',
          cursor: 'col-resize',
          backgroundColor: '#ddd',
        }}
        onMouseDown={handleMouseDown}
      ></div>
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
                            style={isNum ? { color: getLogColor(num), cursor: 'pointer' } : { cursor: 'default' }}
                            onClick={() => {
                              if (isNum) setSortCol(idx);
                            }}
                          >
                            {idx === 0 && col === 'Key' ? 'Rdps' : col}
                            {isNum && sortCol === idx && (
                              <span style={{ marginLeft: 4 }}>▼</span>
                            )}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {getSortedData().map((row, i) => (
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

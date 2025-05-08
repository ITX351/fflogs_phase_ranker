import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchLogData, fetchDamageDoneData } from '../api/fflogsApi';
import { getConfigItemsByRaid, updateDamageData } from '../api/dataProcessor';
import { getLogColor } from '../utils/helpers';

function ResultPage() {
  const { apiKey, logsId, fightId } = useParams(); // 从路由参数中获取 apiKey
  const navigate = useNavigate();
  const [logData, setLogData] = useState(null);
  const [selectedFightId, setSelectedFightId] = useState(fightId || null);
  const [phaseData, setPhaseData] = useState({});
  const [phaseConfigItems, setPhaseConfigItems] = useState({}); // { phaseName: [configItem, ...] }
  const [phaseSelectedDataset, setPhaseSelectedDataset] = useState({}); // { phaseName: configItem }
  const [loading, setLoading] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(250);
  const resizerRef = useRef(null);
  const [error, setError] = useState(null); // 新增状态用于存储错误信息
  const [rawDamageData, setRawDamageData] = useState({}); // 新增：用于存储所有分P的原始damageData

  useEffect(() => {
    async function loadLogData() {
      if (!logsId) return;
      try {
        const logData = await fetchLogData(logsId, apiKey);
        setLogData(logData);

        if (fightId === "last" && logData.fights.length > 0) {
          const lastFightId = logData.fights[logData.fights.length - 1].id.toString();
          setSelectedFightId(lastFightId);
          navigate(`/${apiKey}/${logsId}/${lastFightId}`);
        }
      } catch (error) {
        if (error instanceof Error) {
          console.error('Error fetching log data:', error);
          setError(
            <>
              无法获取日志数据，请检查日志ID和API_KEY是否正确。
              <br />
              {error.message}
            </>
          );
        } else {
          setError('发生未知错误');
        }
      }
    }
    loadLogData();
  }, [logsId, fightId, apiKey, navigate]);

  useEffect(() => {
    async function loadDamageData() {
      if (!selectedFightId || !logData) return;
      const fight = logData.fights.find(f => f.id === parseInt(selectedFightId));
      if (!fight) return;
      if (loading) return;

      setLoading(true);
      const phaseData = {};
      const phaseConfigItemsObj = {};
      const phaseSelectedDatasetObj = {};
      const phaseRawDamageData = {}; // 新增：存储每个分P的原始damageData

      for (const phase of fight.phases) {
        const configItems = await getConfigItemsByRaid(fight.name, phase.id); // 异步调用 getConfigItemsByRaid
        phaseConfigItemsObj[phase.name] = configItems;
        if (configItems.length > 0) {
          phaseSelectedDatasetObj[phase.name] = configItems[0]; // 默认选最新
          const damageData = await fetchDamageDoneData(logsId, apiKey, phase.startTime, phase.endTime);
          if (damageData) {
            phaseRawDamageData[phase.name] = damageData; // 存储原始数据
            const effectiveDuration = await updateDamageData(damageData, configItems[0]);
            phaseData[phase.name] = { damageData, effectiveDuration: effectiveDuration / 1000 };
          }
        }
        console.log(`Phase ${phase.name} loaded`);
      }
      setPhaseConfigItems(phaseConfigItemsObj);
      setPhaseSelectedDataset(phaseSelectedDatasetObj);
      setPhaseData(phaseData);
      setRawDamageData(phaseRawDamageData); // 新增：存储所有分P的原始damageData
      setLoading(false);
    }
    loadDamageData();
  }, [selectedFightId, logData, logsId, apiKey]);

  // 切换数据集时，使用已存储的原始damageData
  const handleDatasetChange = async (phaseName, configItem) => {
    if (!selectedFightId || !logData) return;
    if (!rawDamageData[phaseName]) return;
    const damageData = JSON.parse(JSON.stringify(rawDamageData[phaseName])); // 深拷贝，避免污染原始数据
    let effectiveDuration;
    if (damageData) {
      effectiveDuration = await updateDamageData(damageData, configItem);
    }
    setPhaseSelectedDataset(prev => ({
      ...prev,
      [phaseName]: configItem
    }));
    setPhaseData(prev => ({
      ...prev,
      [phaseName]: damageData
        ? { damageData, effectiveDuration: effectiveDuration / 1000 }
        : prev[phaseName]
    }));
  };

  const handleFightClick = (id) => {
    setSelectedFightId(id.toString());
    navigate(`/${apiKey}/${logsId}/${id}`);
  };

  const handleMouseDown = (e) => {
    e.preventDefault();
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = (e) => {
    const newWidth = Math.min(600, Math.max(150, e.clientX)); // 最小宽度为 150px，最大宽度为 400px
    setSidebarWidth(newWidth);
  };

  const handleMouseUp = () => {
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  return (
    <div className="d-flex">
      <div
        className="sidebar"
        style={{
          width: `${sidebarWidth}px`,
          overflowY: 'auto',
          borderRight: '1px solid #ddd',
        }}
      >
        <div className="d-flex align-items-center p-3">
          <button
            className="btn btn-link text-decoration-none"
            onClick={() => navigate(`/${apiKey}`)} // 使用路由参数返回主页
            style={{ fontSize: '1.5rem' }}
            title="返回主页"
          >
            ⬅
          </button>
          <h4 className="ms-2 mb-0">战斗列表</h4>
        </div>
        {logData ? (
          logData.fights.map(fight => {
            const duration = fight.end_time && fight.start_time
              ? Math.floor((fight.end_time - fight.start_time) / 1000) // 转换为秒
              : 0;
            const minutes = Math.floor(duration / 60);
            const seconds = duration % 60;
            const formattedDuration = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            const textColor = fight.kill ? 'text-success' : 'text-danger';

            return (
              <div
                key={fight.id}
                className="p-2"
                style={{
                  cursor: 'pointer',
                  backgroundColor: selectedFightId === fight.id.toString() ? '#b3e5fc' : 'transparent', // 蓝色底色
                  fontWeight: selectedFightId === fight.id.toString() ? 'bold' : 'normal', // 加粗字体
                  boxShadow: selectedFightId === fight.id.toString() ? '0px 4px 6px rgba(0, 0, 0, 0.1)' : 'none', // 浮雕效果
                  borderRadius: selectedFightId === fight.id.toString() ? '4px' : '0', // 圆角
                }}
                onClick={() => handleFightClick(fight.id)}
              >
                <span className={textColor}>
                  {fight.name} ({fight.id}) {formattedDuration}
                </span>
              </div>
            );
          })
        ) : (
          <p className="p-3">加载中...</p>
        )}
      </div>
      <div
        ref={resizerRef}
        style={{
          width: '5px',
          cursor: 'col-resize',
          backgroundColor: '#ddd',
        }}
        onMouseDown={handleMouseDown}
      ></div>
      <div className="flex-grow-1 p-3" style={{ marginBottom: '30px' }}> {/* 使用 marginBottom 确保内容不会被页脚遮挡 */}
        {error ? ( // 如果存在错误信息，显示错误提示
          <p className="text-danger">{error}</p>
        ) : selectedFightId ? (
          loading || !logData ? (
            <p>加载战斗数据中...</p>
          ) : (
            Object.keys(phaseData).length > 0 ? (
              Object.entries(phaseData).map(([phaseName, { damageData, effectiveDuration }]) => (
                <div key={phaseName} className="mb-4">
                  {/* 数据集选择下拉框 */}
                  {phaseConfigItems[phaseName] && phaseConfigItems[phaseName].length > 0 && (
                    <div className="mb-2">
                      <label className="form-label me-2">数据集：</label>
                      <select
                        className="form-select d-inline-block"
                        style={{ width: 320, maxWidth: '100%', display: 'inline-block' }}
                        value={
                          phaseSelectedDataset[phaseName]
                            ? phaseSelectedDataset[phaseName].datasetName
                            : phaseConfigItems[phaseName][0].datasetName
                        }
                        disabled={phaseConfigItems[phaseName].length === 1}
                        onChange={e => {
                          const selected = phaseConfigItems[phaseName].find(
                            item => item.datasetName === e.target.value
                          );
                          if (selected) handleDatasetChange(phaseName, selected);
                        }}
                      >
                        {phaseConfigItems[phaseName].map(item => (
                          <option key={item.datasetName} value={item.datasetName}>
                            {item.datasetName} ({item.creationDate})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <h5>
                    {phaseName}
                    {effectiveDuration > 0 && (
                      <span
                        className="text-muted ms-4"
                        style={{ fontSize: '0.9rem' }}
                      >
                        {effectiveDuration.toFixed(2)}秒
                      </span>
                    )}
                  </h5>
                  {damageData && damageData.players && damageData.players.length > 0 ? (
                    <table className="table table-striped" style={{ fontFamily: 'Consolas' }}>
                      <thead style={{ fontWeight: 'bold' }}>
                        <tr>
                          <th>玩家</th>
                          <th>职业</th>
                          <th>LOGS</th>
                          <th>RDPS</th>
                          <th>ADPS</th>
                          <th>NDPS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {damageData.players.map(player => (
                          <tr key={player.id}>
                            <td>{player.name}</td>
                            <td>{player.jobNameCN}</td>
                            <td style={{ color: getLogColor(player.predictLogs) }}>
                              {player.predictLogs === undefined
                                ? '--'
                                : player.predictLogs < 0
                                ? '0-'
                                : player.predictLogs > 100
                                ? '100+'
                                : player.predictLogs.toFixed(0)}
                            </td>
                            <td>{player.totalRDPS.toFixed(2)}</td>
                            <td>{player.totalADPS.toFixed(2)}</td>
                            <td>{player.totalNDPS.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p>该阶段无玩家数据。</p>
                  )}
                </div>
              ))
            ) : (
              <p>该战斗无分P数据。</p>
            )
          )
        ) : (
          <p>请选择一场战斗以查看详细信息。</p>
        )}
      </div>
    </div>
  );
}

export default ResultPage;

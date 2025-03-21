import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchLogData, fetchDamageDoneData } from '../api/fflogsApi';

function ResultPage() {
  const { logsId, fightId } = useParams();
  const navigate = useNavigate();
  const [logData, setLogData] = useState(null);
  const [selectedFightId, setSelectedFightId] = useState(fightId || null);
  const [damageData, setDamageData] = useState({});
  const [loading, setLoading] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(250);
  const resizerRef = useRef(null);

  useEffect(() => {
    async function loadLogData() {
      if (!logsId) return;
      const data = await fetchLogData(logsId, '');
      setLogData(data);
    }
    loadLogData();
  }, [logsId]);

  useEffect(() => {
    async function loadDamageData() {
      if (!selectedFightId || !logData) return;
      const fight = logData.fights.find(f => f.id === parseInt(selectedFightId));
      if (!fight) return;

      setLoading(true);
      const phaseData = {};
      for (const phase of fight.phases) {
        const data = await fetchDamageDoneData(logsId, '', phase.startTime, phase.endTime);
        phaseData[phase.name] = data;
      }
      setDamageData(phaseData);
      setLoading(false);
    }
    loadDamageData();
  }, [selectedFightId, logData, logsId]);

  const handleFightClick = (id) => {
    setSelectedFightId(id.toString());
    navigate(`/${logsId}/${id}`);
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
            onClick={() => navigate('/')}
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
      <div className="flex-grow-1 p-3" style={{ marginBottom: '100px' }}> {/* 使用 marginBottom 确保内容不会被页脚遮挡 */}
        {selectedFightId ? (
          loading ? (
            <p>加载战斗数据中...</p>
          ) : (
            Object.keys(damageData).length > 0 ? (
              Object.entries(damageData).map(([phaseName, data]) => (
                <div key={phaseName} className="mb-4">
                  <h5>{phaseName}</h5>
                  {data && data.players && data.players.length > 0 ? (
                    <table className="table table-striped">
                      <thead>
                        <tr>
                          <th>玩家</th>
                          <th>职业</th>
                          <th>RDPS</th>
                          <th>ADPS</th>
                          <th>NDPS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.players.map(player => (
                          <tr key={player.id}>
                            <td>{player.name}</td>
                            <td>{player.type}</td>
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

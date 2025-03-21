import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { fetchLogData, fetchDamageDoneData } from '../api/fflogsApi';

function ResultPage() {
  const { logsId, fightId } = useParams();
  const [searchParams] = useSearchParams();
  const apiKey = searchParams.get('apiKey');
  const [logData, setLogData] = useState(null);
  const [damageData, setDamageData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const logData = await fetchLogData(logsId, apiKey);
        if (!logData) {
          setError('无法获取日志数据');
          return;
        }
        setLogData(logData);

        if (fightId) {
          const fight = logData.fights.find((f) => f.id === parseInt(fightId));
          if (!fight) {
            setError('指定的战斗不存在');
            return;
          }

          const phaseData = [];
          for (const phase of fight.phases) {
            const damage = await fetchDamageDoneData(logsId, apiKey, phase.startTime, phase.endTime);
            if (damage) {
              phaseData.push({ phaseName: phase.name, damage });
            }
          }
          setDamageData(phaseData);
        }
      } catch (err) {
        setError(err.message || '数据加载失败');
        console.error(err);
      }
    }

    fetchData();
  }, [logsId, fightId, apiKey]);

  if (error) {
    return <div className="text-center text-danger">{error}</div>;
  }

  return (
    <div className="container mt-5">
      <h1 className="text-center">结果页面</h1>
      <p className="text-center">日志 ID: {logsId}</p>
      {fightId && <p className="text-center">战斗 ID: {fightId}</p>}
      {logData && (
        <div>
          <h2>战斗列表</h2>
          <ul>
            {logData.fights.map((fight) => (
              <li key={fight.id}>
                {fight.name} (ID: {fight.id})
              </li>
            ))}
          </ul>
        </div>
      )}
      {damageData && (
        <div>
          <h2>伤害数据</h2>
          {damageData.map((phase, index) => (
            <div key={index}>
              <h3>{phase.phaseName}</h3>
              <table className="table table-bordered">
                <thead>
                  <tr>
                    <th>玩家</th>
                    <th>总RDPS</th>
                    <th>总ADPS</th>
                    <th>总NDPS</th>
                  </tr>
                </thead>
                <tbody>
                  {phase.damage.players.map((player) => (
                    <tr key={player.id}>
                      <td>{player.name}</td>
                      <td>{player.totalRDPS.toFixed(2)}</td>
                      <td>{player.totalADPS.toFixed(2)}</td>
                      <td>{player.totalNDPS.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ResultPage;

import axios from 'axios';
import apiConfig from './apiConfig';

interface Phase {
  startTime: number;
  endTime: number;
  name: string;
}

interface Friendly {
  id: number;
  name: string;
  server: string;
  type: string;
  fights: { id: number }[];
}

interface Fight {
  id: number;
  name: string;
  phases: Phase[];
  friendlies: Friendly[];
}

interface LogData {
  title: string;
  fights: Fight[];
  friendlies: Friendly[];
}

interface PlayerDamageData {
  name: string;
  type: string;
  id: number;
  activeTime: number;
  activeTimeReduced: number;
  totalRD: number;
  totalAD: number;
  totalND: number;
  totalRDPS: number;
  totalADPS: number;
  totalNDPS: number;
}

interface DamageDoneData {
  players: PlayerDamageData[];
  totalTime: number;
  downtime: number;
  combatTime: number;
}

async function fetchLogData(logsId: string, apiKey: string): Promise<LogData | null> {
  if (!apiKey) {
    apiKey = apiConfig.apiKey;
  }

  if (!logsId || !apiKey) {
    throw new Error('缺少 logsId 或 apiKey');
  }

  const fightsUrl = `https://cn.fflogs.com/v1/report/fights/${logsId}?api_key=${apiKey}`;
  console.log('Fetching log data from:', fightsUrl);

  try {
    const response = await axios.get(fightsUrl);
    const data = response.data;

    const title = data.title;

    const friendlies: Friendly[] = data.friendlies.map((friendly: any) => ({
      id: friendly.id,
      name: friendly.name,
      server: friendly.server,
      type: friendly.type,
      fights: friendly.fights,
    }));

    const fights: Fight[] = data.fights.map((fight: any) => ({
      id: fight.id,
      name: fight.name || `Fight ${fight.id}`,
      phases: fight.phases
        ? fight.phases.map((phase: any, index: number) => ({
            startTime: phase.startTime,
            endTime: index < fight.phases.length - 1 
              ? fight.phases[index + 1].startTime 
              : fight.end_time, // 计算结束时间
            name: `Phase ${index + 1}`,
          }))
        : [],
      friendlies: friendlies.filter((friendly) =>
        friendly.fights.some((f: { id: number }) => f.id === fight.id)
      ),
    }));

    return { title, fights, friendlies };
  } catch (error) {
    console.error('Error fetching log data:', error);
    return null;
  }
}

async function fetchDamageDoneData(logsId: string, apiKey: string, start: number, end: number): Promise<DamageDoneData | null> {
  if (!apiKey) {
    apiKey = apiConfig.apiKey;
  }

  if (!logsId || !apiKey) {
    throw new Error('缺少 logsId 或 apiKey');
  }

  const url = `https://cn.fflogs.com/v1/report/tables/damage-done/${logsId}?api_key=${apiKey}&start=${start}&end=${end}`;
  console.log('Fetching damage done data from:', url);

  try {
    const response = await axios.get(url);
    const data = response.data;
    const { totalTime, downtime = 0, combatTime } = data;

    const players: PlayerDamageData[] = data.entries.map((entry: any) => ({
      name: entry.name,
      type: entry.type,
      id: entry.id,
      activeTime: entry.activeTime,
      activeTimeReduced: entry.activeTimeReduced,
      totalRD: entry.totalRDPS,
      totalAD: entry.totalADPS,
      totalND: entry.totalNDPS,
      totalRDPS: entry.totalRDPS / (totalTime - downtime) * 1000.,
      totalADPS: entry.totalADPS / (totalTime - downtime) * 1000.,
      totalNDPS: entry.totalNDPS / (totalTime - downtime) * 1000.,
    }));
    
    return { players, totalTime, downtime, combatTime };
  } catch (error) {
    console.error('Error fetching damage done data:', error);
    return null;
  }
}

async function main() {
  const logsId = apiConfig.logsId || '';
  const apiKey = ''; // 留空以测试默认值

  if (!logsId) {
    console.error('缺少 logsId');
    return;
  }

  try {
    const logData = await fetchLogData(logsId, apiKey);
    if (logData) {
      console.log('Log Title:', logData.title);
      console.log('Friendlies:');
      logData.friendlies.forEach((friendly) => {
        console.log(`  ID: ${friendly.id}, Name: ${friendly.name}, Server: ${friendly.server}, Type: ${friendly.type}`);
      });

      console.log('Fights:');
      console.log(`  Total Fights: ${logData.fights.length}`);
      const fightIds = apiConfig.fightIds ? apiConfig.fightIds : [];
      const filteredFights = fightIds.length > 0
        ? logData.fights.filter((fight) => fightIds.includes(fight.id))
        : logData.fights;

      for (const fight of filteredFights) {
        console.log(`  Fight ID: ${fight.id}, Name: ${fight.name}`);
        console.log(`    Boss: ${fight.friendlies.length > 0 ? fight.friendlies[0].name : 'Unknown'}`);
        console.log(`    Total Phases: ${fight.phases.length}`);
        for (const phase of fight.phases) {
          console.log(`    Phase: ${phase.name} (Start Time: ${phase.startTime}, End Time: ${phase.endTime})`);
          const damageData = await fetchDamageDoneData(logsId, apiKey, phase.startTime, phase.endTime);
          if (damageData) {
            console.log(`      Damage Done Data: Total Time: ${damageData.totalTime}, Downtime: ${damageData.downtime}, Combat Time: ${damageData.combatTime}`);
            console.log(`        Players:`);
            console.log(`          Name           | Total RDPS   | Total ADPS   | Total RD    | Total AD`);
            console.log(`          -------------- | ------------ | ------------ | ----------- | -----------`);
            damageData.players
              .sort((a, b) => b.totalAD - a.totalAD) // 按 totalAD 降序排序
              .forEach((player) => {
                console.log(`          ${player.name.padEnd(14)} | ${player.totalRDPS.toFixed(2).padEnd(12)} | ${player.totalADPS.toFixed(2).padEnd(12)} | ${player.totalRD.toFixed(2).padEnd(11)} | ${player.totalAD.toFixed(2).padEnd(11)}`);
              });
          } else {
            console.log(`      Failed to fetch damage done data for phase: ${phase.name}`);
          }
        }
      }
    } else {
      console.log('Failed to fetch log data.');
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error:', error.message);
    } else {
      console.error('Error:', error);
    }
  }
}

if (require.main === module) {
  main();
}

export { fetchLogData, fetchDamageDoneData };

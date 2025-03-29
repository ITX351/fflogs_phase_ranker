import axios from 'axios';

const logsId = process.env.REACT_APP_LOGS_ID || '';
const apiKey = process.env.REACT_APP_API_KEY || '';

interface Phase {
  startTime: number;
  endTime: number;
  name: string;
  id: number;
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
  kill: boolean;
  start_time: number;
  end_time: number;
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
  predictLogs: number;
}

interface DamageDoneData {
  players: PlayerDamageData[];
  totalTime: number;
  downtime: number;
  combatTime: number;
}

async function fetchLogData(logsIdParam: string, apiKeyParam: string): Promise<LogData | null> {
  const logsIdToUse = logsIdParam || logsId;
  const apiKeyToUse = apiKeyParam || apiKey;

  if (!logsIdToUse || !apiKeyToUse) {
    throw new Error('缺少 logsId 或 apiKey');
  }

  const fightsUrl = `https://cn.fflogs.com/v1/report/fights/${logsIdToUse}?api_key=${apiKeyToUse}`;
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
            id: phase.id,
          }))
        : [],
      friendlies: friendlies.filter((friendly) =>
        friendly.fights.some((f: { id: number }) => f.id === fight.id)
      ),
      kill: fight.kill,
      start_time: fight.start_time,
      end_time: fight.end_time,
    }));

    return { title, fights, friendlies };
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      const errorMessage = error.response?.data?.error || 'Unknown error';
      console.error('Error fetching log data:', errorMessage);
      throw new Error(errorMessage);
    } else {
      console.error('Unexpected error:', error);
      throw new Error('Unexpected error occurred while fetching log data.');
    }
  }
}

async function fetchDamageDoneData(logsIdParam: string, apiKeyParam: string, start: number, end: number): Promise<DamageDoneData | null> {
  const logsIdToUse = logsIdParam || logsId;
  const apiKeyToUse = apiKeyParam || apiKey;

  if (!logsIdToUse || !apiKeyToUse) {
    throw new Error('缺少 logsId 或 apiKey');
  }

  const url = `https://cn.fflogs.com/v1/report/tables/damage-done/${logsIdToUse}?api_key=${apiKeyToUse}&start=${start}&end=${end}`;
  console.log('Fetching damage done data from:', url);

  try {
    const response = await axios.get(url);
    const data = response.data;
    const { totalTime, downtime = 0, combatTime } = data;

    const players: PlayerDamageData[] = data.entries
      .filter((entry: any) => entry.type !== "LimitBreak") // 去除 type 为 "LimitBreak" 的项
      .map((entry: any) => ({
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
      }))
      .sort((a: { totalRD: number; }, b: { totalRD: number; }) => b.totalRD - a.totalRD); // 按 totalRD 降序排序

    return { players, totalTime, downtime, combatTime };
  } catch (error) {
    console.error('Error fetching damage done data:', error);
    return null;
  }
}

async function main() {
  if (!logsId) {
    console.error('缺少 logsId，测试代码不会被执行。请在 .env 中配置 logsId');
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
      const fightId = process.env.REACT_APP_FIGHT_ID || -1; // 从环境变量中获取战斗 ID
      
      const filteredFights = fightId !== -1
        ? logData.fights.filter((fight) => fight.id === Number(fightId))
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

export { fetchLogData, fetchDamageDoneData, DamageDoneData };

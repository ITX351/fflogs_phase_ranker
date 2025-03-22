import { DamageDoneData, fetchLogData, fetchDamageDoneData } from './fflogsApi';

// 尝试导入 apiConfig，如果不存在则使用默认值
let apiConfig: { apiKey?: string; logsId?: string } = {};
try {
  apiConfig = require('./apiConfig').default;
} catch {
  console.warn('apiConfig not found, using default configuration.');
}

interface ConfigItem {
  datasetName: string;
  creationDate: string;
  raidMatchNames: string[];
  raidLogsPhase: number;
  dataFileName: string;
  upperCombatTime: number;
}

const configFilePath = '/data/config.json';

/**
 * 读取 config.json 文件并返回数据项
 */
async function loadConfig(): Promise<ConfigItem[]> {
  const response = await fetch(configFilePath);
  if (!response.ok) {
    throw new Error(`Failed to load config.json: ${response.statusText}`);
  }
  return response.json() as Promise<ConfigItem[]>;
}

/**
 * 根据副本名称和分P筛选数据项
 */
async function getConfigItemsByRaid(raidName: string, phase: number): Promise<ConfigItem[]> {
  const configItems = await loadConfig();
  return configItems
    .filter(item => item.raidMatchNames.some(name => name === raidName) && item.raidLogsPhase === phase)
    .sort((a, b) => new Date(b.creationDate).getTime() - new Date(a.creationDate).getTime());
}

/**
 * 读取指定 CSV 文件并返回数据表
 */
async function loadCsvData(fileName: string): Promise<{ headers: number[]; data: Record<string, number[]> }> {
  const filePath = `/data/${fileName}`;
  const response = await fetch(filePath);
  if (!response.ok) {
    throw new Error(`Failed to load CSV file: ${response.statusText}`);
  }
  const csvContent = await response.text();
  const lines = csvContent.split('\n').filter(line => line.trim() !== '');
  const headers = lines[0].split(',').slice(1).map(Number);
  const data: Record<string, number[]> = {};

  for (let i = 1; i < lines.length; i++) {
    const [key, ...values] = lines[i].split(',');
    data[key] = values.map(Number);
  }

  return { headers: headers, data: data };
}

/**
 * 更新 DamageDoneData 的玩家数据，计算预估伤害比例
 */
async function updateDamageData(
  damageData: DamageDoneData,
  configItem: ConfigItem,
  calculationMode: number
): Promise<void> {
  const csvData = await loadCsvData(configItem.dataFileName);
  const { headers: csvHeaders, data: csvTable } = csvData;
  damageData.players.forEach(player => {
    let totalTime = calculationMode === 0
      ? damageData.totalTime - damageData.downtime
      : damageData.combatTime - damageData.downtime;
    
    if (configItem.upperCombatTime && totalTime > configItem.upperCombatTime) {
      console.log(`Total combat time exceeds the upper limit: ${totalTime} > ${configItem.upperCombatTime}`);
      totalTime = configItem.upperCombatTime; // 限制战斗时间
    }

    const rdps = player.totalRD / totalTime * 1000;
    // const adps = player.totalAD / totalTime * 1000;
    // const ndps = player.totalND / totalTime * 1000;

    // console.log("csvTable", csvTable);
    // console.log("Processing ", configItem.datasetName, totalTime, rdps);
    const playerData = csvTable[player.type];
    if (playerData) {
      if (rdps > playerData[0]) {
        player.predictLogs = 101;
      } else if (rdps < playerData[playerData.length - 1]) {
        player.predictLogs = -1;
      } else {
        for (let i = 0; i < csvHeaders.length - 1; i++) {
          if (rdps >= playerData[i + 1] && rdps <= playerData[i]) {
            const range = csvHeaders[i] - csvHeaders[i + 1];
            const offset = rdps - playerData[i + 1];
            player.predictLogs = csvHeaders[i + 1] + (offset / (playerData[i] - playerData[i + 1])) * range;
            break;
          }
        }
      }
    }
  });
}

async function main() {
  const logsId = apiConfig.logsId || ''; // 从 apiConfig 获取日志 ID
  const apiKey = apiConfig.apiKey || ''; // 从 apiConfig 获取 API 密钥
  const calculationMode = 0; // 预设计算模式

  if (!logsId || !apiKey) {
    console.error('缺少 logsId 或 apiKey，请在 apiConfig.ts 中配置。');
    return;
  }

  try {
    const logData = await fetchLogData(logsId, apiKey);
    if (!logData) {
      console.error('Failed to fetch log data.');
      return;
    }

    for (const fight of logData.fights) {
      if (fight.id !== 15) continue; // 仅处理 ID 为 15 的战斗
      for (let phaseIndex = 0; phaseIndex < fight.phases.length; phaseIndex++) {
        const phase = fight.phases[phaseIndex];
        const phaseId = phase.id;
        console.log(`Processing Phase ${phaseId} for Fight ID: ${fight.id}`);

        const damageData = await fetchDamageDoneData(logsId, apiKey, phase.startTime, phase.endTime);
        if (!damageData) {
          console.error(`Failed to fetch damage done data for Phase ${phaseId}.`);
          continue;
        }

        const configItems = await getConfigItemsByRaid(fight.name, phaseId);
        if (configItems.length === 0) {
          console.error(`No matching config items found for Phase ${phaseId}.`);
          continue;
        }

        const configItem = configItems[0]; // 使用最新的配置项
        updateDamageData(damageData, configItem, calculationMode);

        console.log(`Updated Damage Data for Phase ${phaseId}:`);
        damageData.players.forEach(player => {
          console.log(`Player: ${player.name}, Total RDPS: ${player.totalRDPS.toFixed(2)}, Predict Logs: ${player.predictLogs.toFixed(1)}`);
        });
      }
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

if (require.main === module) {
  main();
}

export { getConfigItemsByRaid, updateDamageData };

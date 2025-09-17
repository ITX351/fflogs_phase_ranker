import os
import re
import json

# 副本硬编码信息
class RaidInfo:
    def __init__(self, cn_name, en_name, en_match, calc_mode_list, phase_remap, upper_time):
        self.cn_name = cn_name
        self.en_name = en_name
        self.en_match = en_match
        self.calc_mode_list = calc_mode_list
        self.phase_remap = phase_remap
        self.upper_time = upper_time

RAID_INFOS = [
    RaidInfo(
        cn_name="龙诗",
        en_name="dsr",
        en_match="Dragonsong's Reprise",
        calc_mode_list=[2],
        phase_remap={5: 4.5, 6: 5, 7: 6, 8: 7},
        upper_time={}
    ),
    RaidInfo(
        cn_name="欧米茄",
        en_name="omega",
        en_match="The Omega Protocol",
        calc_mode_list=[1],
        phase_remap={},
        upper_time={6: 268200}
    ),
    RaidInfo(
        cn_name="伊甸",
        en_name="eden",
        en_match="Futures Rewritten",
        calc_mode_list=[1],
        phase_remap={},
        upper_time={5: 273000}
    ),
]

VERSION = "7.3"
SERVER = "国际服"
EXEC_DIR_PREFIX = "v73"

def find_raid_info(en_name):
    for info in RAID_INFOS:
        if info.en_name == en_name:
            return info
    return None

def main():
    config = []
    for fname in os.listdir(EXEC_DIR_PREFIX):
        if fname.endswith('.csv'):
            m = re.match(r'([a-zA-Z]+)_p(\d+)_([0-9]{6})\.csv', fname)
            if not m:
                continue
            en_name, phase_a, yymmdd = m.group(1), int(m.group(2)), m.group(3)
            raid = find_raid_info(en_name)
            if not raid:
                continue
            # 分P重映射
            phase_b = raid.phase_remap.get(phase_a, phase_a)
            dataset_name = f"{VERSION}{SERVER}{raid.cn_name}P{phase_b}"
            # 日期格式转换 YYMMDD -> YYYY-MM-DD
            year = int(yymmdd[:2])
            if year < 50:
                year += 2000
            else:
                year += 1900
            creation_date = f"{year:04d}-{yymmdd[2:4]}-{yymmdd[4:6]}"
            item = {
                "datasetName": dataset_name,
                "creationDate": creation_date,
                "raidMatchNames": [raid.en_match],
                "raidLogsPhase": phase_a,
                "dataFileName": fname
            }
            if phase_a in raid.calc_mode_list:
                item["calculationMode"] = 1
            if phase_a in raid.upper_time:
                item["upperCombatTime"] = raid.upper_time[phase_a]
            config.append(item)
    # 写入 config.json
    with open(os.path.join(EXEC_DIR_PREFIX, "config.json"), "w", encoding="utf-8") as f:
        json.dump(config, f, ensure_ascii=False, indent=4)

if __name__ == "__main__":
    main()
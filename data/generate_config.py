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
    RaidInfo(
        cn_name="妖星",
        en_name="kafka",
        en_match="Dancing Mad",
        calc_mode_list=[1], # P1的Rdps计算采取特殊时长，可能是fflogs API的bug
        phase_remap={},
        upper_time={}
    ),
]

VERSION = "7.51"
CONFIGS = [
    ("国服", "v751z2", "v2"),
    ("国际服", "v751j2", "v2"),
]
DATA_DIR_PREFIX = os.path.join("public", "data")

def find_raid_info(en_name):
    for info in RAID_INFOS:
        if info.en_name == en_name:
            return info
    return None

def main():
    for server, exec_dir_prefix, version_suffix in CONFIGS:
        config = []
        exec_dir = os.path.join(DATA_DIR_PREFIX, exec_dir_prefix)
        for fname in os.listdir(exec_dir):
            if fname.endswith('.csv'):
                m = re.match(r'([a-zA-Z]+)_p(\d+)_([0-9]{8})\.csv', fname)
                if not m:
                    continue
                en_name, phase_a, date_part = m.group(1), int(m.group(2)), m.group(3)
                raid = find_raid_info(en_name)
                if not raid:
                    continue
                # 分P重映射
                phase_b = raid.phase_remap.get(phase_a, phase_a)
                dataset_name = f"{VERSION}{server}{raid.cn_name}P{phase_b}{f' {version_suffix}' if version_suffix else ''}"
                # 日期格式转换 YYYYMMDD -> YYYY-MM-DD
                creation_date = f"{date_part[:4]}-{date_part[4:6]}-{date_part[6:8]}"
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
        with open(os.path.join(exec_dir, "config.json"), "w", encoding="utf-8") as f:
            json.dump(config, f, ensure_ascii=False, indent=4)

if __name__ == "__main__":
    main()

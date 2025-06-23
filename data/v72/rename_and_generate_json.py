#!/usr/bin/env python3
import os
import re
import json
from datetime import date

# 副本配置
RAID_CONFIG = {
    "Dragonsong's_Reprise": {
        "abbr": "dsr",
        "full": "Dragonsong's Reprise",
        "cn": "龙诗",
        "calc_mode_phases": ['2'],
        "upper_combat_time": {},
        "phase_map": {'1': 1, '2': 2, '3': 3, '4': 4, '4.5': 5, '5': 6, '6': 7, '7': 8}
    },
    "Futures_Rewritten": {
        "abbr": "eden",
        "full": "Futures Rewritten",
        "cn": "伊甸",
        "calc_mode_phases": ['1'],
        "upper_combat_time": {'5': 273000}
    },
    "The_Omega_Protocol": {
        "abbr": "omega",
        "full": "The Omega Protocol",
        "cn": "欧米茄",
        "calc_mode_phases": ['1'],
        "upper_combat_time": {'6': 268200}
    }
}

SUFFIX = 'glb'
SERVER_CN = '国际服'
TODAY = "2025-06-21"


# 阶段映射（特殊处理Intermission_Rewind!）
def extract_phase(filename):
    if 'Intermission_Rewind!' in filename:
        return '4.5'
    m = re.search(r'_P(\d+)', filename)
    if m:
        return m.group(1)
    return None

def rename_csv_files():
    """重命名当前目录下所有csv文件"""
    phase_counter = {k: {} for k in RAID_CONFIG}
    for fname in os.listdir('.'):
        if not fname.endswith('.csv'):
            continue
        raid_key = None
        for k in RAID_CONFIG:
            if k in fname:
                raid_key = k
                break
        if not raid_key:
            continue
        abbr = RAID_CONFIG[raid_key]['abbr']
        full = RAID_CONFIG[raid_key]['full']
        cn = RAID_CONFIG[raid_key]['cn']
        phase = extract_phase(fname)
        if not phase:
            continue
        if phase not in phase_counter[raid_key]:
            phase_counter[raid_key][phase] = len(phase_counter[raid_key]) + 1
        # 新文件名
        ver = '7.2'
        new_fname = f"{abbr}{ver}p{phase}_{SUFFIX}.csv"
        print(f"Renaming {fname} to {new_fname}")
        os.rename(fname, new_fname)

def generate_json_config():
    """读取当前目录下已重命名的csv文件并生成json配置文件"""
    result = []
    for fname in os.listdir('.'):
        if not fname.endswith(f'_{SUFFIX}.csv'):
            continue
        # 解析文件名
        m = re.match(rf'(dsr|eden|omega)7\.2p(\d+(?:\.5)?)_{SUFFIX}\.csv', fname)
        if not m:
            continue
        abbr, phase = m.group(1), m.group(2)
        # 反查RAID_CONFIG
        raid_key = None
        for k, v in RAID_CONFIG.items():
            if v['abbr'] == abbr:
                raid_key = k
                break
        if not raid_key:
            continue
        cn = RAID_CONFIG[raid_key]['cn']
        full = RAID_CONFIG[raid_key]['full']
        dataset_name = f"7.2{SERVER_CN}{cn}P{phase}"
        # 优先查找phase_map
        phase_map = RAID_CONFIG[raid_key].get('phase_map')
        if phase_map:
            raid_phase = phase_map.get(phase, int(float(phase)))
        else:
            raid_phase = int(float(phase))
        item = {
            "datasetName": dataset_name,
            "creationDate": TODAY,
            "raidMatchNames": [full],
            "raidLogsPhase": raid_phase,
            "dataFileName": fname
        }
        # 判断是否需要加calculationMode
        if phase in RAID_CONFIG[raid_key].get('calc_mode_phases', []):
            item["calculationMode"] = 1
        # 判断是否需要加upperCombatTime
        upper_time_dict = RAID_CONFIG[raid_key].get('upper_combat_time', {})
        if phase in upper_time_dict:
            item["upperCombatTime"] = upper_time_dict[phase]
        result.append(item)
    with open(f'config_{SUFFIX}.json', 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, indent=4)

def main():
    # 可单独调用重命名或生成json
    rename_csv_files()
    generate_json_config()

if __name__ == '__main__':
    main()

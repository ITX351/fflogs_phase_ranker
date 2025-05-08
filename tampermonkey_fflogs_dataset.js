// ==UserScript==
// @name         FFLogs Dataset Batch Fetcher
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  自动批量爬取FFLogs各分段数据并导出为CSV
// @author       ITX351
// @match        https://cn.fflogs.com/zone/statistics/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // 工具函数：等待元素出现
    function waitForSelector(selector, timeout = 15000) {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => reject('Timeout: ' + selector), timeout);
            const interval = setInterval(() => {
                const el = document.querySelector(selector);
                if (el) {
                    clearInterval(interval);
                    clearTimeout(timer);
                    resolve(el);
                }
            }, 200);
        });
    }

    // 工具函数：等待加载完成
    function waitForLoadingDone(timeout = 20000) {
        return new Promise((resolve, reject) => {
            const start = Date.now();
            function check() {
                const loading = document.querySelector('#graph-loading');
                const table = document.querySelector('.summary-table');
                if ((!loading || loading.style.display === 'none') && table) {
                    resolve();
                } else if (Date.now() - start > timeout) {
                    reject('Timeout waiting for loading');
                } else {
                    setTimeout(check, 300);
                }
            }
            check();
        });
    }

    // 解析表格数据，返回 {英文职业名: 秒伤}
    function parseTableEn() {
        const table = document.querySelector('.summary-table');
        if (!table) return {};
        const rows = Array.from(table.querySelectorAll('tbody tr'));
        const result = {};
        rows.forEach(tr => {
            const tds = tr.querySelectorAll('td');
            // 直接取class属性作为英文职业名
            let enName = tds[0]?.getAttribute('class');
            if (!enName) return;
            // 只取第一个class（防止有多class）
            enName = enName.split(' ')[0];
            // 只取秒伤（第2列）
            const dps = tds[1]?.innerText.trim().replace(/,/g, '') || '';
            result[enName] = dps;
        });
        return result;
    }

    // 主流程
    async function main() {
        // 1. 获取所有分段按钮
        const container = await waitForSelector('#filter-dataset-selection-container ul');
        // 跳过“全部百分数”项
        const links = Array.from(container.querySelectorAll('a.filter-item'))
            .filter(a => a.id && a.id.startsWith('metric-dataset-') && a.id !== 'metric-dataset-1000');
        if (links.length === 0) {
            alert('未找到分段按钮');
            return;
        }

        // 采集分段英文名（100,99,...,0）和显示名
        const segKeys = links.map(link => {
            // id: metric-dataset-100
            const m = link.id.match(/metric-dataset-(\d+)/);
            return m ? m[1] : link.innerText.trim();
        });

        // 按页面顺序采集所有职业名
        let allJobs = null;
        // {职业英文名: {分段: 秒伤}}
        const jobData = {};

        for (let i = 0; i < links.length; ++i) {
            const link = links[i];
            const segKey = segKeys[i];
            link.click();

            try {
                await waitForLoadingDone();
            } catch (e) {
                console.warn('加载超时，跳过', segKey);
                continue;
            }

            // 解析表格
            const tableObj = parseTableEn();
            if (!allJobs) {
                allJobs = Object.keys(tableObj);
            }
            // 聚合数据
            for (const job of Object.keys(tableObj)) {
                if (!jobData[job]) jobData[job] = {};
                jobData[job][segKey] = tableObj[job];
            }
            await new Promise(r => setTimeout(r, 600));
        }

        // 生成CSV
        // 按分段顺序输出
        const header = ['Key', ...segKeys];
        const lines = [header.join(',')];
        for (const job of allJobs) {
            const row = [job];
            for (const seg of segKeys) {
                row.push(jobData[job]?.[seg] || '');
            }
            lines.push(row.join(','));
        }
        const csv = lines.join('\r\n');
        // 获取boss名并格式化为文件名
        let bossText = '';
        const bossEl = document.getElementById('filter-boss-text');
        if (bossEl) {
            bossText = bossEl.innerText
                .replace(/[\\/:*?"<>|]/g, '') // 去除Windows非法字符
                .replace(/[：，、&\s]+/g, '_') // 替换全角标点、空格等为下划线
                .replace(/_+/g, '_') // 连续下划线合并
                .replace(/^_+|_+$/g, ''); // 去除首尾下划线
        } else {
            bossText = 'fflogs';
        }
        const filename = bossText + '_dataset.csv';
        // 下载
        const blob = new Blob([csv], {type: 'text/csv'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
        console.log('全部分段数据已导出');
    }

    // 添加按钮以便手动触发
    function addBtn() {
        if (document.getElementById('fflogs-batch-btn')) return;
        const btn = document.createElement('button');
        btn.id = 'fflogs-batch-btn';
        btn.innerText = '批量爬取分段数据';
        btn.style.position = 'fixed';
        btn.style.top = '80px';
        btn.style.right = '30px';
        btn.style.zIndex = 99999;
        btn.style.background = '#2599be';
        btn.style.color = '#fff';
        btn.style.padding = '10px 18px';
        btn.style.border = 'none';
        btn.style.borderRadius = '6px';
        btn.style.cursor = 'pointer';
        btn.onclick = main;
        document.body.appendChild(btn);
    }

    window.addEventListener('load', addBtn);
})();

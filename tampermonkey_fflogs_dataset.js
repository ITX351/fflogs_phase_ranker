// ==UserScript==
// @name         FFLogs Dataset Batch Fetcher
// @namespace    http://tampermonkey.net/
// @version      0.3
// @description  自动批量爬取FFLogs各分段数据并导出为CSV
// @author       ITX351
// @match        https://*.fflogs.com/zone/statistics/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // 硬编码Boss字典
    const BOSS_DICT = {
        1076: 'dsr',
        1077: 'omega',
        1079: 'eden'
    };

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

    // 核心数据采集函数
    async function collectBossPhaseData() {
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
        // 按logs75分段降序排序职业
        let sortedJobs = allJobs;
        if (segKeys.includes('75')) {
            sortedJobs = allJobs.slice().sort((a, b) => {
                // 转为数字比较，空值视为0
                const dpsA = Number(jobData[a]?.['75'] || 0);
                const dpsB = Number(jobData[b]?.['75'] || 0);
                return dpsB - dpsA;
            });
        }
        const lines = [header.join(',')];
        for (const job of sortedJobs) {
            const row = [job];
            for (const seg of segKeys) {
                row.push(jobData[job]?.[seg] || '');
            }
            lines.push(row.join(','));
        }
        return lines.join('\r\n');
    }

    // 下载CSV文件
    function downloadCSV(csvContent, bossName, phase) {
        const blob = new Blob([csvContent], {type: 'text/csv'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        
        // 生成文件名，格式为 boss名_pX_YYMMDD.csv
        const now = new Date();
        const year = String(now.getFullYear()).slice(-2);
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const filename = `${bossName}_p${phase}_${year}${month}${day}.csv`;
        
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
    }

    // 处理单个Boss的所有分P
    async function processBoss(bossId, bossName) {
        console.log(`开始处理Boss ${bossName} (ID: ${bossId})`);
        
        // 查找该Boss的所有分P链接
        const phaseLinks = [];
        for (let i = 1; i <= 10; i++) { // 假设最多10个分P
            const phaseId = `boss-${bossId}-${i}`;
            const link = document.querySelector(`#${phaseId}`);
            if (link) {
                phaseLinks.push({
                    phase: i,
                    element: link,
                    href: link.href
                });
            } else {
                // 如果当前分P不存在，则停止查找
                break;
            }
        }
        
        // 如果未找到任何分P，说明当前页面可能不存在指定副本
        if (phaseLinks.length === 0) {
            console.error(`未找到Boss ${bossName} (ID: ${bossId}) 的任何分P，请确认当前页面是否为正确的副本统计页面。`);
            alert(`未找到Boss ${bossName} 的任何分P，请确认当前页面是否为正确的副本统计页面。`);
            return;
        }
        
        console.log(`找到 ${phaseLinks.length} 个分P`);
        
        // 遍历每个分P，直接点击链接元素
        for (const {phase, element} of phaseLinks) {
            console.log(`正在处理 ${bossName} P${phase}`);
            
            // 触发点击事件
            element.click();
            
            // 等待必要的元素加载
            try {
                await waitForSelector('#filter-dataset-selection-container ul', 15000);
                await new Promise(resolve => setTimeout(resolve, 2000)); // 额外等待确保数据加载
                
                // 采集数据
                const csvContent = await collectBossPhaseData();
                
                // 下载文件
                downloadCSV(csvContent, bossName, phase);
                
                console.log(`${bossName} P${phase} 数据已导出`);
                
                // 等待一段时间再处理下一个分P
                await new Promise(resolve => setTimeout(resolve, 3000));
            } catch (error) {
                console.error(`处理 ${bossName} P${phase} 时出错:`, error);
                // 继续处理下一个分P
                await new Promise(resolve => setTimeout(resolve, 3000));
            }
        }
        
        console.log(`Boss ${bossName} 所有分P处理完成`);
        alert(`Boss ${bossName} 所有分P数据已导出完成！`);
    }

    // 添加Boss选择按钮
    function addBossButtons() {
        // 检查是否已经添加过按钮
        if (document.getElementById('fflogs-boss-buttons-container')) return;
        
        const container = document.createElement('div');
        container.id = 'fflogs-boss-buttons-container';
        container.style.position = 'fixed';
        container.style.top = '80px';
        container.style.right = '30px';
        container.style.zIndex = 99999;
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.gap = '10px';
        
        // 为每个Boss创建按钮
        for (const [bossId, bossName] of Object.entries(BOSS_DICT)) {
            const btn = document.createElement('button');
            btn.innerText = `导出 ${bossName} 数据`;
            btn.style.background = '#2599be';
            btn.style.color = '#fff';
            btn.style.padding = '10px 18px';
            btn.style.border = 'none';
            btn.style.borderRadius = '6px';
            btn.style.cursor = 'pointer';
            
            btn.onclick = () => {
                // 禁用所有按钮防止重复点击
                const allButtons = container.querySelectorAll('button');
                allButtons.forEach(b => b.disabled = true);
                
                processBoss(bossId, bossName)
                    .catch(error => {
                        console.error('处理Boss时出错:', error);
                        alert('处理过程中出现错误，请查看控制台');
                    })
                    .finally(() => {
                        // 重新启用按钮
                        allButtons.forEach(b => b.disabled = false);
                    });
            };
            
            container.appendChild(btn);
        }
        
        document.body.appendChild(container);
    }

    window.addEventListener('load', () => {
        addBossButtons();
    });
})();
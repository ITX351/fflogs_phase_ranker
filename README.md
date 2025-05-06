## FFLogsPhaseRanker
### 在线FFLogs分P伤害排名查询工具

**访问 [https://itx351.github.io/fflogs_phase_ranker](https://itx351.github.io/fflogs_phase_ranker) 在线使用。**

---

### 使用方法

1. **在首页输入FFLogs的`logs_id`：**
   - 示例：`https://www.fflogs.com/reports/abc123xyz`
   - 输入`abc123xyz`作为`logs_id`。
2. **点击跳转后进入结果页面：**
   - 页面将通过调用FFLogs的API，读取每个分P的伤害数据。
3. **查看分P伤害排名：**
   - 工具会计算每个分P的伤害数据占全体玩家的排名的预估，并展示结果。

---

### 数据集展示

- 点击首页下方的“浏览数据集”按钮，可进入数据集展示页面。
- 支持按副本、分P筛选，浏览各职业的分P伤害数据集。
- 可查看不同数据集的创建时间、数据来源和详细内容，便于对比分析。

---

### 其他事项

- 需要确保输入的`logs_id`是有效的FFLogs报告ID。
- 工具仅支持公开的FFLogs数据，无法读取私密报告。
- 排名计算基于FFLogs API返回的数据，可能会因API限制或数据更新而有所变化。
- 目前仅对部分常见的战斗场景进行了测试。如有任何问题或建议，欢迎反馈或fork。
- 叠甲：所有数据仅供参考。由于实际战斗情景下，不同分P、不同职业组合的面临的实际战斗场景均不相同，受停手、资源存储、短时长的直暴率的影响导致伤害有差距。**使用该工具即代表你已知晓：其所预估的数据不能直接作为衡量玩家水平的依据。**

---

### 服务器 React.js 配置

#### Setup

运行以下命令以安装所有依赖项：
```sh
npm install
```

#### Running

运行以下命令并访问 `localhost:3000` 进行调试：
```sh
npm start
```

#### Release

运行以下命令以生成最小化的生产版本：
```sh
npm run build
```

---

感谢[leifeng桑](https://space.bilibili.com/8900735)的开发建议。  
by [ITX351](https://space.bilibili.com/522021)（王离@延夏）

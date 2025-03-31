import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

function InputPage() {
  const [input, setInput] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [showHelp, setShowHelp] = useState(false);
  const navigate = useNavigate();
  const { apiKey: routeApiKey } = useParams(); // 从路由参数中获取 apiKey

  useEffect(() => {
    const storedApiKey = localStorage.getItem('apiKey');
    if (storedApiKey) {
      setApiKey(storedApiKey);
    }
    if (routeApiKey) {
      setApiKey(routeApiKey);
      localStorage.setItem('apiKey', routeApiKey);
    }
  }, [routeApiKey]);

  const handleApiKeyChange = (e) => {
    const newApiKey = e.target.value;
    setApiKey(newApiKey);
    localStorage.setItem('apiKey', newApiKey);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    let finalInput = input;
    let finalApiKey = apiKey;

    if (!finalInput) {
      if (process.env.REACT_APP_LOGS_ID !== undefined) {
        finalInput = process.env.REACT_APP_LOGS_ID; // 使用环境变量作为输入
        setInput(finalInput); // 更新状态
      } else {
        alert('请输入 FFLogs 链接或日志 ID');
        return;
      }
    }
    if (!finalApiKey) {
      if (process.env.REACT_APP_API_KEY !== undefined) {
        finalApiKey = process.env.REACT_APP_API_KEY; // 使用环境变量作为 API_KEY
        setApiKey(finalApiKey); // 更新状态
      } else {
        alert('请输入 API_KEY');
        return;
      }
    }

    const sanitizedInput = finalInput.split('&')[0]; // 移除 & 及其后面的内容
    const urlPattern = /^(?:https?:\/\/)?(?:[a-zA-Z0-9-]+\.)?fflogs\.com\/reports\/(a:[a-zA-Z0-9]+|[a-zA-Z0-9]+)(?:\?fight=([a-zA-Z0-9]+))?$|^[a-zA-Z0-9]{16,}$/;
    const match = sanitizedInput.match(urlPattern);

    if (match) {
      const logsId = match[1] || sanitizedInput; // 如果是纯日志 ID，直接使用输入值
      const fightId = match[2];
      if (logsId) {
        navigate(fightId ? `/${finalApiKey}/${logsId}/${fightId}` : `/${finalApiKey}/${logsId}`);
      }
    } else {
      alert('输入的 FFLogs 链接或日志 ID 格式无效');
    }
  };

  const generateBookmarkLink = () => {
    return `${window.location.origin}/fflogs_phase_ranker/#/${apiKey}`;
  };

  return (
    <div className="container mt-5">
      <h1 className="text-center">FFLogs 分P伤害排名查询工具</h1>
      <form onSubmit={handleSubmit} className="mt-4">
        <div className="mb-3">
          <label htmlFor="logIdInput" className="form-label">请输入 FFLogs 链接或日志 ID：</label>
          <input
            type="text"
            id="logIdInput"
            className="form-control"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="例如：https://www.fflogs.com/reports/QrStUvWx12345678?fight=1 或 QrStUvWx12345678"
          />
        </div>
        <div className="mb-3">
          <label htmlFor="apiKeyInput" className="form-label">请输入 API_KEY：</label>
          <input
            type="text"
            id="apiKeyInput"
            className="form-control"
            value={apiKey}
            onChange={handleApiKeyChange}
            placeholder="请输入您的 API_KEY"
          />
          <button
            type="button"
            className="btn btn-link mt-2"
            onClick={() => setShowHelp(!showHelp)}
          >
            {showHelp ? '隐藏帮助信息' : '如何获取 API_KEY?'}
          </button>
          {showHelp && (
            <div className="p-3 mt-2" style={{ backgroundColor: '#f8f9fa', border: '1px solid #ddd' }}>
              <p>您可以通过以下步骤获取 API_KEY：</p>
              <ol>
                <li>登录您的 FFLogs 账户。</li>
                <li>访问 <a href="https://cn.fflogs.com/profile" target="_blank" rel="noopener noreferrer">FFLogs 个人设置页</a>，翻到最下方找到“网页API”。</li>
                <li><span style={{ fontWeight: 'bold', color: 'red', fontSize: '1.3em' }}>随意输入一个V1客户名称，</span>确定，然后复制V1客户端密钥。</li>
              </ol>
              <p>请妥善保管您的 API_KEY，不要泄露给他人。</p>
              <p>您可以填写API_KEY后，访问以下链接，然后将该页面保存到收藏夹，方便下次使用：</p>
              <a href={generateBookmarkLink()} target="_blank" rel="noopener noreferrer" className="btn btn-outline-secondary">
                生成带 API_KEY 的收藏链接
              </a>
            </div>
          )}
        </div>
        <button type="submit" className="btn btn-primary w-100">跳转</button>
      </form>
    </div>
  );
}

export default InputPage;

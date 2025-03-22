import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiConfig from '../api/apiConfig'; // 导入 apiConfig

function InputPage() {
  const [input, setInput] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [showHelp, setShowHelp] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // 从 URL 参数中获取 apiKey
    const urlParams = new URLSearchParams(window.location.search);
    const apiKeyFromUrl = urlParams.get('apiKey');
    if (apiKeyFromUrl) {
      setApiKey(apiKeyFromUrl);
    }
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();

    // 如果 apiConfig.valid 为 false，强制要求输入 logsId 和 API_KEY
    if (!apiConfig.valid && (!input || !apiKey)) {
      alert('当前配置无效，请提供日志 ID 和 API_KEY');
      return;
    }

    const sanitizedInput = input.split('&')[0]; // 移除 & 及其后面的内容
    const urlPattern = /^(?:https?:\/\/)?(?:[a-zA-Z0-9-]+\.)?fflogs\.com\/reports\/(a:[a-zA-Z0-9]+|[a-zA-Z0-9]+)(?:\?fight=([a-zA-Z0-9]+))?$|^[a-zA-Z0-9]{16,}$/;
    const match = sanitizedInput.match(urlPattern);

    if (match) {
      const logsId = match[1] || sanitizedInput; // 如果是纯日志 ID，直接使用输入值
      const fightId = match[2];
      if (logsId) {
        const query = apiKey ? `?apiKey=${apiKey}` : ''; // 将 apiKey 添加到查询参数
        navigate(fightId ? `/${logsId}/${fightId}${query}` : `/${logsId}${query}`);
      }
    } else {
      alert('请输入有效的 FFLogs 链接或日志 ID');
    }
  };

  const generateBookmarkLink = () => {
    const currentUrl = window.location.origin + window.location.pathname;
    return `${currentUrl}?apiKey=${apiKey}`;
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
            onChange={(e) => setApiKey(e.target.value)}
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

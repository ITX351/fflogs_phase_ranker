import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function InputPage() {
  const [input, setInput] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [showHelp, setShowHelp] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    const sanitizedInput = input.split('&')[0]; // 移除 & 及其后面的内容
    const urlPattern = /^(?:https?:\/\/)?(?:[a-zA-Z0-9-]+\.)?fflogs\.com\/reports\/([a-zA-Z0-9]+)(?:\?fight=(\d+))?$|^[a-zA-Z0-9]{16,}$/;
    const match = sanitizedInput.match(urlPattern);

    if (match) {
      const logsId = match[1] || sanitizedInput; // 如果是纯日志 ID，直接使用输入值
      const fightId = match[2];
      if (logsId) {
        const query = apiKey ? `?apiKey=${apiKey}` : '';
        navigate(fightId ? `/${logsId}/${fightId}${query}` : `/${logsId}${query}`);
      }
    } else {
      alert('请输入有效的 FFLogs 链接或日志 ID');
    }
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
                <li>随意输入一个客户端名称，创建一个新的 API 密钥，并复制该密钥。</li>
              </ol>
              <p>请妥善保管您的 API_KEY，不要泄露给他人。</p>
            </div>
          )}
        </div>
        <button type="submit" className="btn btn-primary w-100">跳转</button>
      </form>
    </div>
  );
}

export default InputPage;

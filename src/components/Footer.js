import React from 'react';

function Footer() {
  const version = process.env.REACT_APP_VERSION; // 从环境变量中获取版本号

  return (
    <footer
      style={{
        position: 'fixed',
        bottom: '10px',
        right: '10px',
        fontSize: '0.9rem',
        color: '#6c757d',
        zIndex: 1000, // 提高 z-index
        backgroundColor: 'rgba(255, 255, 255, 0.8)', // 半透明背景
        pointerEvents: 'none', // 确保不会阻挡点击事件
      }}
    >
      <p style={{ pointerEvents: 'auto' }}> {/* 允许链接可点击 */}
        {/* <img src="/fflogs_phase_ranker/ITX351_logo.jpg" alt="Logo" style={{ height: '60px', width: '60px', marginRight: '5px', verticalAlign: 'middle' }} /> */}
        <a href="https://space.bilibili.com/522021" target="_blank" rel="noopener noreferrer" style={{ color: '#6c757d' }}>ITX351</a> | <a href="https://github.com/ITX351/fflogs_phase_ranker" target="_blank" rel="noopener noreferrer" style={{ color: '#6c757d' }}>GitHub</a>
        &nbsp;|&nbsp;v{version}
      </p>
    </footer>
  );
}

export default Footer;

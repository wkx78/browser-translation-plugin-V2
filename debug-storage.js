// 调试存储状态的脚本
// 在浏览器控制台中运行以检查存储状态

console.log('=== 调试 DeepSeek API Key 存储状态 ===');

// 检查当前存储的密钥
chrome.storage.local.get(['deepseek_api_key'], function(result) {
    console.log('当前存储的密钥:', result.deepseek_api_key);
    console.log('密钥是否存在:', !!result.deepseek_api_key);
    console.log('密钥长度:', result.deepseek_api_key ? result.deepseek_api_key.length : 0);
});

// 查看所有存储的数据
chrome.storage.local.get(null, function(items) {
    console.log('所有存储的数据:', items);
});

// 清除所有存储数据的函数
window.clearAllStorage = function() {
    chrome.storage.local.clear(function() {
        console.log('已清除所有存储数据');
    });
};

console.log('调试完成。如需清除所有存储，运行: clearAllStorage()');

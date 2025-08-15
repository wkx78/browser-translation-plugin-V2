// Popup页面脚本 - DeepSeek版本
document.addEventListener('DOMContentLoaded', function() {
    // 获取DOM元素
    const statusElement = document.getElementById('status');
    const statusText = document.getElementById('status-text');
    const setKeyBtn = document.getElementById('set-key-btn');
    const viewKeyBtn = document.getElementById('view-key-btn');
    
    // 弹窗元素
    const keyModal = document.getElementById('key-modal');
    const viewModal = document.getElementById('view-modal');
    const closeModal = document.getElementById('close-modal');
    const closeViewModal = document.getElementById('close-view-modal');
    
    // 表单元素
    const apiKeyInput = document.getElementById('api-key-input');
    const toggleVisibility = document.getElementById('toggle-visibility');
    const saveKeyBtn = document.getElementById('save-key');
    const cancelKeyBtn = document.getElementById('cancel-key');
    
    // 查看密钥元素
    const currentKey = document.getElementById('current-key');
    const copyKeyBtn = document.getElementById('copy-key');
    const deleteKeyBtn = document.getElementById('delete-key');
    const updateKeyBtn = document.getElementById('update-key');

    // API密钥存储的key
    const API_KEY_STORAGE = 'deepseek_api_key';

    // 初始化
    init();

    async function init() {
        await checkApiKeyStatus();
    }

    // 检查API密钥状态
    async function checkApiKeyStatus() {
        try {
            const result = await chrome.storage.local.get([API_KEY_STORAGE]);
            const apiKey = result[API_KEY_STORAGE];
            
            if (apiKey && apiKey.trim()) {
                // 有API密钥
                statusElement.className = 'status active';
                statusText.textContent = 'DeepSeek 翻译已启用';
                setKeyBtn.style.display = 'none';
                viewKeyBtn.style.display = 'block';
            } else {
                // 没有API密钥
                statusElement.className = 'status inactive';
                statusText.textContent = '请设置 DeepSeek API Key';
                setKeyBtn.style.display = 'block';
                viewKeyBtn.style.display = 'none';
            }
        } catch (error) {
            console.error('检查API密钥状态失败:', error);
            statusElement.className = 'status inactive';
            statusText.textContent = '配置检查失败';
        }
    }

    // 显示设置密钥弹窗
    function showKeyModal() {
        apiKeyInput.value = '';
        keyModal.style.display = 'flex';
        apiKeyInput.focus();
    }

    // 隐藏设置密钥弹窗
    function hideKeyModal() {
        keyModal.style.display = 'none';
        apiKeyInput.value = '';
    }

    // 显示查看密钥弹窗
    async function showViewModal() {
        try {
            const result = await chrome.storage.local.get([API_KEY_STORAGE]);
            const apiKey = result[API_KEY_STORAGE];
            
            if (apiKey) {
                // 显示部分密钥
                const maskedKey = apiKey.substring(0, 8) + '*'.repeat(Math.max(0, apiKey.length - 16)) + apiKey.substring(Math.max(8, apiKey.length - 8));
                currentKey.textContent = maskedKey;
                currentKey.dataset.fullKey = apiKey;
                viewModal.style.display = 'flex';
            }
        } catch (error) {
            console.error('获取API密钥失败:', error);
            alert('获取API密钥失败');
        }
    }

    // 隐藏查看密钥弹窗
    function hideViewModal() {
        viewModal.style.display = 'none';
    }

    // 保存API密钥
    async function saveApiKey() {
        const apiKey = apiKeyInput.value.trim();
        
        if (!apiKey) {
            alert('请输入API密钥');
            return;
        }

        if (apiKey.length < 10) {
            alert('API密钥长度不正确');
            return;
        }

        try {
            await chrome.storage.local.set({ [API_KEY_STORAGE]: apiKey });
            hideKeyModal();
            await checkApiKeyStatus();
            
            // 通知content script更新密钥
            notifyContentScript();
            
            showSuccessMessage('DeepSeek API密钥保存成功！');
        } catch (error) {
            console.error('保存API密钥失败:', error);
            alert('保存失败，请重试');
        }
    }

    // 删除API密钥
    async function deleteApiKey() {
        if (confirm('确定要删除 DeepSeek API密钥吗？删除后翻译功能将停止工作。')) {
            try {
                await chrome.storage.local.remove([API_KEY_STORAGE]);
                hideViewModal();
                await checkApiKeyStatus();
                
                // 通知content script密钥已删除
                notifyContentScript();
                
                showSuccessMessage('API密钥已删除');
            } catch (error) {
                console.error('删除API密钥失败:', error);
                alert('删除失败，请重试');
            }
        }
    }

    // 复制密钥到剪贴板
    async function copyKey() {
        const fullKey = currentKey.dataset.fullKey;
        if (fullKey) {
            try {
                await navigator.clipboard.writeText(fullKey);
                copyKeyBtn.textContent = '已复制';
                setTimeout(() => {
                    copyKeyBtn.textContent = '复制';
                }, 1000);
            } catch (error) {
                console.error('复制失败:', error);
                alert('复制失败');
            }
        }
    }

    // 切换密码可见性
    function togglePasswordVisibility() {
        if (apiKeyInput.type === 'password') {
            apiKeyInput.type = 'text';
            toggleVisibility.textContent = '🙈';
        } else {
            apiKeyInput.type = 'password';
            toggleVisibility.textContent = '👁';
        }
    }

    // 通知content script密钥状态变更
    function notifyContentScript() {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    type: 'API_KEY_UPDATED'
                }).catch(() => {
                    // 忽略错误，content script可能未注入
                });
            }
        });
    }

    // 显示成功消息
    function showSuccessMessage(message) {
        const originalText = statusText.textContent;
        statusText.textContent = message;
        setTimeout(() => {
            checkApiKeyStatus();
        }, 1500);
    }

    // 事件监听器
    setKeyBtn.addEventListener('click', showKeyModal);
    viewKeyBtn.addEventListener('click', showViewModal);
    
    closeModal.addEventListener('click', hideKeyModal);
    closeViewModal.addEventListener('click', hideViewModal);
    
    saveKeyBtn.addEventListener('click', saveApiKey);
    cancelKeyBtn.addEventListener('click', hideKeyModal);
    
    copyKeyBtn.addEventListener('click', copyKey);
    deleteKeyBtn.addEventListener('click', deleteApiKey);
    updateKeyBtn.addEventListener('click', () => {
        hideViewModal();
        showKeyModal();
    });
    
    toggleVisibility.addEventListener('click', togglePasswordVisibility);

    // 点击弹窗外部关闭
    keyModal.addEventListener('click', function(e) {
        if (e.target === keyModal) {
            hideKeyModal();
        }
    });

    viewModal.addEventListener('click', function(e) {
        if (e.target === viewModal) {
            hideViewModal();
        }
    });

    // 回车保存
    apiKeyInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            saveApiKey();
        }
    });

    // ESC关闭弹窗
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            if (keyModal.style.display === 'flex') {
                hideKeyModal();
            }
            if (viewModal.style.display === 'flex') {
                hideViewModal();
            }
        }
    });
});
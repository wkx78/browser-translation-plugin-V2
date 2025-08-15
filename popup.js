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
        // 页面加载时立即检查API密钥状态，决定界面显示
        await checkApiKeyStatus();
    }

    // ===== 检查API密钥状态并控制界面显示的核心函数 =====
    async function checkApiKeyStatus() {
        try {
            // 【步骤1】从chrome本地存储中读取API密钥
            const result = await chrome.storage.local.get([API_KEY_STORAGE]);
            const apiKey = result[API_KEY_STORAGE];
            
            // 【步骤2】根据API密钥是否存在，控制不同div的显示/隐藏
            if (apiKey && apiKey.trim()) {
                // ===== 有API密钥的情况 - 显示"已启用"状态 =====
                
                // 【UI控制1】状态区域显示为"激活"状态 (绿色样式)
                statusElement.className = 'status active';
                statusText.textContent = 'DeepSeek 翻译已启用';
                
                // 【UI控制2】隐藏"设置API Key"按钮 (用户已有密钥，不需要设置)
                setKeyBtn.style.display = 'none';
                
                // 【UI控制3】显示"查看API Key"按钮 (允许用户查看/管理现有密钥)
                viewKeyBtn.style.display = 'block';
                
            } else {
                // ===== 没有API密钥的情况 - 显示"未配置"状态 =====
                
                // 【UI控制4】状态区域显示为"未激活"状态 (红色样式)
                statusElement.className = 'status inactive';
                statusText.textContent = '请设置 DeepSeek API Key';
                
                // 【UI控制5】显示"设置API Key"按钮 (引导用户设置密钥)
                setKeyBtn.style.display = 'block';
                
                // 【UI控制6】隐藏"查看API Key"按钮 (没有密钥可查看)
                viewKeyBtn.style.display = 'none';
            }
        } catch (error) {
            // ===== 读取失败的情况 - 显示错误状态 =====
            console.error('检查API密钥状态失败:', error);
            
            // 【UI控制7】显示错误状态
            statusElement.className = 'status inactive';
            statusText.textContent = '配置检查失败';
        }
    }

    // 显示设置密钥弹窗
    function showKeyModal() {
        // 【弹窗控制1】清空输入框内容
        apiKeyInput.value = '';
        // 【弹窗控制2】显示设置密钥的模态框
        keyModal.style.display = 'flex';
        // 【用户体验】自动聚焦到输入框
        apiKeyInput.focus();
    }

    // 隐藏设置密钥弹窗
    function hideKeyModal() {
        // 【弹窗控制3】隐藏设置密钥的模态框
        keyModal.style.display = 'none';
        // 【数据清理】清空输入框内容
        apiKeyInput.value = '';
    }

    // 显示查看密钥弹窗
    async function showViewModal() {
        try {
            // 【数据读取】重新从存储中获取当前密钥
            const result = await chrome.storage.local.get([API_KEY_STORAGE]);
            const apiKey = result[API_KEY_STORAGE];
            
            if (apiKey) {
                // 【数据处理】生成掩码显示的密钥 (保护隐私)
                const maskedKey = apiKey.substring(0, 8) + '*'.repeat(Math.max(0, apiKey.length - 16)) + apiKey.substring(Math.max(8, apiKey.length - 8));
                
                // 【UI更新】在界面上显示掩码密钥
                currentKey.textContent = maskedKey;
                // 【数据存储】将完整密钥存储在DOM属性中，供复制功能使用
                currentKey.dataset.fullKey = apiKey;
                
                // 【弹窗控制4】显示查看密钥的模态框
                viewModal.style.display = 'flex';
            }
        } catch (error) {
            console.error('获取API密钥失败:', error);
            alert('获取API密钥失败');
        }
    }

    // 隐藏查看密钥弹窗
    function hideViewModal() {
        // 【弹窗控制5】隐藏查看密钥的模态框
        viewModal.style.display = 'none';
    }

    // 保存API密钥
    async function saveApiKey() {
        const apiKey = apiKeyInput.value.trim();
        
        // 【数据验证】检查密钥是否为空
        if (!apiKey) {
            alert('请输入API密钥');
            return;
        }

        // 【数据验证】检查密钥长度是否合理
        if (apiKey.length < 10) {
            alert('API密钥长度不正确');
            return;
        }

        try {
            // 【数据保存】将密钥保存到chrome本地存储
            await chrome.storage.local.set({ [API_KEY_STORAGE]: apiKey });
            
            // 【UI控制8】关闭设置密钥弹窗
            hideKeyModal();
            
            // 【UI更新】重新检查密钥状态，更新界面显示
            await checkApiKeyStatus();
            
            // 【消息通信】通知content script密钥已更新
            notifyContentScript();
            
            // 【用户反馈】显示成功消息
            showSuccessMessage('DeepSeek API密钥保存成功！');
        } catch (error) {
            console.error('保存API密钥失败:', error);
            alert('保存失败，请重试');
        }
    }

    // 删除API密钥
    async function deleteApiKey() {
        // 【用户确认】删除前确认操作
        if (confirm('确定要删除 DeepSeek API密钥吗？删除后翻译功能将停止工作。')) {
            try {
                // 【数据删除】从chrome本地存储中移除密钥
                await chrome.storage.local.remove([API_KEY_STORAGE]);
                
                // 【UI控制9】关闭查看密钥弹窗
                hideViewModal();
                
                // 【UI更新】重新检查密钥状态，更新界面显示
                await checkApiKeyStatus();
                
                // 【消息通信】通知content script密钥已删除
                notifyContentScript();
                
                // 【用户反馈】显示删除成功消息
                showSuccessMessage('API密钥已删除');
            } catch (error) {
                console.error('删除API密钥失败:', error);
                alert('删除失败，请重试');
            }
        }
    }

    // 复制密钥到剪贴板
    async function copyKey() {
        // 【数据获取】从DOM属性中获取完整密钥
        const fullKey = currentKey.dataset.fullKey;
        if (fullKey) {
            try {
                // 【系统交互】复制到剪贴板
                await navigator.clipboard.writeText(fullKey);
                
                // 【用户反馈】临时显示"已复制"状态
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
        // 【UI交互】切换输入框的密码/文本显示模式
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
        // 【消息通信】向当前活跃标签页的content script发送密钥更新消息
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
        // 【用户反馈】临时显示成功消息，然后恢复正常状态
        const originalText = statusText.textContent;
        statusText.textContent = message;
        setTimeout(() => {
            // 【UI恢复】1.5秒后重新检查状态并更新界面
            checkApiKeyStatus();
        }, 1500);
    }

    // ===== 事件监听器绑定 =====
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
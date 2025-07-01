import requests

def test_deepseek_api_key(api_key):
    """
    测试DeepSeek API Key是否有效
    
    参数:
        api_key (str): 你的DeepSeek API Key
        
    返回:
        bool: 如果API Key有效返回True，否则返回False
        str: 附加信息或错误消息
    """
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    # 简单的测试请求数据
    payload = {
        "model": "deepseek-chat",
        "messages": [
            {"role": "user", "content": "你好，请回复'API测试成功'"}
        ],
        "temperature": 0.7
    }
    
    try:
        # 发送请求到DeepSeek API
        response = requests.post(
            "https://api.deepseek.com/v1/chat/completions",
            headers=headers,
            json=payload
        )
        
        # 检查响应状态码
        if response.status_code == 200:
            # 尝试解析JSON响应
            data = response.json()
            if "choices" in data and len(data["choices"]) > 0:
                reply = data["choices"][0]["message"]["content"]
                return True, f"API Key有效！模型回复: {reply}"
            return True, "API Key有效，但未能解析完整响应。"
        elif response.status_code == 401:
            return False, "API Key无效或未授权。"
        else:
            return False, f"API请求失败，状态码: {response.status_code}, 错误信息: {response.text}"
            
    except requests.exceptions.RequestException as e:
        return False, f"请求过程中发生错误: {str(e)}"
    except ValueError as e:
        return False, f"响应解析错误: {str(e)}"

# 使用示例
if __name__ == "__main__":
    # 在这里输入你的DeepSeek API Key
    YOUR_API_KEY = "sk-71ee1a5a6c8846f0a5361dad385848b8"
    
    is_valid, message = test_deepseek_api_key(YOUR_API_KEY)
    print(f"测试结果: {'成功' if is_valid else '失败'}")
    print(f"详细信息: {message}")
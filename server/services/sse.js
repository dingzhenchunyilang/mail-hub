/**
 * SSE (Server-Sent Events) 管理器
 * 维护所有前端连接，广播验证码检测事件
 */

class SSEManager {
  constructor() {
    this.clients = new Set();
  }

  /**
   * 注册一个新的SSE客户端连接
   */
  addClient(res) {
    this.clients.add(res);
    console.log(`[SSE] Client connected. Total: ${this.clients.size}`);

    res.on('close', () => {
      this.clients.delete(res);
      console.log(`[SSE] Client disconnected. Total: ${this.clients.size}`);
    });
  }

  /**
   * 向所有客户端广播事件
   * @param {string} event - 事件名
   * @param {object} data - 事件数据
   */
  broadcast(event, data) {
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const client of this.clients) {
      try {
        client.write(payload);
      } catch {
        this.clients.delete(client);
      }
    }
    console.log(`[SSE] Broadcasted ${event} to ${this.clients.size} clients`);
  }

  getClientCount() {
    return this.clients.size;
  }
}

export const sseManager = new SSEManager();

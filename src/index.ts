import {
  Plugin,
  Setting
} from "siyuan";

import "./index.scss";


export default class synca extends Plugin {

  async sync() {
    try {
      const response = await fetch("http://127.0.0.1:6806/api/sync/performSync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ "upload": true })
      });
      // 可选：处理响应数据
      const result = await response.json();
      if (result.code === 0) { /* empty */ }
    } catch (error) {
      console.error("Error during sync:", error);
    }
  }

  async listenchange() {
    let isFetchOverridden = false; // 标志变量，用于判断 fetch 是否已经被覆盖
    if (!isFetchOverridden) {
      const originalFetch = window.fetch;
      const self = this; // 保存对当前类实例的引用
      const synctime = await this.loadData("synctime");

      window.fetch = async function (url, ...args) {
        try {
          const response = await originalFetch(url, ...args);

          if (url.endsWith("/api/transactions")) {
            console.log("监听到文件变动");
            // 调整延时
            await new Promise(resolve => setTimeout(resolve, synctime));
            await self.sync(); // 调用 sync 函数
          }

          return response;
        } catch (error) {
          throw error;
        }
      };

      isFetchOverridden = true; // 设置标志变量，表示 fetch 已经被覆盖
    }
  }
  async onLayoutReady() {
    this.listenchange();
  }

  async onload() {
    const textareaElement1 = document.createElement("textarea");
    this.setting = new Setting({
      confirmCallback: () => {
        this.saveData("synctime", textareaElement1.value);
        window.location.reload();
      }
    });

    this.setting.addItem({
      title: "修改后多久同步",
      description: "留空则马上同步（时间单位：ms）",
      createActionElement: () => {
        textareaElement1.className = "b3-text-field fn__block ids";
        textareaElement1.placeholder = "请输入时间";

        // 使用 setTimeout 确保在输入框加载后设置值
        setTimeout(() => {
          this.loadData("synctime").then(loadedSynctime => {
            if (loadedSynctime) {
              textareaElement1.value = loadedSynctime;
            } else {
              textareaElement1.value = ""; // 如果没有获取到有效数据，设置为空字符串
            }
          }).catch(error => {
            textareaElement1.value = ""; // 如果加载数据出错，设置为空字符串
          });
        }, 0);

        return textareaElement1;
      },
    });
  }
}

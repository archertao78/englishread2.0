/****************************************************************
 * 1. 加载 LRC 文件并解析
 *    - 时间戳要求 [mm:ss.xx]，即两位分钟、两位秒、点后两位小数
 ****************************************************************/
async function fetchLyrics(url) {
    const response = await fetch(url);
    const text = await response.text();
    return parseLRC(text);
  }
  
  /**
   * parseLRC:
   * 只匹配 [mm:ss.xx] 格式的行
   * 解析后返回数组：
   * [
   *   { start: 0.0, end: 5.0, text: "字幕1" },
   *   { start: 5.0, end: 10.0, text: "字幕2" },
   *   ...
   * ]
   */
  function parseLRC(lrcText) {
    const lines = lrcText.split("\n");
    const lrcData = [];
  
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
  
      // 更严格的正则：匹配 [mm:ss.xx]
      // 分组含义：
      //   match[1] -> mm (两位分钟)
      //   match[2] -> ss (两位秒)
      //   match[3] -> xx (两位小数)
      //   match[4] -> 剩余字幕文本
      const match = line.match(/\[(\d{2}):(\d{2})\.(\d{2})\](.*)/);
      if (match) {
        const min = parseInt(match[1], 10);
        const sec = parseInt(match[2], 10);
        const cent = parseInt(match[3], 10); // 两位小数
  
        // 转换为秒数：startTime
        // 分钟 * 60 + 秒 + 小数部分(cent/100)
        const startTime = min * 60 + sec + cent / 100;
  
        const text = match[4].trim();
        lrcData.push({ start: startTime, text });
      }
    }
  
    // 根据 startTime 排序
    lrcData.sort((a, b) => a.start - b.start);
  
    // 计算 endTime（把下一行的 start 当作当前行的 end）
    for (let i = 0; i < lrcData.length; i++) {
      if (i < lrcData.length - 1) {
        lrcData[i].end = lrcData[i + 1].start;
      } else {
        // 最后一行随意给个 5 秒或结合音频长度来定
        lrcData[i].end = lrcData[i].start + 5;
      }
    }
  
    return lrcData;
  }
  
  /****************************************************************
   * 2. 渲染字幕 + 绑定点击事件
   ****************************************************************/
  function renderLyrics(lyricsData, container) {
    container.innerHTML = "";
    for (let i = 0; i < lyricsData.length; i++) {
      const lineDiv = document.createElement("div");
      lineDiv.classList.add("lyric-line");
      lineDiv.textContent = lyricsData[i].text;
  
      // 把索引存在 dataset 里
      lineDiv.dataset.index = i;
  
      // 点击事件
      lineDiv.addEventListener("click", (e) => {
        const idx = parseInt(e.currentTarget.dataset.index, 10);
        handleLyricClick(idx);
      });
  
      container.appendChild(lineDiv);
    }
  }
  
  /****************************************************************
   * 3. 播放逻辑 + 高亮处理
   ****************************************************************/
  let currentIndex = 0;            // 当前播放的字幕索引
  let lyricsData = [];             // 解析得到的 LRC 数据
  const audioPlayer = document.getElementById("audioPlayer");
  const continuousModeCheckbox = document.getElementById("continuousMode");
  
  /**
   * 点击字幕时
   */
  function handleLyricClick(index) {
    if (index === currentIndex) {
      // 如果点击的是当前行 -> 切换播放 / 暂停
      if (!audioPlayer.paused) {
        audioPlayer.pause();
      } else {
        audioPlayer.play();
      }
    } else {
      // 切换到新的行
      currentIndex = index;
      playSegment(currentIndex);
    }
  
    // 高亮
    highlightLyricLine(index);
  }
  
  /**
   * 播放指定字幕段
   */
  function playSegment(index) {
    if (index < 0 || index >= lyricsData.length) return;
  
    const startTime = lyricsData[index].start;
    const endTime = lyricsData[index].end;
  
    // 跳转时间后播放
    audioPlayer.pause();
    audioPlayer.currentTime = startTime;
    audioPlayer.play();
  
    // 定时检测是否到达该段结束
    audioPlayer.ontimeupdate = () => {
      if (audioPlayer.currentTime >= endTime) {
        audioPlayer.pause();
        audioPlayer.ontimeupdate = null; // 清除监听
  
        // 检查连续播放
        if (continuousModeCheckbox.checked) {
          currentIndex++;
          if (currentIndex < lyricsData.length) {
            playSegment(currentIndex);
            highlightLyricLine(currentIndex);
          }
        } else {
          // 不连续：重复当前段
          playSegment(index);
          highlightLyricLine(index);
        }
      }
    };
  }
  
  /**
   * 高亮某行字幕
   */
  function highlightLyricLine(index) {
    const lines = document.querySelectorAll(".lyric-line");
    // 先移除所有的 .active
    lines.forEach(line => line.classList.remove("active"));
    // 给当前行添加
    if (lines[index]) {
      lines[index].classList.add("active");
    }
  }
  
  /****************************************************************
   * 4. 初始化：加载 LRC -> 渲染
   ****************************************************************/
  (async function init() {
    const container = document.getElementById("lyricsContainer");
  
    // 加载并解析 LRC（如果 LRC 文件名和路径改变，就改这里）
    lyricsData = await fetchLyrics("lyric.lrc");
  
    // 渲染字幕到页面
    renderLyrics(lyricsData, container);
  
    // 如果需要页面加载后直接播放第1段
    // playSegment(0);
  })();
  
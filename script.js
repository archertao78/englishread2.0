/****************************************************************
 * 1. 解析 URL 参数 -> 动态设置音频 & LRC 路径
 ****************************************************************/
function getQueryParam(key) {
    // 使用浏览器提供的 URLSearchParams
    const params = new URLSearchParams(window.location.search);
    return params.get(key);
  }
  
  /****************************************************************
   * 2. 加载 LRC 文件并解析
   ****************************************************************/
  async function fetchLyrics(url) {
    const response = await fetch(url);
    const text = await response.text();
    return parseLRC(text);
  }
  
  function parseLRC(lrcText) {
    const lines = lrcText.split("\n");
    const lrcData = [];
  
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
  
      const match = line.match(/\[(\d{2}):(\d{2}(?:\.\d{1,2})?)\](.*)/);
      if (match) {
        const min = parseInt(match[1], 10);
        const sec = parseFloat(match[2]);
        const text = match[3].trim();
        const startTime = min * 60 + sec;
        lrcData.push({ start: startTime, text });
      }
    }
  
    // 按 startTime 排序
    lrcData.sort((a, b) => a.start - b.start);
  
    // 计算 endTime
    for (let i = 0; i < lrcData.length; i++) {
      if (i < lrcData.length - 1) {
        lrcData[i].end = lrcData[i + 1].start;
      } else {
        lrcData[i].end = lrcData[i].start + 5;
      }
    }
  
    return lrcData;
  }
  
  /****************************************************************
   * 3. 渲染字幕 + 绑定点击事件
   ****************************************************************/
  function renderLyrics(lyricsData, container) {
    container.innerHTML = "";
  
    for (let i = 0; i < lyricsData.length; i++) {
      const lineDiv = document.createElement("div");
      lineDiv.classList.add("lyric-line");
      lineDiv.textContent = lyricsData[i].text;
  
      lineDiv.dataset.index = i;  // 存索引
  
      lineDiv.addEventListener("click", (e) => {
        const idx = parseInt(e.currentTarget.dataset.index, 10);
        handleLyricClick(idx);
      });
  
      container.appendChild(lineDiv);
    }
  }
  
  /****************************************************************
   * 4. 播放逻辑 + 高亮处理
   ****************************************************************/
  let currentIndex = 0;            // 当前播放的字幕索引
  let lyricsData = [];             // LRC 数据
  const audioPlayer = document.getElementById("audioPlayer");
  const continuousModeCheckbox = document.getElementById("continuousMode");
  
  function handleLyricClick(index) {
    if (index === currentIndex) {
      // 点击当前行 -> 暂停/继续
      if (!audioPlayer.paused) {
        audioPlayer.pause();
      } else {
        audioPlayer.play();
      }
    } else {
      // 切换到新行
      currentIndex = index;
      playSegment(currentIndex);
    }
  
    highlightLyricLine(index);
  }
  
  function playSegment(index) {
    if (index < 0 || index >= lyricsData.length) return;
  
    const startTime = lyricsData[index].start;
    const endTime = lyricsData[index].end;
  
    audioPlayer.pause();
    audioPlayer.currentTime = startTime;
    audioPlayer.play();
  
    audioPlayer.ontimeupdate = () => {
      if (audioPlayer.currentTime >= endTime) {
        audioPlayer.pause();
        audioPlayer.ontimeupdate = null; // 清除监听
  
        if (continuousModeCheckbox.checked) {
          // 连续播放
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
  
  function highlightLyricLine(index) {
    const lines = document.querySelectorAll(".lyric-line");
    lines.forEach(line => line.classList.remove("active"));
    if (lines[index]) {
      lines[index].classList.add("active");
    }
  }
  
  /****************************************************************
   * 5. 初始化：从 URL 拿到参数 -> 设置音频 & 加载 LRC
   ****************************************************************/
  (async function init() {
    // 读取 URL 参数
    const audioPath = getQueryParam("audio");
    const lrcPath = getQueryParam("lrc");
  
    // 如果缺少参数，可以给个提示或跳回列表页
    if (!audioPath || !lrcPath) {
      alert("没有指定音频或字幕文件。即将返回列表页。");
      window.location.href = "courses.html";
      return;
    }
  
    // 设置音频 src
    audioPlayer.src = audioPath;
  
    // 加载 LRC
    lyricsData = await fetchLyrics(lrcPath);
  
    // 渲染到页面
    const container = document.getElementById("lyricsContainer");
    renderLyrics(lyricsData, container);
  
    // 如果想进来就自动播放第一段，取消注释：
    // playSegment(0);
  })();
  